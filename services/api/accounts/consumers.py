"""Kanał WebSocket — szkielet czasu rzeczywistego.

Zasada, która obowiązuje od początku: tożsamość pochodzi WYŁĄCZNIE
z ciasteczka sesji. Nic, co przychodzi w payloadzie, nie może jej zmienić —
inaczej dowolny klient podałby cudze `userId`.

Wiadomości wychodzące mają stałą kopertę: `{"type": ..., ...}`. Interfejs
czyta `type` i ignoruje nieznane rodzaje, więc dołożenie nowego typu
nie zepsuje starszego klienta.

Etap 4 dołącza tu OSOBISTĄ SKRZYNKĘ: po połączeniu klient dołącza do grupy
`chat.{userId}`, do której REST (`chat/api.py`) pucha zdarzenia o nowych
wiadomościach. Kanał nie zapisuje nic — zapis idzie przez API z pełną
walidacją, CSRF i audytem. Kanał DOSTARCZA.
"""

from channels.generic.websocket import AsyncJsonWebsocketConsumer

# 4401 to własny kod zamknięcia: „brak sesji”, nie „błąd serwera”.
# Klient odróżnia je od zerwania sieci i nie próbuje ponownie.
CLOSE_NO_SESSION = 4401


class BaseConsumer(AsyncJsonWebsocketConsumer):
    """Wspólna obsługa tożsamości dla kanałów czasu rzeczywistego."""

    async def connect(self) -> None:
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=CLOSE_NO_SESSION)
            return

        self.user_id = str(user.pk)
        await self.accept()
        await self.send_json({"type": "ready", "userId": self.user_id})

    async def disconnect(self, code: int) -> None:
        """Sprzątanie po rozłączeniu. Klasy pochodne opuszczają tu swoje grupy."""

    async def receive_json(self, content: dict, **kwargs) -> None:
        kind = content.get("type")

        if kind == "ping":
            await self.send_json({"type": "pong"})
            return

        # Nieznany typ nie zamyka połączenia — klient z nowszą wersją
        # protokołu nie może wywalić serwera. Ale nie milczymy: odpowiadamy
        # błędem, żeby dało się to zdiagnozować z przeglądarki.
        await self.send_json(
            {"type": "error", "code": "unknown_type", "message": "Nieznany typ wiadomości."}
        )


class ChatConsumer(BaseConsumer):
    """Kanał czatu — osobista skrzynka zdarzeń od Etapu 4.

    Zapis wiadomości idzie przez REST (`chat/api.py`) — tam są walidacja,
    CSRF i dziennik audytu. Ten kanał robi jedną rzecz: dołącza do grupy
    `chat.{userId}` i przekazuje dalej to, co serwer do niej wrzuci.
    Nic, co przychodzi od klienta, nie jest tu zapisywane.

    Protokół wychodzący: `{"type": "message.new", "message": {...}}`.
    Typ zdarzenia z `group_send` (`chat.message`) mapuje się na metodę
    `chat_message` — kropka zamienia się w podkreślenie, to konwencja
    Channels, nie nasz wybór.
    """

    async def connect(self) -> None:
        await super().connect()
        # Grupa doklejana TYLKO po udanym accept: bez sesji baza zamyka
        # połączenie i grupa nie powstaje.
        if getattr(self, "user_id", None):
            await self.channel_layer.group_add("chat." + self.user_id, self.channel_name)

    async def disconnect(self, code: int) -> None:
        # Bez tego rozłączony użytkownik zostawałby w grupie i dostawał
        # zdarzenia, których nikt nie odbiera.
        if getattr(self, "user_id", None):
            await self.channel_layer.group_discard("chat." + self.user_id, self.channel_name)

    async def chat_message(self, event: dict) -> None:
        """Zdarzenie z REST: nowa wiadomość w jednej z rozmów odbiorcy."""
        await self.send_json({"type": "message.new", "message": event["message"]})


class PresenceConsumer(BaseConsumer):
    """Kanał obecności. Zarejestrowany, ale bez logiki do końca Etapu 4."""
