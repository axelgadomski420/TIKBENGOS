"""Klucze dostawców zewnętrznych — lista, rozwijana w ustawieniach.

Zasada z `ApiKey` obowiązuje tu bez wyjątku: wartość klucza opuszcza serwer
dokładnie raz, w odpowiedzi na utworzenie. Nie ma endpointu, który zwraca
zapisany klucz, i nie będzie — `reveal()` istnieje wyłącznie dla warstwy
wywołań wychodzących do dostawcy.

Adres dostawcy bierze się z katalogu (`providers.py`), nigdy z tego wejścia.
Formularz wysyła wyłącznie `providerId`, nazwę klucza i sam klucz.
"""

import hashlib
from datetime import datetime

from django.db import IntegrityError
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from .api import current_user
from .audit import record
from .crypto import encrypt_secret
from .models import ProviderCredential
from .providers import (
    PROVIDER_BASE_URLS,
    PROVIDERS_WITHOUT_URL,
    ProviderError,
    has_base_url,
    validate_credential,
)
from .schemas import (
    CreateProviderCredentialIn,
    ErrorOut,
    ProviderCredentialCreatedOut,
    ProviderCredentialOut,
    ProviderOut,
)

router = Router(tags=["settings"])

MAX_CREDENTIALS_PER_USER = 30


def _lookup_hash(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _serialize(credential: ProviderCredential) -> dict:
    return {
        "id": str(credential.id),
        "providerId": credential.provider_id,
        "name": credential.name,
        "prefix": credential.prefix,
        "lastFour": credential.last_four,
        "createdAt": credential.created_at,
        "lastUsedAt": credential.last_used_at,
        "revokedAt": credential.revoked_at,
    }


def _prefix_of(provider_id: str, key: str) -> str:
    """Fragment do pokazania po zapisie.

    Klienty dostawców mają różne kształty — OpenAI daje `sk-...`, GitHub
    `ghp_...`. Pokazujemy do 12 znaków, bo dłuższy fragment nie jest już
    rozpoznawalny, a jest mniejszym bezpieczeństwem.
    """
    return key[:12]


@router.get("/providers", response={200: list[ProviderOut], 401: ErrorOut})
def list_providers(request):
    """Katalog dostawców z informacją, czy klucz ma już dokąd trafić.

    Interfejs używa tego do rozwijanej listy. `hasBaseUrl: false` znaczy:
    klucz można zapisać, ale wywołania nie będzie — i ekran ma to powiedzieć
    przed zapisem, nie po.
    """
    ids = sorted(set(PROVIDER_BASE_URLS) | set(PROVIDERS_WITHOUT_URL))
    return 200, [
        {"id": pid, "kind": "unknown", "hasBaseUrl": has_base_url(pid)} for pid in ids
    ]


@router.get("/providers/credentials", response={200: list[ProviderCredentialOut], 401: ErrorOut})
def list_credentials(request):
    """Zapisane klucze użytkownika. Bez wartości — tylko prefiks i końcówka."""
    user = current_user(request)
    return 200, [
        _serialize(credential)
        for credential in ProviderCredential.objects.filter(user=user)
    ]


@router.post(
    "/providers/credentials",
    response={201: ProviderCredentialCreatedOut, 400: ErrorOut, 401: ErrorOut, 409: ErrorOut},
)
def create_credential(request, payload: CreateProviderCredentialIn):
    user = current_user(request)

    try:
        validate_credential(payload.providerId, payload.key)
    except ProviderError as exc:
        raise HttpError(400, {"code": exc.code, "message": exc.message, "field": "key"})

    name = payload.name.strip()[:64]
    if not name:
        raise HttpError(
            400,
            {"code": "bad_request", "message": "Nadaj nazwę kluczowi.", "field": "name"},
        )

    if (
        ProviderCredential.objects.filter(user=user, revoked_at__isnull=True).count()
        >= MAX_CREDENTIALS_PER_USER
    ):
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": f"Limit aktywnych kluczy to {MAX_CREDENTIALS_PER_USER}.",
            },
        )

    raw = payload.key.strip()

    try:
        credential = ProviderCredential.objects.create(
            user=user,
            provider_id=payload.providerId.strip(),
            name=name,
            lookup_hash=_lookup_hash(f"{payload.providerId}:{raw}"),
            secret_encrypted=encrypt_secret(raw),
            prefix=_prefix_of(payload.providerId, raw),
            last_four=raw[-4:],
        )
    except IntegrityError:
        raise HttpError(
            409,
            {
                "code": "conflict",
                "message": "Masz już klucz o tej nazwie dla tego dostawcy. Zmień nazwę.",
                "field": "name",
            },
        )

    record(
        user,
        "provider_credential.create",
        resource=str(credential.id),
        metadata={"providerId": credential.provider_id, "name": credential.name},
    )

    payload_out = _serialize(credential)
    # Jedyne miejsce w całym serwisie, w którym wartość klucz dostawcy trafia
    # do odpowiedzi. `list_credentials` jej nie zawiera i nie może zawierać.
    payload_out["secret"] = raw
    return 201, payload_out


@router.delete(
    "/providers/credentials/{credential_id}",
    response={204: None, 401: ErrorOut, 404: ErrorOut},
)
def revoke_credential(request, credential_id: str):
    user = current_user(request)
    credential = ProviderCredential.objects.filter(
        id=credential_id, user=user, revoked_at__isnull=True
    ).first()
    if credential is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego klucza."})

    credential.revoked_at = datetime_now()
    credential.save(update_fields=["revoked_at"])
    record(
        user,
        "provider_credential.revoke",
        resource=str(credential.id),
        metadata={"providerId": credential.provider_id},
    )
    return 204, None


def datetime_now():
    return timezone.now()
