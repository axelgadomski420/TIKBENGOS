"""Kanał WebSocket — szkielet czasu rzeczywistego.

Etap 1 celowo nie ma czatu. Ten consumer robi dokładnie jedną rzecz:
ustala tożsamość z sesji Django i utrzymuje połączenie otwarte, odpowiadając
na `ping`. Nie ma tu wiadomości, obecności ani statusów zadań — te pojawią
się w Etapie 4, razem z protokołem z `packages/core/src/chat.ts`.

Zasada, która obowiązuje już teraz i później: tożsamość pochodzi WYŁĄCZNIE
z ciasteczka sesji. Nic, co przychodzi w payloadzie, nie może jej zmienić —
inaczej dowolny klient podałby cudze `userId`.
"""

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class BaseConsumer(AsyncJsonWebsocketConsumer):
    """Wspólna obsługa tożsamości dla kanałów czasu rzeczywistego."""

    async def connect(self) -> None:
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            # 4401 to własny kod zamknięcia: „brak sesji”, nie „błąd serwera”.
            await self.close(code=4401)
            return

        self.user_id = str(user.pk)
        await self.accept()
        await self.send_json({"type": "ready", "userId": self.user_id})

    async def disconnect(self, code: int) -> None:
        pass

    async def receive_json(self, content: dict, **kwargs) -> None:
        kind = content.get("type")

        if kind == "ping":
            await self.send_json({"type": "pong"})
            return

        # Nieznany typ nie zamyka połączenia — klient z nowszą wersją
        # protokołu nie może wywalić serwera. Ale nic nie robimy w ciszy.
        await self.send_json(
            {"type": "error", "code": "unknown_type", "message": "Nieznany typ wiadomości."}
        )


class ChatConsumer(BaseConsumer):
    """Kanał czatu. Zarejestrowany, ale bez logiki wiadomości do Etapu 4."""


class PresenceConsumer(BaseConsumer):
    """Kanał obecności. Zarejestrowany, ale bez logiki do Etapu 4."""


@database_sync_to_async
def _noop() -> None:  # pragma: no cover - punkt zaczepienia dla Etapu 4
    return None
