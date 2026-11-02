"""Klucze API — zasada jednorazowego pokazania.

Cała trudność tego modułu polega na tym, czego tu NIE MA: nie ma endpointu,
który zwraca wartość istniejącego klucza. `reveal()` istnieje wyłącznie dla
warstwy wywołań do usług zewnętrznych. Ten plik go nie używa ani razu poza
utworzeniem klucza.
"""

import hashlib
import secrets
from datetime import datetime

from django.db import IntegrityError
from ninja import Router
from ninja.errors import HttpError

from .api import current_user
from .audit import record
from .crypto import encrypt_secret
from .models import ApiKey
from .schemas import ApiKeyCreatedOut, ApiKeyOut, CreateApiKeyIn, ErrorOut

router = Router(tags=["settings"])

KEY_BYTES = 32
KEY_PREFIX = "bk_"
MAX_KEYS_PER_USER = 20


def _lookup_hash(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _serialize(key: ApiKey) -> dict:
    return {
        "id": str(key.id),
        "name": key.name,
        "prefix": key.prefix,
        "lastFour": key.last_four,
        "createdAt": key.created_at,
        "lastUsedAt": key.last_used_at,
        "revokedAt": key.revoked_at,
    }


@router.get("/keys", response={200: list[ApiKeyOut], 401: ErrorOut})
def list_keys(request):
    user = current_user(request)
    return 200, [_serialize(key) for key in ApiKey.objects.filter(user=user)]


@router.post("/keys", response={201: ApiKeyCreatedOut, 400: ErrorOut, 401: ErrorOut})
def create_key(request, payload: CreateApiKeyIn):
    user = current_user(request)
    name = payload.name.strip()
    if not name:
        raise HttpError(400, {"code": "bad_request", "message": "Nazwa klucza jest wymagana.", "field": "name"})
    if ApiKey.objects.filter(user=user, revoked_at__isnull=True).count() >= MAX_KEYS_PER_USER:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": f"Limit aktywnych kluczy to {MAX_KEYS_PER_USER}. Usuń któryś, żeby dodać nowy.",
            },
        )

    # `token_urlsafe` daje 32 bajty losowości. Prefiks istnieje po to, żeby
    # wyciekły klucz dało się rozpoznać w skanerze sekretów — patrz krok
    # gitleaks w CI.
    raw = f"{KEY_PREFIX}{secrets.token_urlsafe(KEY_BYTES)}"

    try:
        key = ApiKey.objects.create(
            user=user,
            name=name[:64],
            lookup_hash=_lookup_hash(raw),
            secret_encrypted=encrypt_secret(raw),
            prefix=raw[: len(KEY_PREFIX) + 4],
            last_four=raw[-4:],
        )
    except IntegrityError:  # pragma: no cover - kolizja 32 bajtów jest nierealna
        raise HttpError(400, {"code": "conflict", "message": "Nie udało się wygenerować klucza. Spróbuj ponownie."})

    record(user, "apikey.create", resource=str(key.id), metadata={"name": key.name})

    payload_out = _serialize(key)
    # Jedyne miejsce w całym serwisie, w którym wartość klucza trafia do
    # odpowiedzi. Kolejne wywołanie `list_keys` jej nie zawiera.
    payload_out["secret"] = raw
    return 201, payload_out


@router.delete("/keys/{key_id}", response={204: None, 401: ErrorOut, 404: ErrorOut})
def revoke_key(request, key_id: str):
    user = current_user(request)
    key = ApiKey.objects.filter(id=key_id, user=user, revoked_at__isnull=True).first()
    if key is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego klucza."})

    key.revoked_at = datetime_now()
    key.save(update_fields=["revoked_at"])
    record(user, "apikey.revoke", resource=str(key.id), metadata={"name": key.name})
    return 204, None


def datetime_now():
    from django.utils import timezone

    return timezone.now()
