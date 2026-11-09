"""Czat — rozmowy, uczestnicy i wiadomości.

Model odpowiada `packages/core/src/chat.ts` co do nazw: Conversation,
ParticipantState jako ConversationMember (unreadCount, lastSeenAt; isLive
dojdzie z kanału obecności), Message z `kind` jako unią z kontraktu.

Pochodzi z TIKTAK (Conversation, ConvUser, Message) — to on obowiązuje,
tak jak mówi komentarz w kontrakcie. Zachowanie z TIKMESS, które zostaje
na później: obecność liczona po stronie odbiorcy i emoji jako reakcje.

`kind` jest polem JSON, a nie kolumną z wyborem, bo kontrakt mówi o UNII
typów (text, image, voice, sign, morse, system). Zapis całości unii w jednej
kolumnie znika jako problem: dodanie typu w kontrakcie nie wymaga migracji
bazy — tylko walidacji w schemacie wejścia.
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

# Limity z kontraktu i z zadań agenta: wiadomość tekstowa ma sens do 2000
# znaków (żądania do agenta kodu mają 4000 — wiadomość czatu jest krótsza
# z definicji, bo czat jest do rozmowy, nie do wklejania logów).
MESSAGE_BODY_MAX = 2000
CONVERSATIONS_PAGE = 50
MESSAGES_PAGE = 50


class Conversation(models.Model):
    """Rozmowa 1:1 albo grupa.

    `title` i `icon_url` mają sens tylko dla grupy: rozmowa 1:1 nosi nazwę
    drugiej osoby, więc trzymać jej w bazie oznaczałoby trzymać kopię
    danych, które zdezaktualizują się przy zmianie nazwy użytkownika.
    """

    KIND_CHOICES = [
        ("direct", "Rozmowa 1:1"),
        ("group", "Grupa"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=8, choices=KIND_CHOICES, default="direct")
    title = models.CharField(max_length=120, blank=True, default="")
    icon_url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    # `updated_at` rusza przy KAŻDEJ wiadomości, nie przy każdej zmianie
    # wiersza: to jest sygnał „rozmowa ożyła”, po którym sortuje się lista.
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:  # pragma: no cover - wygoda w panelu
        return self.title or f"{self.kind} {self.id}"


class ConversationMember(models.Model):
    """Uczestnik rozmowy i jego stan: nieprzeczytane i ostatnio widziany.

    `isLive` z kontraktu („czy ktoś ma rozmowę otwartą”) nie jest kolumną:
    to stan kanału obecności, nie bazy. Zapisywanie go w bazie kłamałoby
    w obie strony — ktoś z otwartą kartą w tle nie jest „na żywo”.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_memberships"
    )
    unread_count = models.PositiveIntegerField(default=0)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            # Jeden wiersz na parę (rozmowa, użytkownik) — bez tego dwa
            # równoległe żądania założenia rozmowy dałyby zdublowane
            # członkostwo i podwójne liczniki.
            models.UniqueConstraint(
                fields=["conversation", "user"], name="unique_member_per_conversation"
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.conversation_id}:{self.user_id}"


class Message(models.Model):
    """Wiadomość w rozmowie.

    Usuwanie jest MIĘKKIE (kolumna `deleted_at`), bo kontrakt ma
    `deletedAt`: usunięta wiadomość zostaje w historii jako fakt —
    „ktoś coś tu napisał i to usunął” jest częścią rozmowy, a dziura
    w numeracji niczego nie mówi.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages"
    )
    kind = models.JSONField(default=dict)
    reply_to = models.ForeignKey(
        "chat.Message",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.conversation_id}:{self.id}"


class DeviceKey(models.Model):
    """Publiczny klucz tożsamości i jednorazowe preklucze czatu.

    Prywatna połowa nigdy tu nie wchodzi. `prekeys` to lista
    ``{"id", "jwk"}`` — same klucze publiczne. Serwer zdejmuje jeden
    przy wysyłce, więc nie da się nim otworzyć drugiej wiadomości.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_device_key"
    )
    public_jwk = models.TextField()
    fingerprint = models.CharField(max_length=64)
    prekeys = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.fingerprint
