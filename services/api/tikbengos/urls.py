"""
Adresy API.

Jeden router django-ninja na prefiks `/v1`, tak jak opisuje to `packages/core`.
Proxy w `apps/web` dokłada `/v1/` do ścieżki, więc nazwy tutaj są już bez tego
prefiksu.
"""

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.urls import path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from ninja import NinjaAPI

from accounts.api import router as accounts_router
from accounts.keys_api import router as keys_router
from accounts.providers_api import router as providers_router
from feed.api import router as feed_router

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
    w compose musiałaby być jeszcze bardziej skomplikowana, a i tak
    najczęstsza awaria to zły `DATABASE_URL`, który wyjdzie przy `migrate`.
    """
    return JsonResponse({"status": "ok"})


@require_GET
def config_view(request):
    """Kontrakt widoczny z zewnątrz — bez niczego wrażliwego.

    `realtimePath` i `csrfPath` są tu po to, żeby interfejs i skrypty nie
    musiały znać tych ścieżek na sztywno. Rozjazd między klientem a serwerem
    w tych dwóch miejscach był już raz błędem w tym projekcie.
    """
    return JsonResponse(
        {
            "realtimePath": "/ws",
            "csrfPath": "/v1/csrf",
            "healthPath": "/v1/health",
            "apiPrefix": "/v1",
        }
    )


api.add_router("/auth", accounts_router)
api.add_router("/users", accounts_router)
api.add_router("/settings", keys_router)
api.add_router("/settings", providers_router)
api.add_router("/feed", feed_router)

urlpatterns = [
    path("v1/csrf", csrf_view, name="csrf_view"),
    path("v1/health", health_view, name="health_view"),
    path("v1/config", config_view, name="config_view"),
    path("v1/", api.urls),
]
