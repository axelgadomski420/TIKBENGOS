"""Trasy WebSocket.

Ścieżki są dobrane pod `NEXT_PUBLIC_REALTIME_URL`, który `scripts/deploy.sh`
zapisuje do `.env` jako `wss://$DOMAIN/ws`. Zmiana nazwy tutaj bez zmiany
tam zostawiłaby klienta celującego w adres, którego serwer nie zna.
"""

from django.urls import path

from .consumers import ChatConsumer, PresenceConsumer

websocket_urlpatterns = [
    path("ws/chat/", ChatConsumer.as_asgi()),
    path("ws/presence/", PresenceConsumer.as_asgi()),
]
