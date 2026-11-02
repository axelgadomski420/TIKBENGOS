"""Tożsamość — jedno konto na cały system.

Model odzwierciedla `packages/core/src/identity.ts` co do pola. Role są
kumulatywne i trzymane jako lista wartości; uprawnienia wynikają z ról
w `permissions.py`, żeby dołożenie roli nie wymagało migracji.
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

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


class ApiKey(models.Model):
    """Klucz API użytkownika.

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
