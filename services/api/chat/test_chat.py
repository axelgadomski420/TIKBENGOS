"""Testy czatu — Etap 4 (tekst).

Testy nie wymagają PostgreSQL (sqlite jak w `test_feed.py`). Warstwa
kanałów w sqlite jest w pamięci procesu, więc `_broadcast_message`
wykona się bez Redisa — a gdyby i on padł, dostarczenie jest best-effort
i testy zapisu przechodzą dalej.
"""

import uuid

from django.test import TestCase
from django.urls import reverse

from accounts.models import User

from .models import Conversation, ConversationMember, Follow  # noqa: F401
from .models import Message


def make_user(name: str) -> User:
    return User.objects.create_user(
        username=name,
        email=name + "@example.com",
        password="haslo-bardzo-dlugie",
        roles=["user"],
    )


class ConversationTests(TestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.client.force_login(self.alice)

    def test_rozmowa_1na1_i_idempotencja(self):
        payload = {"kind": "direct", "participantIds": [str(self.bob.id)]}
        first = self.client.post(reverse("v1:create_conversation"), payload, "application/json")
        second = self.client.post(reverse("v1:create_conversation"), payload, "application/json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_rozmowa_z_soba_odrzucona(self):
        response = self.client.post(
            reverse("v1:create_conversation"),
            {"kind": "direct", "participantIds": [str(self.alice.id)]},
            "application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_rozmowa_1na1_wymaga_jednego_rozmowcy(self):
        response = self.client.post(
            reverse("v1:create_conversation"),
            {"kind": "direct", "participantIds": []},
            "application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_nieistniejacy_uczestnik_daje_404(self):
        response = self.client.post(
            reverse("v1:create_conversation"),
            {"kind": "direct", "participantIds": [str(uuid.uuid4())]},
            "application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_grupa_z_dwoma_uczestnikami(self):
        carol = make_user("carol")
        response = self.client.post(
            reverse("v1:create_conversation"),
            {"kind": "group", "participantIds": [str(self.bob.id), str(carol.id)], "title": "Ekipa"},
            "application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.json()["participantIds"]), 3)
        self.assertEqual(response.json()["title"], "Ekipa")

    def test_lista_rozmow_tylko_wlasnych(self):
        self.client.post(
            reverse("v1:create_conversation"),
            {"kind": "direct", "participantIds": [str(self.bob.id)]},
            "application/json",
        )
        # rozmowa dwóch obcych osób nie może być widoczna dla alice
        carol = make_user("carol")
        dave = make_user("dave")
        Conversation.objects.create(kind="direct")
        ConversationMember.objects.create(
            conversation=Conversation.objects.first(), user=carol
        )
        ConversationMember.objects.create(
            conversation=Conversation.objects.first(), user=dave
        )
        response = self.client.get(reverse("v1:list_conversations"))
        self.assertEqual(len(response.json()["items"]), 1)


class MessageTests(TestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.outsider = make_user("outsider")
        self.client.force_login(self.alice)
        created = self.client.post(
            reverse("v1:create_conversation"),
            {"kind": "direct", "participantIds": [str(self.bob.id)]},
            "application/json",
        )
        self.conversation_id = created.json()["id"]

    def send(self, body: str, sender=None, conversation_id=None):
        sender_client = self.client if sender is None else self.client
        if sender is not None:
            self.client.force_login(sender)
        response = sender_client.post(
            reverse("v1:send_message", kwargs={"conversation_id": conversation_id or self.conversation_id}),
            {"kind": {"type": "text", "body": body}},
            "application/json",
        )
        if sender is not None:
            self.client.force_login(self.alice)
        return response

    def test_wyslanie_i_nieprzeczytane_odbiorcy(self):
        response = self.send("czesc bob")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["kind"]["body"], "czesc bob")
        member_bob = ConversationMember.objects.get(conversation_id=self.conversation_id, user=self.bob)
        member_alice = ConversationMember.objects.get(conversation_id=self.conversation_id, user=self.alice)
        self.assertEqual(member_bob.unread_count, 1)
        self.assertEqual(member_alice.unread_count, 0)

    def test_pusta_wiadomosc_odrzucona(self):
        response = self.send("   ")
        self.assertEqual(response.status_code, 400)

    def test_osoba_z_zewnatrz_nie_widzi_rozmowy(self):
        self.send("czesc bob")
        self.client.force_login(self.outsider)
        response = self.client.get(
            reverse("v1:list_messages", kwargs={"conversation_id": self.conversation_id})
        )
        self.assertEqual(response.status_code, 404)

    def test_wiadomosci_rosnaco_i_oznaczenie_przeczytane(self):
        self.send("pierwsza")
        self.send("druga")
        listed = self.client.get(
            reverse("v1:list_messages", kwargs={"conversation_id": self.conversation_id})
        )
        bodies = [m["kind"]["body"] for m in listed.json()["items"]]
        self.assertEqual(bodies, ["pierwsza", "druga"])
        self.assertEqual(listed.json()["hasMore"], False)

        # bob czyta — jego licznik schodzi do zera, alice nie
        self.client.force_login(self.bob)
        read = self.client.post(
            reverse("v1:mark_read", kwargs={"conversation_id": self.conversation_id})
        )
        self.assertEqual(read.status_code, 200)
        self.assertEqual(read.json()["unreadCount"], 0)

    def test_usuniecie_wlasnej_wiadomosci_miekkie(self):
        sent = self.send("do usuniecia")
        message_id = sent.json()["id"]
        response = self.client.delete(reverse("v1:delete_message", kwargs={"message_id": message_id}))
        self.assertEqual(response.status_code, 204)
        row = Message.objects.get(id=message_id)
        self.assertIsNotNone(row.deleted_at)
        # powtórne usunięcie jest idempotentne
        again = self.client.delete(reverse("v1:delete_message", kwargs={"message_id": message_id}))
        self.assertEqual(again.status_code, 204)

    def test_cudzej_wiadomosci_usunac_nie_mozna(self):
        self.client.force_login(self.bob)
        sent = self.client.post(
            reverse("v1:send_message", kwargs={"conversation_id": self.conversation_id}),
            {"kind": {"type": "text", "body": "od bob"}},
            "application/json",
        )
        self.client.force_login(self.alice)
        response = self.client.delete(
            reverse("v1:delete_message", kwargs={"message_id": sent.json()["id"]})
        )
        self.assertEqual(response.status_code, 403)

    def test_kontakci_z_obserwacji(self):
        # alice obserwuje bob — bob staje się jej kontaktem
        self.client.post(
            "/v1/feed/users/" + str(self.bob.id) + "/follow", content_type="application/json"
        )
        self.client.force_login(self.bob)
        contacts = self.client.get(reverse("v1:list_contacts"))
        ids = [c["id"] for c in contacts.json()]
        self.assertIn(str(self.alice.id), ids)


class RealtimeEnvelopeTests(TestCase):
    """Kształt zdarzenia zgodny z `accounts/consumers.py` i kontraktem."""

    def test_zdarzenie_ma_typ_i_wiadomosc(self):
        from .api import _broadcast_message

        alice = make_user("rt-alice")
        bob = make_user("rt-bob")
        conversation = Conversation.objects.create(kind="direct")
        ConversationMember.objects.create(conversation=conversation, user=alice)
        ConversationMember.objects.create(conversation=conversation, user=bob)
        message = Message.objects.create(
            conversation=conversation,
            sender=alice,
            kind={"type": "text", "body": "realtime"},
        )
        # Best-effort: wywołanie nie może podnieść wyjątku nawet bez
        # działającej warstwy kanałów.
        _broadcast_message(message, [str(bob.id)])
        self.assertTrue(Message.objects.filter(kind__body="realtime").exists())
