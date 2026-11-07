"""Logowanie przez dostawcę zewnętrznego — Google i GitHub.

── CZYM TO NIE JEST ───────────────────────────────────────────────────
To nie jest `django-allauth` ani żadna gotowa paczka OAuth. Repozytorium ma
jedną tożsamość i jeden model uprawnień, a paczka OAuth przyniosłaby własny
model użytkownika, własne widoki i własne przekierowania — czyli drugi system
tożsamości obok istniejącego. Brief mówi wprost: jedno konto, jedna tożsamość.

Ręczna implementacja jest tu więc wyborem, nie ambicją. Jest krótka, bo
korzysta z tego, co już stoi: `LinkedAccount` w bazie, sesja Django
w ciasteczku, `record()` w dzienniku audytu.

── TRZY RZECZY, KTÓRE MUSZĄ BYĆ ZROBIONE DOBRZE ────────────────────────

1. `state` JEST WYTYCZNY Z SESJI, NIE Z ADRESU. Do sesji trafia losowy
   łańcuch przy starcie logowania, a callback porównuje go z tym, co przyszło.
   Bez tego dowolna strona mogłaby podmienić kod i wejść na cudze konto —
   to jest cały sens parametru `state`.

2. ADRESY SĄ Z KATALOGU, NIE Z FORMULARZA. Każdy dostawca ma tu zdefiniowane
   własne adresy autoryzacji i wymiany kodu. To ta sama zasada, którą
   `providers.py` stosuje do kluczy użytkownika: adres pochodzi z kodu, żeby
   nie dało się kazać serwerowi wysłać żądania pod adres wewnętrzny (SSRF).

3. HASŁO PRZY REJESTRACJI PRZEZ DOSTAWCĘ JEST NIEUŻYWALNE. Konto zakłada
   się przez `set_unusable_password()` — nikt nie zgadnie hasła, bo żadne
   nie istnieje.

── CZEGO TEN PLIK NIE ROBI BEZ KLUCZY ──────────────────────────────────
Bez identyfikatora klienta i sekretu endpointy zwracają `503` z wyjaśnieniem,
a lista dostawców mówi `configured: false`. Nie ma tu adresów ani
identyfikatorów wpisanych na sztywno — repozytorium nie może zawierać
sekretów ani udawać, że je ma.
"""

import json
import secrets
import urllib.parse
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from .api import serialize
from .audit import record
from .models import LinkedAccount, User
from .schemas import ErrorOut, OAuthProviderOut, OAuthStartOut, SessionOut

router = Router(tags=["auth"])

# Klucz w sesji, pod którym trzymamy `state`. 32 bajty z `secrets` to więcej
# niż trzeba — `state` nie musi żyć długo, musi być nieprzewidywalny.
STATE_SESSION_KEY = "oauth_state"
STATE_PROVIDER_KEY = "oauth_provider"

PROVIDER_LABELS = {
    "google": "Google",
    "github": "GitHub",
}


def _oauth_config(provider: str) -> dict | None:
    """Konfiguracja dostawcy albo `None`, gdy brakuje kluczy.

    Adresy są stałe i należą do dostawcy — trzymamy je w kodzie, żeby nie
    mogły przyjść z zewnątrz. To ta sama zasada co w `providers.py`.
    """
    base = settings.OAUTH_REDIRECT_BASE.rstrip("/") if settings.OAUTH_REDIRECT_BASE else ""
    if provider == "google":
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
        if not (client_id and client_secret and base):
            return None
        return {
            "client_id": client_id,
            "client_secret": client_secret,
            "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
            "scope": "openid email profile",
            "redirect_uri": f"{base}/api/auth/oauth/google/callback",
        }
    if provider == "github":
        client_id = settings.GITHUB_OAUTH_CLIENT_ID
        client_secret = settings.GITHUB_OAUTH_CLIENT_SECRET
        if not (client_id and client_secret and base):
            return None
        return {
            "client_id": client_id,
            "client_secret": client_secret,
            "authorize_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "userinfo_url": "https://api.github.com/user",
            "scope": "read:user user:email",
            "redirect_uri": f"{base}/api/auth/oauth/github/callback",
        }
    return None


def _post_form(url: str, data: dict) -> dict:
    """Żądanie `POST` z ciałem formularza. Zwraca sparsowany JSON.

    `urllib` z biblioteki standardowej, a nie `requests`: to jedno żądanie
    w jednym miejscu, a `requests` dołożyłby zależność do całego obrazu
    produkcyjnego. Adres jest stały (z katalogu wyżej), więc nie ma tu
    wektora SSRF. Czas oczekiwania jest krótki — dostawca, który milczy,
    nie może trzymać wątku gunicorna.
    """
    body = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")
    request.add_header("Accept", "application/json")
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def _get_json(url: str, token: str) -> dict:
    request = urllib.request.Request(url, method="GET")
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Accept", "application/json")
    request.add_header("User-Agent", "BENGOS")
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def _unique_username(base: str) -> str:
    """Wolny uchwyt na podstawie sugestii dostawcy.

    Uchwyt musi przejść ten sam wzorzec co przy rejestracji: 3 do 30 znaków,
    małe litery, cyfry i podkreślenie. Adres email nie nadaje się na uchwyt,
    bo zawiera kropki i znak `@` — dlatego czyścimy i skracamy.
    """
    cleaned = "".join(ch for ch in base.lower() if ch.isalnum() or ch == "_")
    cleaned = cleaned[:24] or "bengos"
    if len(cleaned) < 3:
        cleaned = f"{cleaned}_u"
    candidate = cleaned
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{cleaned[:26]}_{suffix}"
    return candidate


@router.get("/oauth/providers", response={200: list[OAuthProviderOut]})
def oauth_providers(request):
    """Dostawcy dostępni na tym serwerze.

    Interfejs rysuje przyciski z tej listy, a nie z własnej stałej — inaczej
    pokazywałby przycisk dla dostawcy, którego serwer nie obsługuje, i odsyłał
    użytkownika z błędem po kliknięciu.
    """
    return 200, [
        {
            "id": provider,
            "label": PROVIDER_LABELS[provider],
            "configured": _oauth_config(provider) is not None,
        }
        for provider in PROVIDER_LABELS
    ]


@router.post("/oauth/{provider}/start", response={200: OAuthStartOut, 404: ErrorOut, 503: ErrorOut})
def oauth_start(request, provider: str):
    """Początek logowania. Zwraca adres, pod który ma przejść przeglądarka."""
    config = _oauth_config(provider)
    if config is None:
        if provider not in PROVIDER_LABELS:
            raise HttpError(
                404, {"code": "not_found", "message": "Nie znamy takiego dostawcy logowania."}
            )
        raise HttpError(
            503,
            {
                "code": "unavailable",
                "message": (
                    f"Logowanie przez {PROVIDER_LABELS[provider]} nie jest skonfigurowane "
                    "na tym serwerze. Brakuje identyfikatora klienta albo sekretu."
                ),
            },
        )

    state = secrets.token_urlsafe(32)
    request.session[STATE_SESSION_KEY] = state
    request.session[STATE_PROVIDER_KEY] = provider

    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
    }
    if provider == "google":
        # `prompt=select_account` — bez tego Google wchodzi od razu na konto,
        # którym użytkownik ostatnio się logował, i nie da się wybrać innego.
        params["prompt"] = "select_account"

    return 200, {"authorizeUrl": f"{config['authorize_url']}?{urllib.parse.urlencode(params)}"}


@router.post(
    "/oauth/{provider}/callback",
    response={200: SessionOut, 400: ErrorOut, 401: ErrorOut, 503: ErrorOut},
)
def oauth_callback(request, provider: str, code: str, state: str):
    """Wymiana kodu na tożsamość i założenie sesji.

    `state` jest porównywany z tym w sesji. Niezgodność to `400`, nie `401`:
    to jest żądanie sfałszowane albo wygasłe, a nie złe poświadczenie.
    """
    config = _oauth_config(provider)
    if config is None:
        raise HttpError(
            503,
            {
                "code": "unavailable",
                "message": "Logowanie przez tego dostawcę nie jest skonfigurowane na tym serwerze.",
            },
        )

    expected = request.session.get(STATE_SESSION_KEY)
    expected_provider = request.session.get(STATE_PROVIDER_KEY)
    # Porównanie przez `secrets.compare_digest`: zwykłe `==` kończy się na
    # pierwszym różnym znaku i mierzy czas, co przy zgadywaniu `state`
    # daje informację zwrotną.
    if (
        not expected
        or not state
        or not secrets.compare_digest(str(expected), str(state))
        or expected_provider != provider
    ):
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Sesja logowania wygasła albo została przerwana. Spróbuj ponownie.",
            },
        )

    # `state` jest jednorazowy: po użyciu znika z sesji, więc powtórzenie
    # tego samego callbacku nie przejdzie drugi raz.
    request.session.pop(STATE_SESSION_KEY, None)
    request.session.pop(STATE_PROVIDER_KEY, None)

    try:
        token_payload = _post_form(
            config["token_url"],
            {
                "code": code,
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "redirect_uri": config["redirect_uri"],
                "grant_type": "authorization_code",
            },
        )
    except Exception:
        raise HttpError(
            401,
            {"code": "unauthorized", "message": "Dostawca odrzucił kod logowania. Spróbuj ponownie."},
        )

    access_token = token_payload.get("access_token")
    if not access_token:
        raise HttpError(
            401, {"code": "unauthorized", "message": "Dostawca nie zwrócił tokenu dostępu."}
        )

    try:
        profile = _get_json(config["userinfo_url"], access_token)
    except Exception:
        raise HttpError(
            401,
            {"code": "unauthorized", "message": "Nie udało się odczytać profilu u dostawcy."},
        )

    if provider == "google":
        subject = str(profile.get("sub") or "")
        email = (profile.get("email") or "").strip().lower()
        display_name = (profile.get("name") or "").strip()
        avatar = (profile.get("picture") or "").strip()
        email_verified = bool(profile.get("email_verified"))
    else:
        subject = str(profile.get("id") or "")
        email = (profile.get("email") or "").strip().lower()
        display_name = (profile.get("name") or profile.get("login") or "").strip()
        avatar = (profile.get("avatar_url") or "").strip()
        # GitHub nie zawsze oddaje adres w profilu — wtedy trzeba o niego
        # poprosić osobno. Adres niezweryfikowany traktujemy jak brak adresu.
        if not email:
            try:
                emails = _get_json("https://api.github.com/user/emails", access_token)
                primary = next(
                    (e for e in emails if e.get("primary") and e.get("verified")),
                    None,
                )
                if primary:
                    email = (primary.get("email") or "").strip().lower()
            except Exception:
                pass
        email_verified = bool(email)

    if not subject:
        raise HttpError(
            401, {"code": "unauthorized", "message": "Dostawca nie zwrócił identyfikatora konta."}
        )
    if not email or not email_verified:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": (
                    "Dostawca nie przekazał zweryfikowanego adresu email. "
                    "Bez niego nie założymy konta — jest potrzebny do odzyskania dostępu."
                ),
            },
        )

    with transaction.atomic():
        linked = (
            LinkedAccount.objects.select_related("user")
            .filter(provider=provider, subject=subject)
            .first()
        )

        if linked is not None:
            user = linked.user
        else:
            # Ten sam adres email może już mieć konto z hasłem. Podpinamy
            # dostawcę do istniejącego konta ZAMIAST zakładać drugie:
            # jedno konto to jedna tożsamość, a drugie konto na ten sam
            # adres jest dokładnie tym, czego brief zabrania.
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create(
                    username=_unique_username(email.split("@")[0] or display_name),
                    email=email,
                    display_name=display_name[:80],
                    avatar_url=avatar[:200],
                    roles=["user"],
                )
                # Konto bez hasła: nie da się go dopasować żadnym hasłem.
                user.set_unusable_password()
                user.save(update_fields=["password"])
                record(user, "identity.register", resource=str(user.id), metadata={"via": provider})

            try:
                LinkedAccount.objects.create(
                    user=user,
                    provider=provider,
                    subject=subject,
                    email=email,
                    display_name=display_name[:150],
                )
            except IntegrityError:
                # Równoległe żądanie zdążyło podpiąć to konto pierwsze.
                # Nie jest to błąd — druga próba jest niepotrzebna.
                pass

        LinkedAccount.objects.filter(provider=provider, subject=subject).update(
            last_login_at=timezone.now()
        )

    request.session["identity_id"] = str(user.id)
    # Nowe id sesji po logowaniu — bez tego ciasteczko sprzed logowania
    # zostałoby ważne, a to jest fiksacja sesji.
    request.session.cycle_key()

    record(user, "identity.login", resource=str(user.id), metadata={"via": provider})

    expires = timezone.now() + timedelta(seconds=settings.SESSION_COOKIE_AGE)
    return 200, {
        "identity": serialize(user),
        "accessToken": request.session.session_key or "",
        "expiresAt": expires,
    }
