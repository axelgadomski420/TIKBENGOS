"""Walidacja dostawców przy zapisie klucza — obrona przed SSRF.

Ten plik istnieje z jednego powodu: żeby adres, na który serwer wyśle
żądanie, nie pochodził od użytkownika.

Dlaczego to jest groźne. Serwer ma dostęp do sieci wewnętrznej, do bazy
i do metadanych instancji. Gdyby użytkownik mógł podać dowolny adres,
mógłby kazać serwerowi wysłać żądanie na:

- `http://169.254.169.254/` — punkt metadanych chmury. W wielu konfiguracjach
  odpowiada poświadczeniami instancji, czyli kluczami do całego konta w chmurze.
- `http://localhost:8000/` — nasze własne API. Żądanie z zewnątrz obchodzi
  uwierzytelnianie, bo pochodzi z zaufanego adresu.
- `http://db:5432/` — baza danych w tej samej sieci Dockera.
- adres pod kontrolą atakującego, który odpowiada powoli i zajmuje procesy.

Dlatego adres bierze się z katalogu w `packages/core/src/providers.ts`,
po stronie Pythona powtórzonego niżej, i nigdy z formularza.
"""

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
PROVIDER_BASE_URLS: dict[str, str] = {
    # Modele językowe
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com",
    "google-ai": "https://generativelanguage.googleapis.com",
    "mistral": "https://api.mistral.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "xai": "https://api.x.ai/v1",
    "together": "https://api.together.xyz/v1",
    # Obrazy
    "replicate": "https://api.replicate.com/v1",
    "stability": "https://api.stability.ai",
    "huggingface": "https://api-inference.huggingface.co",
    # Mowa
    "elevenlabs": "https://api.elevenlabs.io/v1",
    # Kod
    "github": "https://api.github.com",
    "gitlab": "https://gitlab.com/api/v4",
}

# Dostawcy obecni w katalogu, ale bez potwierdzonego adresu. Zapis klucza jest
# dozwolony — klucz czeka w bazie, aż adres zostanie potwierdzony. Wykonanie
# wywołania bez adresu zgłasza się jako błąd, nie jako cicha próba połączenia
# się z niczym.
PROVIDERS_WITHOUT_URL: frozenset[str] = frozenset(
    {
        "cohere",
        "perplexity",
        "fireworks",
        "black-forest-labs",
        "deepgram",
        "assemblyai",
        "speechmatics",
        "playht",
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
    # w konfiguracji wychodzącego żądania. Sprawdzenie nazwy przy zapisie
    # wyłapie literówkę w adresie, zanim ktoś na nią trafi w produkcji.
    if has_base_url(provider_id):
        ensure_public_https(PROVIDER_BASE_URLS[provider_id])
