"""Adresy API.

Jeden router django-ninja na prefiks `/v1`, tak jak opisuje to `packages/core`.
Proxy w `apps/web` dokłada `/v1/` do ścieżek, więc nazwy tutaj są już bez tego
prefiksu.
"""

from django.urls import path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from ninja import NinjaAPI

from accounts.api import router as accounts_router
from accounts.keys_api import router as keys_router

api = NinjaAPI(
    title="TIKBENGOS API",
    version="1.0.0",
    urls_namespace="v1",
    # Własny handler zamiast domyślnego: kontrakt `ApiError` w `packages/core`
    # ma stały kształt i interfejs nie może zgadywać, co dostał.
    docs_url="/docs" if True else None,
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
def csrf_token(request):
    """Endpoint do pobrania tokenu CSRF.

    Zwraca token i ustawia ciasteczko csrftoken. Zarejestrowany poza routerem,
    bo proxy w apps/web przepuszcza tylko ścieżki z ALLOWED_PREFIXES, a /csrf
    nie jest pod żadnym z nich.
    """
    return JsonResponse({"csrfToken": request.META.get("CSRF_COOKIE", "")})


api.add_router("/auth", accounts_router)
api.add_router("/users", accounts_router)
api.add_router("/settings", keys_router)

urlpatterns = [
    path("v1/csrf", csrf_token, name="csrf_token"),
    path("v1/", api.urls),
]
