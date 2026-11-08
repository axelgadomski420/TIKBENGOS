"""Endpointy tożsamości i sesji.

Kształt odpowiedzi pochodzi z `packages/core/src/identity.ts`, a nie
z wygody implementacji. Błąd ma zawsze postać `ApiError` — interfejs
nie zgaduje, co dostał.
"""

import re
from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from .audit import record
from .models import User
from .permissions import permissions_for
from .schemas import (
    ErrorOut,
    IdentityOut,
    LoginIn,
    RegisterIn,
    SessionOut,
    UpdateConsentsIn,
    UpdateIdentityIn,
)

router = Router(tags=["auth"])

# Ta sama reguła, której pilnuje interfejs w `validateUsername`, i ten sam
# format, co `USERNAME_PATTERN` w kontrakcie.
USERNAME_PATTERN = re.compile(r"^[a-z0-9_]{3,30}$")
MIN_PASSWORD_LENGTH = 12


def _error(code: str, message: str, status: int, field: str | None = None):
    payload = {"code": code, "message": message}
    if field:
        payload["field"] = field
    raise HttpError(status, payload)


# EPOCH liczymy RAZ, na poziomie modułu, i z `datetime.timezone.utc`.
#
# Wcześniej stało tu `timezone.datetime.fromtimestamp(0, tz=timezone.utc)`,
# gdzie `timezone` to `django.utils.timezone`. Django NIE eksportuje tam
# `datetime` — są `now`, `is_aware`, `utc`, ale nie ten atrybut. Błąd nie
# wychodził przy imporcie (Python nie sprawdza atrybutów na zapas), tylko
# w chwili wykonania: `AttributeError: module 'django.utils.timezone' has
# no attribute 'datetime'`.
#
# Skutek był widoczny dopiero na produkcji i tylko na jednej ścieżce.
# `_consents()` woła tę gałąź wyłącznie wtedy, gdy `consents_updated_at`
# jest puste — a puste jest dokładnie u ŚWIEŻO UTWORZONEGO konta. Konto,
# które raz zapisało zgody, ma datę ustawioną i ten kod nigdy się nie
# wykonuje. Dlatego `POST /api/auth/register` wracał `500`, gdy `GET /api/csrf`
# dawał `200` — i dlatego nic tego nie wykryło wcześniej.
EPOCH = datetime(1970, 1, 1, tzinfo=dt_timezone.utc)


def _consents(user: User) -> dict:
    return {
        "camera": user.consent_camera,
        "microphone": user.consent_microphone,
        "github": user.consent_github,
        "pushNotifications": user.consent_push_notifications,
        "updatedAt": user.consents_updated_at or EPOCH,
    }


def serialize(user: User) -> dict:
    """Użytkownik → kontrakt `Identity`. Nigdy nie zawiera hasła ani skrótu."""
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "displayName": user.display_name or None,
        "avatarUrl": user.avatar_url or None,
        "bio": user.bio or None,
        "website": user.website or None,
        "roles": user.effective_roles(),
        "consents": _consents(user),
        "perception": user.perception,
        "createdAt": user.date_joined,
    }


def _check_password_strength(password: str, user: User | None = None) -> None:
    """Walidatory Django na haśle. Rzuca `HttpError` z powodem, albo nie robi nic.

    ── DLACZEGO TO JEST TU, A NIE TYLKO W USTAWIENIACH ─────────────────────
    `AUTH_PASSWORD_VALIDATORS` w `settings.py` ma trzy wpisy:
    `MinimumLengthValidator` (12), `CommonPasswordValidator` i
    `NumericPasswordValidator`. Tylko że Django **nie woła ich samo** przy
    `create_user()` — walidacja haseł działa w formularzach i przy
    `set_password()`, a nie przy tworzeniu konta przez API.

    Poprzednia wersja `register()` sprawdzała wyłącznie długość, więc hasło
    `aaaaaaaaaaaa` albo `123456789012` przechodziło. To nie jest luka
    w uprawnieniach, ale jest luką w koncie: ktoś zakłada konto na hasło,
    które zgadnie w pięć minut, i traci je bez śladu włamania.

    `validate_password` bierze `user` tylko po to, żeby porównać hasło
    z nazwą i adresem email — bez tego `SimilarityValidator` nie ma z czym
    porównywać. Dlatego budujemy tymczasowy obiekt z nazwą i mailem,
    zapisany jeszcze nie jest.
    """
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        # Bierzemy PIERWSZY komunikat, nie wszystkie: interfejs pokazuje
        # błąd pod polem, a lista pięciu zdań pod jednym polem to ściana,
        # której nikt nie przeczyta. Kolejny powód wyjdzie przy następnej
        # próbie — i tak jest lepiej niż pokazywać wszystko naraz.
        first = exc.messages[0] if exc.messages else "Hasło jest zbyt słabe."
        _error("bad_request", first, 400, "password")


@router.post("/register", response={201: SessionOut, 400: ErrorOut, 409: ErrorOut})
def register(request, payload: RegisterIn):
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()

    if not USERNAME_PATTERN.match(username):
        _error(
            "bad_request",
            "Nazwa może mieć od 3 do 30 znaków: małe litery, cyfry i podkreślenie.",
            400,
            "username",
        )
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        _error("bad_request", "Podaj poprawny adres email.", 400, "email")
    if len(payload.password) < MIN_PASSWORD_LENGTH:
        _error("bad_request", "Hasło musi mieć co najmniej 12 znaków.", 400, "password")

    # Walidatory z ustawień — patrz `_check_password_strength`.
    # Obiekt tymczasowy (nie zapisany) jest potrzebny, żeby walidator
    # podobieństwa miał z czym porównać hasło.
    _check_password_strength(payload.password, User(username=username, email=email))

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=payload.password,
                roles=["user"],
            )
    except IntegrityError:
        _error("conflict", "Ta nazwa użytkownika albo adres email jest już zajęty.", 409)

    record(user, "identity.register", resource=str(user.id))

    request.session["identity_id"] = str(user.id)
    request.session.cycle_key()  # nowe id sesji po rejestracji — bez fiksacji

    expires = timezone.now() + timedelta(seconds=settings.SESSION_COOKIE_AGE)
    return 201, {
        "identity": serialize(user),
        # Wartość tokenu jest identyfikatorem sesji. W przeglądarce i tak
        # jedzie ciasteczkiem HttpOnly — patrz `proxy` w `apps/web`.
        "accessToken": request.session.session_key or "",
        "expiresAt": expires,
    }


@router.post("/login", response={200: SessionOut, 400: ErrorOut, 401: ErrorOut})
def login(request, payload: LoginIn):
    identifier = payload.identifier.strip().lower()

    # Logowanie po nazwie albo adresie: jedno pole, bo użytkownik nie ma
    # powodu pamiętać, którym się rejestrował.
    user_obj = User.objects.filter(username=identifier).first() or User.objects.filter(
        email=identifier
    ).first()
    if user_obj is None:
        # Ten sam komunikat co przy złym haśle. Rozdzielenie ich mówiłoby
        # wprost, które nazwy istnieją — to jest wyliczanie kont.
        _error("unauthorized", "Nieprawidłowa nazwa lub hasło.", 401)

    user = authenticate(request, username=user_obj.username, password=payload.password)
    if user is None or not user.is_active:
        _error("unauthorized", "Nieprawidłowa nazwa lub hasło.", 401)

    request.session["identity_id"] = str(user.id)
    request.session.cycle_key()

    record(user, "identity.login", resource=str(user.id))

    expires = timezone.now() + timedelta(seconds=settings.SESSION_COOKIE_AGE)
    return 200, {
        "identity": serialize(user),
        "accessToken": request.session.session_key or "",
        "expiresAt": expires,
    }


@router.post("/logout", response={204: None})
def logout(request):
    user_id = request.session.get("identity_id")
    if user_id:
        user = User.objects.filter(id=user_id).first()
        if user:
            record(user, "identity.logout", resource=str(user.id))
    request.session.flush()
    return 204, None


def current_user(request) -> User:
    """Użytkownik bieżącej sesji albo 401.

    Nie używamy tu `request.user`, bo ta aplikacja nie montuje w pełni
    `django.contrib.auth` — sesja jest nasza i tak zostaje.
    """
    identity_id = request.session.get("identity_id")
    if not identity_id:
        _error("unauthorized", "Sesja wygasła. Zaloguj się ponownie.", 401)
    user = User.objects.filter(id=identity_id, is_active=True).first()
    if user is None:
        request.session.flush()
        _error("unauthorized", "Sesja wygasła. Zaloguj się ponownie.", 401)
    return user


@router.get("/me", response={200: IdentityOut, 401: ErrorOut})
def me(request):
    return 200, serialize(current_user(request))


@router.patch("/me", response={200: IdentityOut, 401: ErrorOut})
def update_me(request, payload: UpdateIdentityIn):
    user = current_user(request)
    if payload.displayName is not None:
        user.display_name = payload.displayName.strip()[:80]
    if payload.bio is not None:
        user.bio = payload.bio.strip()[:500]
    if payload.website is not None:
        user.website = payload.website.strip()[:200]
    user.save(update_fields=["display_name", "bio", "website"])
    record(user, "identity.update", resource=str(user.id))
    return 200, serialize(user)


@router.patch("/me/consents", response={200: IdentityOut, 401: ErrorOut})
def update_consents(request, payload: UpdateConsentsIn):
    user = current_user(request)
    fields = []
    if payload.camera is not None:
        user.consent_camera = payload.camera
        fields.append("consent_camera")
    if payload.microphone is not None:
        user.consent_microphone = payload.microphone
        fields.append("consent_microphone")
    if payload.github is not None:
        user.consent_github = payload.github
        fields.append("consent_github")
    if payload.pushNotifications is not None:
        user.consent_push_notifications = payload.pushNotifications
        fields.append("consent_push_notifications")
    user.consents_updated_at = timezone.now()
    fields.append("consents_updated_at")
    user.save(update_fields=fields)

    changed = [f for f in fields if f != "consents_updated_at"]
    record(user, "identity.consents.update", resource=str(user.id), metadata={"fields": changed})
    return 200, serialize(user)


@router.get("/me/permissions", response={200: dict, 401: ErrorOut})
def my_permissions(request):
    """Uprawnienia wyliczone z ról.

    Interfejs używa tego, żeby nie pokazywać wejść, do których użytkownik
    nie ma prawa — `can()` po stronie klienta i serwera musi dawać ten sam
    wynik, inaczej jeden z nich kłamie.
    """
    user = current_user(request)
    roles = user.effective_roles()
    return 200, {"roles": roles, "permissions": permissions_for(roles)}
