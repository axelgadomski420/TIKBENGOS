"""Endpointy czatu.

Zapis wiadomości idzie przez REST, nie przez WebSocket — z jednego powodu:
REST ma pełną walidację, CSRF i dziennik audytu. Kanał WS służy wyłącznie
do DOSTARCZANIA zdarzenia o nowej wiadomości (osobista grupa `chat.{userId}`
w `accounts/consumers.py`). Wzorzec „zapis przez API, powiadomienie przez
kanał” jest świadomym wyborem, nie kompromisem: pisanie do bazy z consumera
pominęłoby walidację schematu i audyt.

Dostęp do cudzej rozmowy zwraca 404, nie 403: odpowiedź 403 mówi, że
rozmowa ISTNIEJE, a to już jest informacja o cudzej prywatności.
"""

import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from accounts.api import current_user
from accounts.audit import record
from accounts.models import User
from accounts.schemas import ErrorOut
from feed.models import Follow
from feed.schemas import AuthorOut

from .models import (
    CONVERSATIONS_PAGE,
    MESSAGE_BODY_MAX,
    MESSAGES_PAGE,
    Conversation,
    ConversationMember,
    DeviceKey,
    Message,
)
from .schemas import (
    ConversationListOut,
    ConversationOut,
    CreateConversationIn,
    CreateMessageIn,
    DeviceKeyIn,
    DeviceKeyOut,
    MessageListOut,
    MessageOut,
    ParticipantStateOut,
    PrekeysIn,
)

router = Router(tags=["chat"])


def _author(user: User) -> dict:
    """Uczestnik w postaci publicznej. Bez adresu email — jak w feedzie."""
    return {
        "id": str(user.id),
        "username": user.username,
        "displayName": user.display_name or None,
        "avatarUrl": user.avatar_url or None,
    }


def _state(member: ConversationMember) -> dict:
    return {
        "unreadCount": member.unread_count,
        # Fałsz z wyjaśnieniem w schemacie: obecność dojdzie z kanału.
        "isLive": False,
        "lastSeenAt": member.last_seen_at,
    }


def _message(row: Message) -> dict:
    return {
        "id": str(row.id),
        "conversationId": str(row.conversation_id),
        "senderId": str(row.sender_id),
        "kind": row.kind or {"type": "text", "body": ""},
        "replyToId": str(row.reply_to_id) if row.reply_to_id else None,
        "reactions": [],
        "translations": {},
        "createdAt": row.created_at,
        "deletedAt": row.deleted_at,
    }


def _conversation(
    conversation: Conversation,
    member: ConversationMember,
    members: list[ConversationMember],
    last_message: Message | None,
) -> dict:
    return {
        "id": str(conversation.id),
        "kind": conversation.kind,
        "title": conversation.title or None,
        "iconUrl": conversation.icon_url or None,
        "participantIds": [str(m.user_id) for m in members],
        "self": _state(member),
        "lastMessage": _message(last_message) if last_message else None,
        "updatedAt": conversation.updated_at,
    }


def _member_or_404(conversation_id: str, user: User) -> ConversationMember:
    member = (
        ConversationMember.objects.filter(conversation_id=conversation_id, user=user)
        .select_related("conversation")
        .first()
    )
    if member is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tej rozmowy."})
    return member


SEALED_CT_MAX = 1_200_000


def _box(box) -> dict:
    return {
        "userId": box.userId,
        "epk": box.epk,
        "iv": box.iv,
        "ct": box.ct,
        "prekeyId": box.prekeyId,
    }


def _persist_kind(kind) -> dict:
    if kind.type == "text":
        body = (kind.body or "").strip()
        if not body:
            raise HttpError(
                400, {"code": "bad_request", "message": "Wiadomość nie może być pusta.", "field": "body"}
            )
        if len(body) > MESSAGE_BODY_MAX:
            raise HttpError(
                400,
                {
                    "code": "bad_request",
                    "message": f"Wiadomość może mieć najwyżej {MESSAGE_BODY_MAX} znaków.",
                    "field": "body",
                },
            )
        return {"type": "text", "body": body}

    if not kind.ct or not kind.iv or kind.own is None or not kind.own.ct or not kind.own.epk:
        raise HttpError(
            400,
            {"code": "bad_request", "message": "Pieczęć jest niekompletna.", "field": "kind"},
        )
    if len(kind.ct) > SEALED_CT_MAX:
        raise HttpError(
            400,
            {"code": "bad_request", "message": "Zaszyfrowana wiadomość jest za duża.", "field": "ct"},
        )
    for box in kind.boxes:
        if not box.userId or not box.epk or not box.iv or not box.ct:
            raise HttpError(
                400,
                {"code": "bad_request", "message": "Koperta odbiorcy jest niekompletna.", "field": "boxes"},
            )
    return {
        "type": "sealed",
        "v": 1,
        "alg": kind.alg or "P256-HKDF-A256GCM",
        "fp": kind.fp,
        "iv": kind.iv,
        "ct": kind.ct,
        "own": _box(kind.own),
        "boxes": [_box(box) for box in kind.boxes],
    }


def _device_out(row: DeviceKey, prekey: dict | None = None) -> dict:
    return {
        "userId": str(row.user_id),
        "publicJwk": row.public_jwk,
        "fingerprint": row.fingerprint,
        "prekey": prekey,
        "prekeyCount": len(row.prekeys or []),
    }


def _broadcast_message(message: Message, recipients: list[str]) -> None:
    """Pcha zdarzenie o wiadomości do osobistych grup członków.

    Dostarczenie jest BEST-EFFORT: trwałość niosą baza i REST, kanał tylko
    przyspiesza. Gdy warstwa kanałów jest niedostępna, wiadomość i tak
    wróci przy następnym wczytaniu rozmowy — milczenie błędu tu nie jest
    ukrywaniem awarii, tylko decyzją o tym, co jest źródłem prawdy.
    """
    try:
        layer = get_channel_layer()
        if layer is None:
            return
        event = {"type": "chat.message", "message": _message(message)}
        for user_id in recipients:
            async_to_sync(layer.group_send)("chat." + str(user_id), event)
    except Exception:  # noqa: BLE001 - patrz komentarz o best-effort
        pass


@router.get("/conversations", response={200: ConversationListOut, 401: ErrorOut})
def list_conversations(request):
    """Rozmowy użytkownika, od ostatnio ożytej.

    Ostatnia wiadomość jest pobierana osobno per rozmowa (N+1 przy limicie
    50): agregacja okna `DISTINCT ON` jest Postgresowa, a testy i pierwsze
    uruchomienie chodzą na sqlite. Przy 50 rozmowach i indeksie na
    `created_at` koszt jest pomijalny, a zapytanie przenośne.
    """
    user = current_user(request)
    memberships = list(
        ConversationMember.objects.filter(user=user)
        .select_related("conversation")
        .order_by("-conversation__updated_at")[:CONVERSATIONS_PAGE]
    )
    conversation_ids = [m.conversation_id for m in memberships]

    members_by_conversation: dict = {}
    participants: dict[str, dict] = {}
    for member in ConversationMember.objects.filter(conversation_id__in=conversation_ids).select_related("user"):
        members_by_conversation.setdefault(member.conversation_id, []).append(member)
        participants[str(member.user_id)] = _author(member.user)

    last_messages = {}
    for conversation_id in conversation_ids:
        last_messages[conversation_id] = (
            Message.objects.filter(conversation_id=conversation_id).order_by("-created_at").first()
        )

    items = [
        _conversation(
            m.conversation,
            m,
            members_by_conversation.get(m.conversation_id, []),
            last_messages.get(m.conversation_id),
        )
        for m in memberships
    ]
    return 200, {"items": items, "participants": participants}


@router.post(
    "/conversations",
    response={200: ConversationOut, 201: ConversationOut, 400: ErrorOut, 401: ErrorOut, 404: ErrorOut},
)
def create_conversation(request, payload: CreateConversationIn):
    """Zakładanie rozmowy. 1:1 jest IDEMPOTENTNA: para osób ma JEDNĄ rozmowę.

    Powtórne założenie wraca z 200 i istniejącą rozmową, a nie z błędem —
    dwa razy kliknięty przycisk „Napisz” nie może zrobić dwóch wątków
    z tą samą osobą. Grupa może istnieć wielokrotnie — to inne rozmowy.
    """
    user = current_user(request)

    ids: list[uuid.UUID] = []
    for raw in payload.participantIds or []:
        try:
            parsed = uuid.UUID(raw)
        except ValueError:
            raise HttpError(
                400,
                {
                    "code": "bad_request",
                    "message": "Identyfikator użytkownika jest nieprawidłowy.",
                    "field": "participantIds",
                },
            )
        if parsed not in ids:
            ids.append(parsed)

    users = {u.id: u for u in User.objects.filter(id__in=ids + [user.id])}
    if any(pid not in users for pid in ids):
        raise HttpError(
            404, {"code": "not_found", "message": "Nie znaleziono któregoś z użytkowników."}
        )

    if payload.kind == "direct":
        if len(ids) != 1:
            raise HttpError(
                400,
                {
                    "code": "bad_request",
                    "message": "Rozmowa 1:1 wymaga dokładnie jednego rozmówcy.",
                    "field": "participantIds",
                },
            )
        if ids[0] == user.id:
            raise HttpError(
                400,
                {
                    "code": "bad_request",
                    "message": "Nie możesz zacząć rozmowy z samym sobą.",
                    "field": "participantIds",
                },
            )

        existing = (
            Conversation.objects.filter(kind="direct", memberships__user=user)
            .filter(memberships__user_id=ids[0])
            .first()
        )
        if existing is not None:
            member = ConversationMember.objects.get(conversation=existing, user=user)
            members = list(ConversationMember.objects.filter(conversation=existing))
            last = Message.objects.filter(conversation=existing).order_by("-created_at").first()
            return 200, _conversation(existing, member, members, last)

        with transaction.atomic():
            conversation = Conversation.objects.create(kind="direct")
            members = [
                ConversationMember.objects.create(conversation=conversation, user=user),
                ConversationMember.objects.create(conversation=conversation, user=users[ids[0]]),
            ]
        record(user, "chat.conversation.create", resource=str(conversation.id))
        return 201, _conversation(conversation, members[0], members, None)

    # Grupa. Własny identyfikator w `participantIds` jest ignorowany, nie
    # karany: założyciel jest członkiem z definicji, więc żądanie z nim
    # niesie tę samą intencję co bez niego.
    if not ids:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Grupa wymaga co najmniej jednego uczestnika.",
                "field": "participantIds",
            },
        )

    title = (payload.title or "").strip()[:120]
    with transaction.atomic():
        conversation = Conversation.objects.create(kind="group", title=title)
        members = [ConversationMember.objects.create(conversation=conversation, user=user)]
        for pid in ids:
            if pid == user.id:
                continue
            members.append(
                ConversationMember.objects.create(conversation=conversation, user=users[pid])
            )
    record(user, "chat.conversation.create", resource=str(conversation.id))
    return 201, _conversation(conversation, members[0], members, None)


@router.get(
    "/conversations/{conversation_id}/messages",
    response={200: MessageListOut, 400: ErrorOut, 401: ErrorOut, 404: ErrorOut},
)
def list_messages(request, conversation_id: str, before: str | None = None, limit: int = MESSAGES_PAGE):
    """Wiadomości rozmowy, najpierw najnowsze, oddane od najstarszej.

    `before` to identyfikator wiadomości-odsiaki: starsze niż ona. Wstecz,
    bo rozmowa rośnie od dołu i starsze strony doczytuje się do góry.
    """
    member = _member_or_404(conversation_id, current_user(request))
    wanted = max(1, min(limit, MESSAGES_PAGE * 2))

    query = Message.objects.filter(conversation=member.conversation).order_by("-created_at")
    if before:
        anchor = Message.objects.filter(id=before).first()
        if anchor is None:
            raise HttpError(
                400,
                {"code": "bad_request", "message": "Punkt odniesienia nie istnieje.", "field": "before"},
            )
        query = query.filter(created_at__lt=anchor.created_at)

    rows = list(query[: wanted + 1])
    has_more = len(rows) > wanted
    # Od najstarszej: wątek czyta się od góry ekranu do dołu.
    return 200, {"items": [_message(row) for row in reversed(rows[:wanted])], "hasMore": has_more}


@router.post(
    "/conversations/{conversation_id}/messages",
    response={201: MessageOut, 400: ErrorOut, 401: ErrorOut, 404: ErrorOut},
)
def send_message(request, conversation_id: str, payload: CreateMessageIn):
    """Wysłanie wiadomości tekstowej.

    Nieprzeczytane rosną u wszystkich POZA nadawcą — w jednej transakcji
    z wiadomością, żeby licznik i wątek nie rozjechały się przy błędzie.
    `isLive` („odbiorca patrzy na ekran, nie licz nieprzeczytanych”)
    dojdzie z kanału obecności — teraz licznik rośnie zawsze, co jest
    prawdą zachowawczą, nie zmyśleniem.
    """
    user = current_user(request)
    member = _member_or_404(conversation_id, user)
    stored = _persist_kind(payload.kind)

    reply_to = None
    if payload.replyToId:
        reply_to = Message.objects.filter(id=payload.replyToId, conversation=member.conversation).first()
        if reply_to is None:
            raise HttpError(
                404,
                {"code": "not_found", "message": "Nie znaleziono wiadomości, na którą odpowiadasz."},
            )

    with transaction.atomic():
        message = Message.objects.create(
            conversation=member.conversation,
            sender=user,
            kind=stored,
            reply_to=reply_to,
        )
        Conversation.objects.filter(id=member.conversation_id).update(updated_at=timezone.now())
        ConversationMember.objects.filter(conversation=member.conversation).exclude(user=user).update(
            unread_count=F("unread_count") + 1
        )

    record(user, "chat.message.create", resource=str(message.id))

    recipients = list(
        ConversationMember.objects.filter(conversation=member.conversation)
        .exclude(user=user)
        .values_list("user_id", flat=True)
    )
    _broadcast_message(message, [str(uid) for uid in recipients])

    return 201, _message(message)


@router.post(
    "/conversations/{conversation_id}/read",
    response={200: ParticipantStateOut, 401: ErrorOut, 404: ErrorOut},
)
def mark_read(request, conversation_id: str):
    """Oznacza rozmowę za przeczytaną. Idempotentne."""
    member = _member_or_404(conversation_id, current_user(request))
    member.unread_count = 0
    member.last_seen_at = timezone.now()
    member.save(update_fields=["unread_count", "last_seen_at"])
    return 200, _state(member)


@router.delete("/messages/{message_id}", response={204: None, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def delete_message(request, message_id: str):
    """Miękkie usunięcie własnej wiadomości — `deletedAt` z kontraktu.

    Może usunąć tylko nadawca. Moderator może usuwać wpisy w feedzie
    (`post.delete.any`), ale rozmowa jest prywatna: „usunięte przez
    moderatora” w prywatnym wątku byłoby wglądem w cudzą rozmowę.
    Powtórne usunięcie zwraca 204 — operacja jest idempotentna.
    """
    user = current_user(request)
    message = (
        Message.objects.select_related("conversation").filter(id=message_id).first()
    )
    if message is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tej wiadomości."})

    if message.sender_id != user.id:
        raise HttpError(
            403,
            {"code": "forbidden", "message": "Możesz usunąć tylko własną wiadomość."},
        )

    if message.deleted_at is None:
        message.deleted_at = timezone.now()
        message.save(update_fields=["deleted_at"])
        record(user, "chat.message.delete", resource=str(message.id))

    return 204, None


@router.get("/contacts", response={200: list[AuthorOut], 401: ErrorOut})
def list_contacts(request):
    """Osoby, z którymi użytkownik ma już relację: obserwuje lub jest obserwowany.

    To jest uczciwe źródło kontaktów na dziś: bez wyszukiwarki ludzi
    (Etap 2, indeks nazw) jedyną osobą, z którą ma sens zacząć rozmowę,
    jest ktoś, z kim istnieje już połączenie w feedzie. Pusta lista
    znaczy „nikogo jeszcze nie obserwujesz” — nie „funkcja nie działa”.
    """
    user = current_user(request)
    followed = set(Follow.objects.filter(follower=user).values_list("followed_id", flat=True))
    followers = set(Follow.objects.filter(followed=user).values_list("follower_id", flat=True))
    ids = (followed | followers) - {user.id}
    return 200, [_author(u) for u in User.objects.filter(id__in=ids)[:CONVERSATIONS_PAGE]]


@router.put("/device", response={200: DeviceKeyOut, 400: ErrorOut, 401: ErrorOut})
def put_device_key(request, payload: DeviceKeyIn):
    """Zapisuje klucz publiczny tego urządzenia. Prywatnego tu nie ma."""
    user = current_user(request)
    public = (payload.publicJwk or "").strip()
    fingerprint = (payload.fingerprint or "").strip()
    if len(public) < 20 or len(fingerprint) != 64:
        raise HttpError(
            400, {"code": "bad_request", "message": "Klucz urządzenia jest niekompletny.", "field": "publicJwk"}
        )
    row, _created = DeviceKey.objects.get_or_create(
        user=user,
        defaults={"public_jwk": public, "fingerprint": fingerprint, "prekeys": []},
    )
    row.public_jwk = public
    row.fingerprint = fingerprint
    row.save(update_fields=["public_jwk", "fingerprint", "updated_at"])
    return 200, _device_out(row)


@router.post("/device/prekeys", response={200: DeviceKeyOut, 400: ErrorOut, 401: ErrorOut})
def add_prekeys(request, payload: PrekeysIn):
    """Dokłada jednorazowe preklucze. Nie kasuje tych, których jeszcze nikt nie wziął."""
    user = current_user(request)
    row = DeviceKey.objects.filter(user=user).first()
    if row is None:
        raise HttpError(400, {"code": "bad_request", "message": "Najpierw zapisz klucz urządzenia.", "field": "prekeys"})
    current = list(row.prekeys or [])
    known = {item.get("id") for item in current if isinstance(item, dict)}
    for item in payload.prekeys:
        if item.id in known or not item.jwk:
            continue
        current.append({"id": item.id, "jwk": item.jwk})
        known.add(item.id)
        if len(current) >= 40:
            break
    row.prekeys = current
    row.save(update_fields=["prekeys", "updated_at"])
    return 200, _device_out(row)


@router.get("/device/{user_id}", response={200: DeviceKeyOut, 401: ErrorOut, 404: ErrorOut})
def get_device_key(request, user_id: str):
    current_user(request)
    row = DeviceKey.objects.filter(user_id=user_id).first()
    if row is None:
        raise HttpError(404, {"code": "not_found", "message": "Ta osoba nie ma jeszcze klucza czatu."})
    return 200, _device_out(row)


@router.post("/device/{user_id}/take", response={200: DeviceKeyOut, 401: ErrorOut, 404: ErrorOut})
def take_prekey(request, user_id: str):
    """Zdejmuje jeden preklucz. Drugi nadawca już go nie dostanie."""
    current_user(request)
    with transaction.atomic():
        row = DeviceKey.objects.filter(user_id=user_id).first()
        if row is None:
            raise HttpError(404, {"code": "not_found", "message": "Ta osoba nie ma jeszcze klucza czatu."})
        current = list(row.prekeys or [])
        prekey = current.pop(0) if current else None
        row.prekeys = current
        row.save(update_fields=["prekeys", "updated_at"])
    return 200, _device_out(row, prekey if isinstance(prekey, dict) else None)
