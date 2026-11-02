"""Kształty odpowiedzi — dokładnie te z `packages/core/src/identity.ts`.

Interfejs czyta te same nazwy pól, więc każda zmiana tutaj bez zmiany
w kontrakcie jest błędem, a nie refaktoryzacją.
"""

from datetime import datetime

from ninja import Schema


class ConsentsOut(Schema):
    camera: bool
    microphone: bool
    github: bool
    pushNotifications: bool
    updatedAt: datetime


class IdentityOut(Schema):
    id: str
    username: str
    email: str
    displayName: str | None
    avatarUrl: str | None
    bio: str | None
    website: str | None
    roles: list[str]
    consents: ConsentsOut
    perception: str
    createdAt: datetime


class RegisterIn(Schema):
    username: str
    email: str
    password: str


class LoginIn(Schema):
    identifier: str
    password: str
    totp: str | None = None


class SessionOut(Schema):
    identity: IdentityOut
    # W przeglądarce token i tak żyje w ciasteczku HttpOnly. Pole istnieje,
    # bo kontrakt je opisuje i klient mobilny będzie z niego korzystał.
    accessToken: str
    expiresAt: datetime


class UpdateIdentityIn(Schema):
    displayName: str | None = None
    bio: str | None = None
    website: str | None = None


class UpdateConsentsIn(Schema):
    camera: bool | None = None
    microphone: bool | None = None
    github: bool | None = None
    pushNotifications: bool | None = None


class ApiKeyOut(Schema):
    """Klucz w postaci, w jakiej wolno go pokazać po zapisie.

    Ten schemat NIE MA i nie może mieć pola `secret` — wartość klucza pokazuje
    się wyłącznie w `ApiKeyCreatedOut`, używanym tylko przy tworzeniu.
    """

    id: str
    name: str
    prefix: str
    lastFour: str
    createdAt: datetime
    lastUsedAt: datetime | None
    revokedAt: datetime | None


class ApiKeyCreatedOut(ApiKeyOut):
    # Jedyny moment, w którym wartość klucza opuszcza serwer. Świadomie
    # osobny schemat, a nie pole opcjonalne w `ApiKeyOut` — typ, który nie
    # może zwrócić sekretu, jest lepszy niż typ, który obiecuje, że tego
    # nie zrobi.
    secret: str


class CreateApiKeyIn(Schema):
    name: str


# ─────────────────────── Klucze dostawców zewnętrznych ──────────────────────


class ProviderCredentialOut(Schema):
    """Zapisany klucz dostawcy. Bez wartości sekretu — ta sama zasada co wyżej."""

    id: str
    providerId: str
    name: str
    prefix: str
    lastFour: str
    createdAt: datetime
    lastUsedAt: datetime | None
    revokedAt: datetime | None


class ProviderCredentialCreatedOut(ProviderCredentialOut):
    # Jedyny moment, w którym wartość klucza dostawcy opuszcza serwer.
    secret: str


class CreateProviderCredentialIn(Schema):
    providerId: str
    name: str
    key: str


class ProviderOut(Schema):
    """Dostawca do rozwijanej listy w ustawieniach.

    `hasBaseUrl` mówi interfejsowi, czy klucz ma już dokąd trafić. Wpis bez
    adresu da się zapisać, ale wywołania z niego nie będzie — a użytkownik
    ma to widzieć przed zapisem, nie po.
    """

    id: str
    kind: str
    hasBaseUrl: bool


class ErrorOut(Schema):
    code: str
    message: str
    field: str | None = None


class RegisterOut(Schema):
    identity: IdentityOut
    accessToken: str
    expiresAt: datetime
