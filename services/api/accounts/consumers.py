"""Kanał WebSocket — szkielet czasu rzeczywistego.

Etap 1 celowo nie ma czatu. Ten consumer robi dokładnie jedną rzecz:
ustala tożsamość z sesji Django i utrzymuje połączenie otwarte, odpowiadając
na `ping`. Nie ma tu wiadomości, obecności ani statusów zadań — te pojawią
się w Etapie 4, razem z protokołem z `packages/core/src/chat.ts`.

Zasada, która obowiązuje już teraz i później: tożsamość pochodzi WYŁĄCZNIE
z ciasteczka sesji. Nic, co przychodzi w payloadzie, nie może jej zmienić —
inaczej dowolny klient podałby cudze `userId`.

Wiadomości wychodzące mają stały kopertę: `{"type": ..., ...}`. Interfejs
czyta `type` i ignoruje nieznane rodzaje, więc dołożenie nowego typu
w Etapie 4 nie zepsuje starszego klienta.
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
        """Sprzątanie po rozłączeniu.

        Etap 1 nie ma grup ani subskrypcji, więc nie ma czego sprzątać.
        Metoda istnieje, bo Etap 4 dołoży tu wyjście z grup rozmów — a brak
        tej metody wtedy oznaczałby, że rozłączony użytkownik zostaje
        w grupie i dostaje wiadomości, których nie powinien.
        """

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
    """Kanał czatu. Zarejestrowany i połączony, ale bez logiki do Etapu 4.

    Świadomie nie ma tu nawet szkieletu wysyłania wiadomości. Wiadomość
    wymaga modelu uczestnika, uprawnień do rozmowy i kolejności — wszystko
    to jest w kontrakcie `packages/core/src/chat.ts`, ale nic z tego nie ma
    jeszcze tabeli. Zrobienie tu „na razie prosto” dałoby drugi protokół
    obok docelowego, a ten trzeba by potem usuwać.
    """


class PresenceConsumer(BaseConsumer):
    """Kanał obecności. Zarejestrowany, ale bez logiki do Etapu 4."""
