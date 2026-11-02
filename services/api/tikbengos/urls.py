"""Adresy API.

Jeden router django-ninja na prefiks `/v1`, tak jak opisuje to `packages/core`.
Proxy w `apps/web` dokłada `/v1/` do ścieżki, więc nazwy tutaj są już bez tego
prefiksu.
"""

from django.urls import path
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


api.add_router("/auth", accounts_router)
api.add_router("/users", accounts_router)
api.add_router("/settings", keys_router)

urlpatterns = [path("v1/", api.urls)]
