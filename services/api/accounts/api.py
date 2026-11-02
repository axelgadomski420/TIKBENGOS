"""Endpointy tożsamości i sesji.

Kształt odpowiedzi pochodzi z `packages/core/src/identity.ts`, a nie
z wygody implementacji. Błąd ma zawsze postać `ApiError` — interfejs
nie zgaduje, co dostał.
"""

import re
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
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


def _consents(user: User) -> dict:
    return {
        "camera": user.consent_camera,
        "microphone": user.consent_microphone,
        "github": user.consent_github,
        "pushNotifications": user.consent_push_notifications,
        "updatedAt": user.consents_updated_at or timezone.datetime.fromtimestamp(0, tz=timezone.utc),
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
