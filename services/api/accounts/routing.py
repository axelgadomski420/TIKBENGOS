"""Trasy WebSocket.

Ścieżki są dobrane tak, żeby pasowały do `NEXT_PUBLIC_REALTIME_URL`,
który `scripts/deploy.sh` zapisuje jako `wss://$DOMAIN/ws`.
"""

from django.urls import path

from .consumers import ChatConsumer, PresenceConsumer

websocket_urlpatterns = [
    path("ws/chat/", ChatConsumer.as_asgi()),
    path("ws/presence/", PresenceConsumer.as_asgi()),
]
