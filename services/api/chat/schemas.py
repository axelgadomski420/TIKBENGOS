"""Kształty czatu — te same nazwy pól co `packages/core/src/chat.ts`.

`reactions` i `translations` są w kontrakcie, więc są w odpowiedzi —
puste listy/słowniki, nie brak pól. Brak pola w odpowiedzi to inny błąd
niż puste pole: pierwszy łamie interfejs, drugi mówi prawdę o stanie.
"""

from datetime import datetime
from typing import Literal

from ninja import Schema

from feed.schemas import AuthorOut


class ParticipantStateOut(Schema):
    unreadCount: int
    # Póki kanał obecności nie raportuje otwartych rozmów, `isLive` jest
    # zawsze fałszywe — to jest prawda o stanie, nie brak implementacji
    # do ukrycia. Docelowo: obecność z `ws/presence/`.
    isLive: bool = False
    lastSeenAt: datetime | None


class SealBoxIn(Schema):
    userId: str = ""
    epk: str = ""
    iv: str = ""
    ct: str = ""
    prekeyId: str = ""


class MessageKindIn(Schema):
    """Tekst zostaje dla starych klientów. Nowa rozmowa idzie jako `sealed`.

    W `sealed` nie ma treści. Jest szyfrogram i koperty na klucz wiadomości.
    Obraz, głos, plik, migi i Morse siedzą w środku szyfrogramu, nie obok.
    """

    type: Literal["text", "sealed"]
    body: str = ""
    v: int = 1
    alg: str = ""
    fp: str = ""
    iv: str = ""
    ct: str = ""
    own: SealBoxIn | None = None
    boxes: list[SealBoxIn] = []


class CreateMessageIn(Schema):
    kind: MessageKindIn
    replyToId: str | None = None


class MessageOut(Schema):
    id: str
    conversationId: str
    senderId: str
    kind: dict
    replyToId: str | None
    reactions: list
    translations: dict
    createdAt: datetime
    deletedAt: datetime | None


class CreateConversationIn(Schema):
    kind: Literal["direct", "group"] = "direct"
    participantIds: list[str]
    title: str | None = None


class ConversationOut(Schema):
    id: str
    kind: Literal["direct", "group"]
    title: str | None
    iconUrl: str | None
    participantIds: list[str]
    self: ParticipantStateOut
    lastMessage: MessageOut | None
    updatedAt: datetime


class ConversationListOut(Schema):
    """Rozmowy użytkownika z mapą uczestników.

    Uczestnicy jadą obok — ten sam wzorzec co `authors` w feedzie: ta sama
    osoba występuje w wielu rozmowach, więc nadmiar w każdej pozycji to
    transfer bez treści. Bez mapy interfejs pokazywałby UUID zamiast nazwy.
    """

    items: list[ConversationOut]
    participants: dict[str, AuthorOut]


class MessageListOut(Schema):
    """Wiadomości malejąco pobierane, ale zwracane ROSNĄCO.

    Interfejs czyta rozmowę od góry do dołu, czyli od najstarszej
    niewczytanej. `hasMore` mówi, czy są starsze — stronicowanie idzie
    wstecz (`before`), bo rozmowa rośnie od dołu.
    """

    items: list[MessageOut]
    hasMore: bool


class PrekeyIn(Schema):
    id: str
    jwk: str


class DeviceKeyIn(Schema):
    publicJwk: str
    fingerprint: str


class PrekeysIn(Schema):
    prekeys: list[PrekeyIn]


class DeviceKeyOut(Schema):
    userId: str
    publicJwk: str
    fingerprint: str
    prekey: PrekeyIn | None = None
    prekeyCount: int = 0
