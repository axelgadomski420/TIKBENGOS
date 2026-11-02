# Trasy WebSocket.

Ścieżki są dobrane pod `NEXT_PUBLIC_REALTIME_URL`, który `scripts/deploy.sh`
zapisuje do `.env` jako `wss://$DOMAIN/ws`. Zmiana nazwy tutaj bez zmiany
tam zostawiłaby klienta celującego w adres, którego serwer nie zna.

Kształt drogi, którą przechodzi połączenie:
    klient  →  ws://HOST/ws/chat/
    Caddy   →  przekazuje /ws/* na usługę realtime (port 8001)
    uvicorn →  ProtocolTypeRouter z `tikbengos/asgi.py`
    trasa   →  „ws/chat/” poniżej
    consumer→  sprawdza tożsamość z sesji, zamyka kodem 4401 bez sesji

Dlaczego `ws/` jest w trasie, a nie tylko `/chat/`: Caddy przechwytuje
wszystko pod `/ws/*` i przekazuje bez zmian. Gdyby trasa tutaj była `/chat/`,
serwer szukałby `/chat/`, a dostawał `/ws/chat/` — i odpowiadał 404.
"""

from django.urls import path

from .consumers import ChatConsumer, PresenceConsumer

websocket_urlpatterns = [
    path("ws/chat/", ChatConsumer.as_asgi()),
    path("ws/presence/", PresenceConsumer.as_asgi()),
]
