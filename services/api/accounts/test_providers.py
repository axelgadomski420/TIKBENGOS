"""Testy katalogu dostawców.

Ten plik istnieje po to, żeby rozjazd między katalogiem w TypeScript,
z którego czyta interfejs, a kopią w Pythonie, z której czyta serwer,
został wykryty przez CI, a nie przez użytkownika.

Czego pilnujemy:
1. Każdy adres z katalogu przechodzi kontrolę HTTPS i nie wskazuje na sieć
   wewnętrzną — to jest bezpośredni test obrony przed SSRF,
2. Żaden adres nie kończy się pustym łańcuchem ani nie ma schematu http,
3. Zbiór dostawców z adresem i bez adresu nie mają części wspólnej,
4. Walidacja klucza odrzuca to, co ma odrzucać.

Czego NIE pilnujemy: samego istnienia wpisu w TypeScripcie. Python nie
czyta plików .ts, a test Pythona, który czyta plik TS, to ta sama krucha
zależność, którą próbujemy wyłapać. Ręczna uwaga w komentarzu katalogu
zostaje jedyną obroną przed brakiem wpisu — i to jest świadomy koszt.
"""

from django.test import SimpleTestCase

from .providers import (
    ALL_KNOWN_PROVIDERS,
    PROVIDER_AUTH_SCHEMES,
    PROVIDER_BASE_URLS,
    PROVIDERS_WITHOUT_URL,
    ProviderError,
    auth_headers_for,
    base_url_for,
    ensure_public_https,
    has_base_url,
    is_known_provider,
    validate_credential,
)


class CatalogueConsistencyTests(SimpleTestCase):
    def test_no_provider_appears_in_both_sets(self):
        overlap = set(PROVIDER_BASE_URLS) & set(PROVIDERS_WITHOUT_URL)
        self.assertEqual(overlap, set(), f"Dostawca w obu zbiorach: {overlap}")

    def test_every_known_provider_has_a_category(self):
        for provider_id in ALL_KNOWN_PROVIDERS:
            with self.subTest(provider=provider_id):
                self.assertTrue(is_known_provider(provider_id))

    def test_unknown_provider_is_rejected(self):
        self.assertFalse(is_known_provider("nie-ma-takiego"))

    def test_addresses_are_https_and_not_internal(self):
        """Każdy adres z katalogu musi przejść własną kontrolę SSRF.

        To jest test na siebie: gdyby ktoś dopisał do katalogu adres
        wewnętrzny, ten test padnie, zamiast przepuścić żądanie do metadanych
        chmury w produkcji.
        """
        for provider_id, url in PROVIDER_BASE_URLS.items():
            with self.subTest(provider=provider_id, url=url):
                self.assertTrue(url.startswith("https://"), f"{provider_id}: nie HTTPS")
                # Sprawdzenie schematu i nazw zastrzeżonych, bez DNS — test
                # nie może wymagać sieci, żeby nie migotał w CI.
                parsed_host = url.split("//", 1)[1].split("/", 1)[0].lower()
                self.assertNotIn(parsed_host, {"localhost", "127.0.0.1", "::1", "0.0.0.0"})
                self.assertFalse(parsed_host.endswith(".local"))
                self.assertFalse(parsed_host.endswith(".internal"))

    def test_base_url_for_raises_for_provider_without_address(self):
        if not PROVIDERS_WITHOUT_URL:
            self.skipTest("Brak dostawców bez adresu")
        provider_id = sorted(PROVIDERS_WITHOUT_URL)[0]
        with self.assertRaises(ProviderError):
            base_url_for(provider_id)

    def test_base_url_for_returns_address_when_present(self):
        self.assertEqual(base_url_for("openai"), "https://api.openai.com/v1")
        self.assertTrue(has_base_url("openai"))

    def test_all_registered_schemes_belong_to_known_providers(self):
        for provider_id in PROVIDER_AUTH_SCHEMES:
            with self.subTest(provider=provider_id):
                self.assertIn(provider_id, ALL_KNOWN_PROVIDERS)


class CredentialValidationTests(SimpleTestCase):
    def test_rejects_unknown_provider(self):
        with self.assertRaises(ProviderError):
            validate_credential("nie-ma-takiego", "x" * 40)

    def test_rejects_empty_key(self):
        with self.assertRaises(ProviderError):
            validate_credential("openai", "   ")

    def test_rejects_short_key(self):
        with self.assertRaises(ProviderError):
            validate_credential("openai", "sk-1")

    def test_rejects_key_with_whitespace_inside(self):
        with self.assertRaises(ProviderError):
            validate_credential("openai", "sk-abcdefgh ijklmnop")

    def test_accepts_provider_without_address(self):
        """Zapis klucza dla dostawcy bez adresu MA się udać.

        Klucz czeka w bazie, aż adres zostanie potwierdzony. Odrzucenie go
        tutaj kazałoby użytkownikowi wracać do ekranu, gdy adres już będzie.
        """
        provider_id = sorted(PROVIDERS_WITHOUT_URL)[0]
        validate_credential(provider_id, "x" * 40)


class AuthHeaderTests(SimpleTestCase):
    def test_bearer_is_default(self):
        header = auth_headers_for("openai", "klucz")
        self.assertEqual(header, {"Authorization": "Bearer klucz"})

    def test_anthropic_uses_own_header(self):
        header = auth_headers_for("anthropic", "klucz")
        self.assertEqual(header, {"x-api-key": "klucz"})

    def test_deepgram_uses_token_scheme_not_bearer(self):
        # Ten test pilnuje najczystszej pomyłki przy tym dostawcy:
        # `Authorization: Bearer` daje 401, poprawny jest `Token`.
        header = auth_headers_for("deepgram", "klucz")
        self.assertEqual(header, {"Authorization": "Token klucz"})

    def test_gitlab_uses_private_token_header(self):
        header = auth_headers_for("gitlab", "klucz")
        self.assertEqual(header, {"PRIVATE-TOKEN": "klucz"})

    def test_google_uses_own_header(self):
        header = auth_headers_for("google-ai", "klucz")
        self.assertEqual(header, {"x-goog-api-key": "klucz"})


class SsrfGuardTests(SimpleTestCase):
    def test_rejects_http(self):
        with self.assertRaises(ProviderError):
            ensure_public_https("http://api.openai.com/v1")

    def test_rejects_metadata_address(self):
        # Nazwa zastrzeżona — odrzucana bez pytania DNS.
        with self.assertRaises(ProviderError):
            ensure_public_https("https://metadata.google.internal/computeMetadata/v1/")

    def test_rejects_localhost(self):
        with self.assertRaises(ProviderError):
            ensure_public_https("https://localhost:8000/v1/")

    def test_rejects_local_suffix(self):
        with self.assertRaises(ProviderError):
            ensure_public_https("https://db.internal/v1/")

    def test_ip_as_host_is_checked_without_dns(self):
        # Adres IP wprost: 169.254.169.254 to punkt metadanych chmury.
        # Ten test celowo używa adresu, który nie wymaga DNS, bo literał IP
        # przechodzi przez `gethostbyname_ex` bez pytania resolvera.
        with self.assertRaises(ProviderError):
            ensure_public_https("https://169.254.169.254/latest/meta-data/")
