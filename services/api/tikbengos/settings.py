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
    # `staticfiles` jest tu dla `collectstatic`, którego używa komenda startowa
    # w `infra/docker-compose.prod.yml`. Bez tej pozycji wdrożenie wypisywało
    # `Unknown command: 'collectstatic'` przy każdym starcie API — cichy błąd,
    # bo komenda jest opakowana w `|| true`, a mimo to sygnał o rozjeździe
    # między plikiem compose a ustawieniami.
    "django.contrib.staticfiles",
    # `channels` musi być przed aplikacjami własnymi: rejestruje warstwę
    # kanałów, z której korzysta `asgi.py`, i podmienia obsługę połączeń.
    "channels",
    "accounts",
    # Feed rejestruje się przed Etapem 2, bo jego endpointy już istnieją.
    # Brak tej pozycji nie wywala serwera — dawałby tylko 404 na wpisach
    # i brak tabeli w migracjach, co jest trudniejsze do zauważenia.
    "feed",
    # Czat od Etapu 4 (tekst): rozmowy, wiadomości, nieprzeczytane.
    # Bez tej pozycji migracje czatu by nie istniały dla Django, a router
    # w `tikbengos/urls.py` nie miałby tabel pod sobą.
    "chat",
    # Dev od Etapu 5: repozytoria i issue GitHub, plany zmian z bramką
    # zgody, dziennik operacji. Montowane pod prefiks /git z kontraktu.
    "dev",
    # Muzyka od Etapu 5: biblioteka utworów, upload WAV z sekwencera
    # BENGOS Beat, zadania generacji z limitem dziennym. Montowana pod
    # prefiks /music z kontraktu API.music.
    "music",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.CsrfViewMiddleware",
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

# ── Pliki statyczne ──────────────────────────────────────────────────────
# Api nie serwuje statyków — robi to proxy i interfejs. `collectstatic`
# zbiera je do jednego katalogu na wypadek, gdyby kiedyś były potrzebne
# (panel administracyjny). Katalog istnieje, bo tworzy go `services/api/Dockerfile`.
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ── Media: pliki audio użytkowników ───────────────────────────────────────
# Utwory z sekwencera BENGOS Beat i z workera GPU lądują lokalnie — to
# świadoma decyzja Etapu 5, nie brak funkcji: magazyn R2 dojdzie razem
# z mediami wideo i wtedy zmieni się TYLKO backend storage, a kontrakt,
# endpointy i interfejs zostaną bez zmian. Udawanie R2 przed jego
# istnieniem byłoby gorsze niż szczery katalog na dysku.
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ── Baza danych ──────────────────────────────────────────────────────────
# `DATABASE_URL` z compose ma pierwszeństwo; rozbite zmienne POSTGRES_* są
# dla uruchomienia poza kontenerem.
#
# Obsługiwane są dwa schematy: `postgres://` i `sqlite:///`. SQLite nie jest
# tu dla wygody — jest po to, żeby dało się uruchomić `manage.py test`
# i pierwsze `migrate` bez stawiania PostgreSQL. Bez tego migracje pisane
# ręcznie można sprawdzić dopiero na maszynie produkcyjnej.
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
    import urllib.parse as _urlparse

    _sqlite = _urlparse.urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": _sqlite.path or ":memory:",
        }
    }
elif DATABASE_URL:
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

# ── Kanały czasu rzeczywistego ───────────────────────────────────────────
# `asgi.py` kieruje trasy WebSocket przez `ProtocolTypeRouter`, a ten
# potrzebuje warstwy kanałów. Redis jest tu wymagany, a nie opcjonalny —
# tak samo jak w `SESSION_ENGINE = cached_db` powyżej: produkcyjna usługa
# `realtime` uruchamia dwa procesy uvicorna, a warstwa trzymana w pamięci
# jednego procesu nie dostarczyłaby wiadomości do klienta podłączonego
# do drugiego.
#
# Wyjątek: gdy baza jest SQLite, warstwa idzie w pamięć procesu. To jest
# tryb wyłącznie do testów i lokalnego sprawdzenia — nie da się go użyć
# z więcej niż jednym procesem, więc nie nadaje się na produkcję i nie
# udajemy, że się nadaje.
if DATABASES["default"]["ENGINE"].endswith("sqlite3"):
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
                # Prefiks chroni kanały przed kolizją z innym zastosowaniem
                # tej samej bazy Redis.
                "prefix": "tikbengos",
            },
        }
    }

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

# ── Nazwa nagłówka CSRF ──────────────────────────────────────────────────
# Domyślnie Django czyta `X-CSRFToken`. Interfejs wysyła `x-csrf-token`
# (patrz `CSRF_HEADER_NAME` w `apps/web/src/lib/api-client.ts`), więc bez
# tej linii serwer nie znajdował swojego nagłówka i odrzucał KAŻDE żądanie
# zapisujące kodem 403 — rejestrację, logowanie, zgody i klucze dostawców.
# Objaw był mylący: strona się otwierała (GET-y CSRF nie dotyczą), więc
# wyglądało to na brak funkcji, a nie na niezgodność jednej nazwy.
#
# Django porównuje tę wartość z `HTTP_` + nazwa nagłówka zapisana wielkimi
# literami i myślnikami zamienionymi na podkreślenia.
CSRF_HEADER_NAME = "HTTP_X_CSRF_TOKEN"

# ── Logowanie przez dostawcę zewnętrznego ────────────────────────────────
# Wartości są OPcjonalne i celowo bez domyślnych. Gdy ich nie ma, endpointy
# logowania przez dostawcę zwracają 503 z wyjaśnieniem, a lista dostawców
# mówi `configured: false` — interfejs pokazuje wtedy przycisk nieaktywny.
# Nie ma tu żadnego identyfikatora ani sekretu wpisanego na sztywno:
# repozytorium nie może zawierać sekretów ani udawać, że je ma.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GITHUB_OAUTH_CLIENT_ID = os.environ.get("GITHUB_OAUTH_CLIENT_ID", "")
GITHUB_OAUTH_CLIENT_SECRET = os.environ.get("GITHUB_OAUTH_CLIENT_SECRET", "")

# Baza adresu zwrotnego. Z niej biorą się oba adresy callbacku:
#     {baza}/api/auth/oauth/google/callback
#     {baza}/api/auth/oauth/github/callback
#
# Adres musi być DOKŁADNIE ten sam w panelu dostawcy i tutaj. Rozjazd daje
# `redirect_uri_mismatch` u Google — najczęstszy błąd przy pierwszym
# podłączeniu i najtrudniejszy do zauważenia, bo komunikat nie mówi,
# która wartość jest nie tak.
#
# Domyślnie bierzemy pierwszy adres z `CSRF_TRUSTED_ORIGINS`, bo ten sam
# adres, pod którym działa aplikacja, jest właściwą bazą dla callbacku.
OAUTH_REDIRECT_BASE = os.environ.get(
    "OAUTH_REDIRECT_BASE",
    (CSRF_TRUSTED_ORIGINS[0] if CSRF_TRUSTED_ORIGINS else ""),
)

# ── BENGOS Dev: GitHub i executor zmian ──────────────────────────────────
# Token jest OPCJONALNY i celowo bez domyślnej wartości. Gdy go nie ma,
# endpointy Dev zwracają 503 z wyjaśnieniem — moduł mówi "nie skonfigurowano",
# zamiast udawać działające połączenie z GitHubem. Zasada najmniejszych
# uprawnień z kontraktu: prawa są WYKRYWANE z odpowiedzi GitHuba (pole
# "permissions"), więc interfejs nigdy nie twierdzi, że token ma więcej,
# niż ma naprawdę.
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# Adres executora zmian kodu (Aider w piaskownicy, z TIKGIT). Pusto =
# zatwierdzanie planów zwraca odmowę 409 z wyjaśnieniem. To jest świadome:
# planu, którego nie da się wykonać, nie można przepuszczać przez bramkę
# zgody, bo zgoda traciłaby znaczenie.
BENGOS_CODE_EXECUTOR_URL = os.environ.get("BENGOS_CODE_EXECUTOR_URL", "")

# ── BENGOS Music: worker GPU i limity generacji ──────────────────────────
# MUSICGEN_ENDPOINT to adres maszyny z GPU, która odbiera zlecenia generacji
# i oddaje gotowy WAV przez endpoint zwrotny /music/jobs/{id}/complete.
# Pusto = zlecenie powstaje, CZEKA, a interfejs mówi to wprost — nie ma
# spinnera, który udaje postęp, którego nikt nie liczy.
MUSICGEN_ENDPOINT = os.environ.get("MUSICGEN_ENDPOINT", "")

# Limit dzienny generacji NA UŻYTKOWNIKA, egzekwowany w endpointcie
# zlecenia — nie w interfejsie, który tylko go POKAZUJE. Każda generacja
# to czas GPU, więc obrona limitem po stronie klienta byłaby obroną
# finansową na słowo honoru.
MUSIC_DAILY_LIMIT = int(os.environ.get("MUSIC_DAILY_LIMIT", "10"))

# ── Czas trwania sesji ───────────────────────────────────────────────────
# 30 dni dla zwykłego logowania. MFA dokłada osobną, krótszą ważność tokenu.
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "pl"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
