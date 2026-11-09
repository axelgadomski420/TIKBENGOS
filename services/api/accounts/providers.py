import ipaddress
import socket
from urllib.parse import urlparse

# Katalog dostawców powtórzony z `packages/core/src/providers.ts`.
#
# Dlaczego nie importujemy z TypeScriptu: serwer nie czyta plików .ts,
# a generowanie kodu przy budowaniu dodawałoby krok, który może się rozjechać
# niezauważenie. Lista jest więc utrzymywana ręcznie po obu stronach.
# Utrzymywanie tego ręcznie jest świadomym kosztem: adres musi być zaszyty
# po stronie serwera, bo to serwer wykonuje żądanie.
#
# UWAGA: przy każdym adresie z `verifiedAt` w katalogu TypeScript musi tu być
# ten sam adres. Rozjazd między nimi oznacza, że interfejs pokazuje użytkownikowi
# jeden adres, a serwer uderza pod inny.
PROVIDER_BASE_URLS: dict[str, str] = {
    # ── Modele językowe ────────────────────────────────────────────────
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com",
    "google-ai": "https://generativelanguage.googleapis.com",
    "mistral": "https://api.mistral.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "xai": "https://api.x.ai/v1",
    "together": "https://api.together.xyz/v1",
    "cohere": "https://api.cohere.ai/v1",
    "perplexity": "https://api.perplexity.ai",
    "fireworks": "https://api.fireworks.ai/inference/v1",
    # ── Obrazy ────────────────────────────────────────────────────────
    "replicate": "https://api.replicate.com/v1",
    "stability": "https://api.stability.ai",
    "huggingface": "https://api-inference.huggingface.co",
    # ── Mowa ──────────────────────────────────────────────────────────
    "elevenlabs": "https://api.elevenlabs.io/v1",
    "deepgram": "https://api.deepgram.com/v1",
    # ── Kod ──────────────────────────────────────────────────────────
    "github": "https://api.github.com",
    "gitlab": "https://gitlab.com/api/v4",
}

# Schemat nagłówka autoryzacji. Powtórzone z katalogu z tego samego powodu co
# adresy: serwer buduje żądanie, więc musi wiedzieć, jak wstawić klucz.
# `bearer` → `Authorization: Bearer <klucz>`
# `x-api-key` → własny nagłówek o tej nazwie
# `token` → `Authorization: Token <klucz>` (Deepgram nie używa Bearer)
PROVIDER_AUTH_SCHEMES: dict[str, str] = {
    "anthropic": "x-api-key",
    "google-ai": "x-goog-api-key",
    "elevenlabs": "xi-api-key",
    "deepgram": "token",
    "gitlab": "PRIVATE-TOKEN",
}

# Dostawcy obecni w katalogu, ale bez potwierdzonego adresu. Zapis klucza jest
# dozwolony — klucz czeka w bazie, aż adres zostanie potwierdzony. Wykonanie
# wywołania bez adresu zgłasza się jako błąd, nie jako cicha próba połączenia
# się z niczym.
PROVIDERS_WITHOUT_URL: frozenset[str] = frozenset(
    {
        "assemblyai",
        "speechmatics",
        "playht",
        "black-forest-labs",
        "suno",
        "udio",
        "cloudflare",
        "azure-openai",
        "aws-bedrock",
        "vertex-ai",
    }
)

ALL_KNOWN_PROVIDERS: frozenset[str] = frozenset(PROVIDER_BASE_URLS) | PROVIDERS_WITHOUT_URL

# Sieci, na które NIE wolno wysłać żądania, nawet gdyby adres pojawił się
# w katalogu w wyniku pomyłki. Katalog ma pierwszeństwo, ale ten test jest
# drugą linią obrony — na wypadek wpisu dodanego nieuważnie.
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # metadane chmury
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

_BLOCKED_HOST_SUFFIXES = (".internal", ".local", ".localhost")
_BLOCKED_HOSTS = frozenset({"localhost", "metadata", "metadata.google.internal"})


class ProviderError(Exception):
    """Błąd dostawcy do pokazania użytkownikowi."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def is_known_provider(provider_id: str) -> bool:
    return provider_id in ALL_KNOWN_PROVIDERS


def has_base_url(provider_id: str) -> bool:
    return provider_id in PROVIDER_BASE_URLS


def base_url_for(provider_id: str) -> str:
    """Zwraca adres dostawcy albo rzuca błąd.

    Serwer nigdy nie przyjmuje adresu z zewnątrz. Ta funkcja jest jedynym
    miejscem, w którym powstaje adres wychodzącego żądania.
    """
    url = PROVIDER_BASE_URLS.get(provider_id)
    if not url:
        raise ProviderError(
            "bad_request",
            "Ten dostawca nie ma jeszcze potwierdzonego adresu API, więc nie można "
            "wykonać wywołania. Klucz można zapisać — wróci do użycia, gdy adres "
            "zostanie potwierdzony.",
        )
    return url


def auth_headers_for(provider_id: str, key: str) -> dict[str, str]:
    """Buduje nagłówki autoryzacji dla dostawcy.

    Zwraca nowy słownik — klucz nigdy nie trafia do nagłówka `Referer` ani
    do logów, bo nie jest nigdzie zapisywany poza tym jednym miejscem.
    """
    scheme = PROVIDER_AUTH_SCHEMES.get(provider_id)
    if scheme == "x-api-key":
        return {"x-api-key": key}
    if scheme == "x-goog-api-key":
        return {"x-goog-api-key": key}
    if scheme == "xi-api-key":
        return {"xi-api-key": key}
    if scheme == "token":
        # Deepgram wymaga schematu `Token`, nie `Bearer`.
        return {"Authorization": f"Token {key}"}
    if scheme == "PRIVATE-TOKEN":
        return {"PRIVATE-TOKEN": key}
    return {"Authorization": f"Bearer {key}"}


def ensure_public_https(url: str) -> str:
    """Sprawdza adres przed wysłaniem żądania.

    Kolejność ma znaczenie i nie jest dowolna:
    1. schemat musi być `https` — `http` wysłałoby klucz otwartym tekstem,
    2. nazwa nie może być z listy zastrzeżonych,
    3. nazwa musi się rozwiązać do adresu,
    4. ROZWIĄZANY adres nie może należeć do sieci wewnętrznej.

    Punkt 4 jest tu po to, żeby nie dało się obejść listy nazw. Atakujący,
    który kontroluje DNS, może podać publiczną nazwę wskazującą na 127.0.0.1
    (DNS rebinding) — sprawdzenie samej nazwy tego nie łapie, sprawdzenie
    adresu po rozwiązaniu już tak.
    """
    parsed = urlparse(url)

    if parsed.scheme != "https":
        raise ProviderError("bad_request", "Adres dostawcy musi używać HTTPS.")

    host = (parsed.hostname or "").lower()
    if not host:
        raise ProviderError("bad_request", "Adres dostawcy nie ma nazwy hosta.")
    if host in _BLOCKED_HOSTS or host.endswith(_BLOCKED_HOST_SUFFIXES):
        raise ProviderError("bad_request", "Ten adres jest zastrzeżony i nie może być celem żądania.")

    try:
        # `gethostbyname_ex` zwraca wszystkie adresy, nie tylko pierwszy —
        # pierwszy lepszy adres publiczny nie może przesłonić wewnętrznego.
        _, _, addresses = socket.gethostbyname_ex(host)
    except socket.gaierror as exc:
        raise ProviderError(
            "unavailable",
            f"Nie można rozwiązać nazwy dostawcy ({host}). Sprawdź połączenie z siecią.",
        ) from exc

    for address in addresses:
        ip = ipaddress.ip_address(address)
        if any(ip in network for network in _BLOCKED_NETWORKS):
            raise ProviderError(
                "bad_request",
                f"Dostawca rozwiązuje się na adres wewnętrzny ({address}), a żądanie na taki adres "
                "nie może zostać wysłane.",
            )

    return url


def validate_credential(provider_id: str, key: str) -> None:
    """Walidacja przed zapisem klucza. Rzuca `ProviderError` albo nie robi nic."""
    provider_id = (provider_id or "").strip()
    if not is_known_provider(provider_id):
        raise ProviderError(
            "bad_request",
            "Nie znamy tego dostawcy. Wybierz jednego z listy w ustawieniach.",
        )

    value = (key or "").strip()
    if not value:
        raise ProviderError("bad_request", "Wklej klucz dostawcy.")
    if len(value) < 8:
        raise ProviderError("bad_request", "Ten klucz jest za krótki, żeby był prawdziwy.")
    if any(ch.isspace() for ch in value):
        raise ProviderError(
            "bad_request",
            "Klucz nie może zawierać spacji — sprawdź, czy skopiowało się całe.",
        )

    # Adres sprawdzamy też przy zapisie, choć bierzemy go z katalogu. Powód:
    # katalog jest utrzymywany ręcznie, a błąd w nim nie może stać się błędem
    # w konfiguracji wychodzącego żądania.
    if has_base_url(provider_id):
        ensure_public_https(PROVIDER_BASE_URLS[provider_id])


# Ścieżki i modele z 9 listopada 2026. Muszą zgadzać się z
# packages/core/src/engine-routes.ts. Ścieżka jest doklejana do bazy
# z katalogu — nigdy nie pochodzi z formularza.
LLM_ROUTES: dict[tuple[str, str], dict] = {
    ("openai", "openai-chat"): {
        "path": "chat/completions",
        "protocol": "openai-chat",
        "models": ["gpt-5.5", "gpt-5.5-pro", "gpt-5.4-mini", "gpt-5.4-nano"],
    },
    ("xai", "xai-chat"): {
        "path": "chat/completions",
        "protocol": "openai-chat",
        "models": ["grok-4.7", "grok-4.6", "grok-4.20-beta-latest-non-reasoning", "grok-4.1-fast"],
    },
    ("xai", "xai-responses"): {
        "path": "responses",
        "protocol": "xai-responses",
        "models": ["grok-4.7", "grok-4.20-beta-latest-non-reasoning"],
    },
    ("google-ai", "gemini-generate"): {
        "path": "v1beta/models/{model}:generateContent",
        "protocol": "gemini",
        "models": ["gemini-4-argon", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"],
    },
    ("google-ai", "gemini-openai"): {
        "path": "v1beta/openai/chat/completions",
        "protocol": "openai-chat",
        "models": ["gemini-4-argon", "gemini-3.8-flash", "gemini-3.6-flash"],
    },
    ("anthropic", "anthropic-messages"): {
        "path": "v1/messages",
        "protocol": "anthropic",
        "models": ["claude-sonnet-5-5", "claude-sonnet-4-6"],
    },
    ("mistral", "mistral-chat"): {
        "path": "chat/completions",
        "protocol": "openai-chat",
        "models": ["mistral-large-latest", "mistral-small-latest"],
    },
    ("deepseek", "deepseek-chat"): {
        "path": "chat/completions",
        "protocol": "openai-chat",
        "models": ["deepseek-chat", "deepseek-reasoner"],
    },
    ("groq", "groq-chat"): {
        "path": "chat/completions",
        "protocol": "openai-chat",
        "models": ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"],
    },
    ("openrouter", "openrouter-chat"): {
        "path": "chat/completions",
        "protocol": "openai-chat",
        "models": ["x-ai/grok-4.7", "google/gemini-3.8-flash", "openai/gpt-5.4-mini"],
    },
}


def resolve_engine(provider_id: str, route_id: str, model: str) -> tuple[str, str]:
    """Zwraca pełny adres HTTPS i protokół albo błąd do pokazania użytkownikowi."""
    route = LLM_ROUTES.get(((provider_id or "").strip(), (route_id or "").strip()))
    model = (model or "").strip()
    if route is None or model not in route["models"]:
        raise ProviderError(
            "bad_request",
            "Ten endpoint albo model nie jest na liście z 9 listopada 2026.",
        )
    if any(part in model for part in ("..", " ", "\\")) or model.startswith("/"):
        raise ProviderError("bad_request", "Nazwa modelu jest nieprawidłowa.")
    path = str(route["path"]).replace("{model}", model).lstrip("/")
    url = base_url_for(provider_id).rstrip("/") + "/" + path
    ensure_public_https(url)
    return url, str(route["protocol"])
