"""
Ustawienia TIKBENGOS API.

Wszystko, co zależy od środowiska, pochodzi z zmiennych środowiskowych —
żadna wartość wrażliwa nie ma tu zapisanej domyślnej. Brak `SECRET_KEY`
w środowisku innym niż developerskie zatrzymuje start, zamiast pozwolić
wystartować na kluczu z repozytorium.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
IS_DEVELOPMENT = ENVIRONMENT == "development"


def _require(name: str, *, development_default: str | None = None) -> str:
    value = os.environ.get(name)
    if value:
        return value
    if IS_DEVELOPMENT and development_default is not None:
        return development_default
    raise RuntimeError(
        f"Brak zmiennej środowiskowej {name}. Ustaw ją w `.env` — w tym środowisku "
        "nie ma wartości domyślnej i start bez niej byłby niebezpieczny."
    )


SECRET_KEY = _require("SECRET_KEY", development_default="dev-only-not-for-any-deployment")
DEBUG = IS_DEVELOPMENT
ALLOWED_HOSTS = [h for h in os.environ.get("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "accounts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

ROOT_URLCONF = "tikbengos.urls"
WSGI_APPLICATION = "tikbengos.wsgi.application"
ASGI_APPLICATION = "tikbengos.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    }
]

# ── Baza danych ──────────────────────────────────────────────────────────
# `DATABASE_URL` z compose ma pierwszeństwo; rozbite zmienne POSTGRES_* są
# dla uruchomienia poza kontenerem.
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    import urllib.parse as _urlparse

    _parsed = _urlparse.urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _parsed.path.lstrip("/"),
            "USER": _parsed.username or "",
            "PASSWORD": _parsed.password or "",
            "HOST": _parsed.hostname or "",
            "PORT": str(_parsed.port or 5432),
            "CONN_MAX_AGE": 60,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "tikbengos"),
            "USER": os.environ.get("POSTGRES_USER", "tikbengos"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "change-me"),
            "HOST": os.environ.get("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 60,
        }
    }

REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")

# ── Uwierzytelnianie ─────────────────────────────────────────────────────
# Jedno konto na cały system. Model użytkownika rozszerza AbstractUser, więc
# nie ma drugiego modelu tożsamości w żadnym module.
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Szyfrowanie kluczy API ───────────────────────────────────────────────
# Klucz, którym szyfrowane są sekrety użytkowników w spoczynku. Wymagany
# w każdym środowisku: bez niego nie da się odszyfrować niczego, co już leży
# w bazie.
FIELD_ENCRYPTION_KEY = _require("FIELD_ENCRYPTION_KEY")

# ── Sesje i ciasteczka ───────────────────────────────────────────────────
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not IS_DEVELOPMENT
CSRF_COOKIE_HTTPONLY = False  # interfejs musi odczytać token
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not IS_DEVELOPMENT
CSRF_TRUSTED_ORIGINS = [
    o for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o
]

# ── Czas trwania sesji ───────────────────────────────────────────────────
# 30 dni dla zwykłego logowania. MFA dokłada osobną, krótszą ważność tokenu.
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "pl"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
