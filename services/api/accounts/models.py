"""Tożsamość — jedno konto na cały system.

Model odzwierciedla `packages/core/src/identity.ts` co do pola. Role są
kumulatywne i trzymane jako lista wartości; uprawnienia wynikają z ról
w `permissions.py`, żeby dołożenie roli nie wymagało migracji.
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .crypto import decrypt_secret, encrypt_secret

ROLE_CHOICES = [
    ("user", "Użytkownik"),
    ("creator", "Twórca"),
    ("moderator", "Moderator"),
    ("developer", "Deweloper"),
    ("admin", "Administrator"),
]

PERCEPTION_CHOICES = [
    ("both", "Obraz i dźwięk"),
    ("audio-only", "Tylko dźwięk"),
    ("text-only", "Tylko tekst"),
]

# Dostawcy, przez których można się zalogować bez hasła. Nazwy są
# identyfikatorami w bazie i w adresach, więc zostają w tej samej postaci
# co w katalogu dostawców (`packages/core/src/providers.ts`).
OAUTH_PROVIDERS = ["google", "github"]


class User(AbstractUser):
    """Konto użytkownika.

    `id` jest UUID-em, bo identyfikator pojawia się w adresach publicznych
    profili i w zdarzeniach czasu rzeczywistego — numer sekwencyjny zdradza
    kolejność rejestracji i tempo wzrostu.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=80, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    bio = models.TextField(blank=True, default="")
    website = models.URLField(blank=True, default="")

    roles = models.JSONField(default=list, blank=True)
    perception = models.CharField(max_length=16, choices=PERCEPTION_CHOICES, default="both")

    # Zgody są osobne od uprawnień: rola mówi, co wolno, zgoda — na co
    # użytkownik sam pozwolił. Kamera i mikrofon wymagają obu.
    consent_camera = models.BooleanField(default=False)
    consent_microphone = models.BooleanField(default=False)
    consent_github = models.BooleanField(default=False)
    consent_push_notifications = models.BooleanField(default=False)
    consents_updated_at = models.DateTimeField(null=True, blank=True)

    def effective_roles(self) -> list[str]:
        """Role faktycznie obowiązujące. `user` ma każdy, także gdy w bazie
        zapisano tylko rolę wyższą — brak tego nie może odebrać podstawy."""
        roles = [r for r in (self.roles or []) if r in dict(ROLE_CHOICES)]
        if "user" not in roles:
            roles.insert(0, "user")
        return roles

    def __str__(self) -> str:  # pragma: no cover - wygoda w panelu
        return self.username


class LinkedAccount(models.Model):
    """Konto zewnętrzne podpięte do konta BENGOS.

    ── DLACZEGO OSOBNY MODEL, A NIE POLA NA `User` ────────────────────────
    Jedno konto BENGOS może mieć podpiętych kilku dostawców — dziś Google,
    jutro GitHub i cokolwiek dalej. Trzy kolumny na `User` rosłyby z każdym
    nowym dostawcą i wymagały migracji przy każdym dodaniu. Tabela z jednym
    wierszem na parę (dostawca, konto) jest zamknięta na zmiany.

    ── HASŁO ZOSTAJE NIEUŻYWALNE PRZY REJESTRACJI PRZEZ DOSTAWCĘ ──────────
    `set_unusable_password()` ustawia skrót, którego nie da się dopasować
    żadnym hasłem. To jest poprawne zachowanie, a nie luka: konto założone
    przez Google nie ma hasła w BENGOS i nie powinno się go dać zgadnąć.
    Użytkownik może później ustawić hasło osobnym krokiem, jeśli zechce
    logować się także bez dostawcy.

    ── ADRES EMAIL JEST TU ZAPISANY OSOBNO ───────────────────────────────
    Adres może się różnić między dostawcami i może się zmienić u dostawcy.
    Kopia w tym wierszu mówi, którym adresem dostawca się przedstawił
    w chwili podpinania konta — bez tego nie da się wyjaśnić użytkownikowi,
    dlaczego widzi dwa różne adresy.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="linked_accounts")
    provider = models.CharField(max_length=32, choices=[(p, p) for p in OAUTH_PROVIDERS])
    # Identyfikator użytkownika u dostawcy. Nie jest sekretem, ale jest
    # niepowtarzalny — to on rozstrzyga, kto się loguje.
    subject = models.CharField(max_length=191)
    email = models.EmailField(blank=True, default="")
    display_name = models.CharField(max_length=150, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)
    last_login_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["provider"]
        constraints = [
            # Jeden wiersz na parę (dostawca, subject). Bez tego dwa równoległe
            # żądania callbacku mogłyby założyć dwa konta dla tej samej osoby.
            models.UniqueConstraint(
                fields=["provider", "subject"], name="unique_linked_provider_subject"
            ),
            # Ten sam dostawca nie może być podpięty dwa razy do jednego konta.
            models.UniqueConstraint(
                fields=["user", "provider"], name="unique_linked_provider_per_user"
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.provider}:{self.subject}"


class ApiKey(models.Model):
    """Klucz API użytkownika wystawiony przez TIKBENGOS.

    Trzy rzeczy, które ten model gwarantuje:
    - pełna wartość klucza leży zaszyfrowana (`secret_encrypted`) i nie ma
      metody, która zwraca ją w odpowiedzi;
    - do rozpoznania klucza służy skrót, więc uwierzytelnianie nie wymaga
      odszyfrowania;
    - `prefix` i `last_four` są jedynym, co widzi użytkownik po zapisie.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
    name = models.CharField(max_length=64)

    # Skrót do wyszukania klucza przy żądaniu. Niesolony SHA-256 jest tu
    # wystarczający: klucz ma 32 bajty losowości, więc nie da się go zgadnąć
    # ani porównać ze słownikiem.
    lookup_hash = models.CharField(max_length=64, unique=True, db_index=True)

    # Zaszyfrowana pełna wartość. Szyfrowana, nie hashowana, bo klucz musi
    # dać się odtworzyć, żeby przekazać go usłudze zewnętrznej.
    secret_encrypted = models.TextField()

    prefix = models.CharField(max_length=16)
    last_four = models.CharField(max_length=4)

    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def reveal(self) -> str:
        """Odtwarza wartość klucza. Używane wyłącznie przez warstwę wywołań
        do usług zewnętrznych — nigdy nie trafia do odpowiedzi HTTP."""
        return decrypt_secret(self.secret_encrypted)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.prefix}…{self.last_four})"


class ProviderCredential(models.Model):
    """Klucz do zewnętrznego dostawcy — OpenAI, GitHub, ElevenLabs i tak dalej.

    Każdy użytkownik ma własne klucze i widzi wyłącznie swoje. To jest
    osobny model od `ApiKey`, a nie ten sam z polem `kind`, z jednego powodu:
    `ApiKey` to klucz, którym ktoś loguje się DO NAS, a `ProviderCredential`
    to klucz, którym MY logujemy się GDZIEŚ. Odwrócenie kierunku ma
    konsekwencje — inny sposób wyszukiwania, inne zasady uzycia, inne
    znaczenie wycieku.

    `provider_id` wskazuje wpis w katalogu `packages/core/src/providers.ts`.
    Adres docelowy bierze się z tego katalogu, nigdy z pola formularza —
    patrz `providers.py` i komentarz tam o ataku SSRF.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="provider_credentials")
    provider_id = models.CharField(max_length=64, db_index=True)
    name = models.CharField(max_length=64)

    lookup_hash = models.CharField(max_length=64, unique=True, db_index=True)
    secret_encrypted = models.TextField()

    prefix = models.CharField(max_length=32)
    last_four = models.CharField(max_length=4)

    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "provider_id", "name"],
                name="unique_credential_per_user_provider_name",
            )
        ]

    def reveal(self) -> str:
        """Odtwarza wartość klucza dla warstwy wywołań wychodzących.

        Ta metoda nie ma i nie może mieć odpowiednika w żadnym endpoincie.
        Klucz opuszcza serwer wyłącznie jako nagłówek żądania do dostawcy,
        nigdy jako pole odpowiedzi HTTP.
        """
        return decrypt_secret(self.secret_encrypted)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.provider_id}: {self.name} ({self.prefix}…{self.last_four})"


class AuditLog(models.Model):
    """Dziennik operacji.

    Bez tego nie da się odpowiedzieć na pytanie „kto zmienił role”, które
    przy modelu uprawnień jest pytaniem o bezpieczeństwo, nie o ciekawość.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="audit_entries")
    action = models.CharField(max_length=64)
    resource = models.CharField(max_length=128, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.action} @ {self.created_at:%Y-%m-%d %H:%M}"
