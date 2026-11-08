successfully downloaded text file (SHA: dcad39abd900a44bce003fc259b2b3c4944d103b)"""
Adresy API.

Jeden router django-ninja na prefiks `/v1`, tak jak opisuje to `packages/core`.
Proxy w `apps/web` dokłada `/v1/` do ścieżki, więc nazwy tutaj są już bez tego
prefiksu.

Ten sam router tożsamości obsługuje dwie ścieżki: `/auth` i `/users`. Endpointy
mają sens pod obiema, bo rejestracja i logowanie siedzą w domenie uwierzytelniania,
a profil i zgody w domenie użytkownika.

django-ninja NIE POZWALA zamontować tego samego routera dwa razy bez podania
`url_name_prefix` — zgłasza `ConfigError: Router is already mounted to this API`
i Django nie potrafi wczytać adresów. To nie jest ostrzeżenie: bez tego pada
każde polecenie `manage.py`, łącznie z `migrate`, a serwer nie wstaje.
Prefiksy nazw są więc wymagane, nie opcjonalne.

Router czatu jest OSOBNY i podpięty pod `/chat` — prefiks jest na liście
dozwolonych w proxy interfejsu (`apps/web/src/app/api/[...path]/route.ts`),
więc bez zmian w proxy ścieżka `/api/chat/...` działa od razu.

Router Dev jest pod `/git` — dokładnie ten prefiks stoi w kontrakcie
(`API.git` w `packages/core/src/api.ts`) i na liście dozwolonych prefiksów
proxy, więc ani proxy, ani interfejs nie wymagają zmian.

Router muzyki jest pod `/music` — prefiks z kontraktu API.music, obecny
na liście dozwolonych prefiksów proxy od pierwszego commita, więc ścieżka
`/api/music/...` działa bez zmian w proxy.

Router asystenta jest pod `/ai` — prefiks z kontraktu API.ai, też obecny
na liście dozwolonych prefiksów proxy, więc `/api/ai/...` działa bez
zmian w proxy tak jak `/api/music/...` i `/api/git/...`.
"""

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.urls import path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from ninja import NinjaAPI

from ai.api import router as ai_router
from accounts.api import router as accounts_router
from accounts.keys_api import router as keys_router
from accounts.oauth import router as oauth_router
from accounts.providers_api import router as providers_router
from chat.api import router as chat_router
from dev.api import router as dev_router
from feed.api import router as feed_router
from music.api import router as music_router

api = NinjaAPI(
    title="TIKBENGOS API",
    version="1.0.0",
    urls_namespace="v1",
)


@api.exception_handler(Exception)
def handle_unexpected(request, exc):  # pragma: no cover - ścieżka awaryjna
    return api.create_response(
        request,
        {"code": "internal", "message": "Coś poszło nie tak po stronie serwera."},
        status=500,
    )


@require_GET
@ensure_csrf_cookie
def csrf_view(request):
    """Wydaje token CSRF i ustawia ciasteczko `csrftoken`.

    Zwracamy `get_token(request)`, a nie odczyt z `request.META`. Różnica nie
    jest kosmetyczna: `CSRF_COOKIE` pojawia się w `META` dopiero wtedy, gdy
    token już istnieje, więc odczyt dawał pusty łańcuch właśnie w tym jednym
    przypadku, dla którego ten endpoint istnieje — przy pierwszym wejściu
    na stronę. `get_token` wytwarza token, zapisuje go i zwraca.

    Ścieżka to `/v1/csrf`, bo proxy w `apps/web` mapuje `/api/csrf` na
    `/v1/csrf`.
    """
    return JsonResponse({"csrfToken": get_token(request)})


@require_GET
def health_view(request):
    """Punkt sprawdzenia, że API żyje i ma wszystko, czego potrzebuje.

    Istnieje dla pierwszego uruchomienia: bez niego jedynym sposobem na
    stwierdzenie, czy API wystartowało, było wywołanie endpointu wymagającego
    sesji albo czytanie logów. Ten endpoint nic nie ujawnia — nie podaje
    wersji bibliotek ani konfiguracji, tylko to, że odpowiedź dochodzi.

    Nie sprawdza bazy ani Redisa. Gdyby sprawdzał, kolejność startu
    w compose musiała być jeszcze bardziej skomplikowana, a i tak
    najczęstsza awaria to zły `DATABASE_URL`, który wyjdzie przy `migrate`.
    """
    return JsonResponse({"status": "ok"})


@require_GET
def config_view(request):
    """Kontrakt widoczny z zewnątrz — bez niczego wrażliwego.

    `realtimePath` i `csrfPath` są tu po to, żeby interfejs i skrypty nie
    musiały znać tych ścieżek na sztywno. Rozjazd między klientem a serwera
    w tych dwóch miejscach był już raz błędem w tym projekcie.

    `oauthPaths` dołączyły z tego samego powodu: adresy callbacku są
    wypisane tutaj, więc panel dostawcy i kod mają jedno źródło prawdy
    zamiast dwóch, które się rozjadą.
    """
    return JsonResponse(
        {
            "realtimePath": "/ws",
            "csrfPath": "/v1/csrf",
            "healthPath": "/v1/health",
            "apiPrefix": "/v1",
            "oauthPaths": {
                "google": "/api/auth/oauth/google/callback",
                "github": "/api/auth/oauth/github/callback",
            },
        }
    )


# Ten sam router pod dwoma prefiksami wymaga RÓŻNYCH `url_name_prefix`.
# Bez nich django-ninja zgłasza ConfigError i Django nie wczytuje adresów —
# co zatrzymuje `migrate` i start serwera, nie tylko routowanie.
api.add_router("/auth", accounts_router, url_name_prefix="auth")
api.add_router("/users", accounts_router, url_name_prefix="users")
# Router OAuth jest OSOBNY i podpięty tylko pod `/auth`. Powód: django-ninja
# nie pozwala zamontować tego samego routera dwa razy bez `url_name_prefix`,
# a ścieżki `/oauth/{provider}/...` mają sens wyłącznie w domenie
# uwierzytelniania — nie ma czego szukać pod `/users`.
api.add_router("/auth", oauth_router, url_name_prefix="oauth")
api.add_router("/settings", keys_router)
api.add_router("/settings", providers_router)
api.add_router("/feed", feed_router)
api.add_router("/chat", chat_router)
# Dev pod `/git` — prefiks z kontraktu API.git. Router jest osobny jak
# czat: domena GitHub ma własne tagi i własne testy.
api.add_router("/git", dev_router)
# Muzyka pod `/music` — prefiks z kontraktu API.music: biblioteka utworów,
# zadania generacji, limity dzienne. Osobny router i osobne testy; dostęp
# z sesją jak wszędzie, bo utwory są prywatne.
api.add_router("/music", music_router)
# Asystent pod /ai — prefiks z kontraktu API.ai. Pytanie tworzy zadanie
# (asynchroniczne jak generacja muzyki), odpowiedź oddaje worker LLM
# przez endpoint zwrotny z sekretem BENGOS_WORKER_TOKEN.
api.add_router("/ai", ai_router)

urlpatterns = [
    path("v1/csrf", csrf_view, name="csrf_view"),
    path("v1/health", health_view, name="health_view"),
    path("v1/config", config_view, name="config_view"),
    path("v1/", api.urls),
]
