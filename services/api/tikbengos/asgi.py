"""ASGI — punkt wejścia dla daphne, uvicorna i kanału czasu rzeczywistego.

Trasy HTTP obsługuje Django. Trasy WebSocket obsługuje `ProtocolTypeRouter`
poniżej — bez niego połączenie z `/ws/chat/` kończy się kodem 404, mimo że
kontener `realtime` raportuje stan „running”.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tikbengos.settings")

# Aplikacja HTTP musi powstać PRZED importem tras WebSocket: routing
# importuje `consumers`, który dotyka modeli, a modele potrzebują gotowych
# ustawień Django.
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from accounts.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # `AllowedHostsOriginValidator` pilnuje, żeby WebSocket przyjmować
        # tylko z hostów z ALLOWED_HOSTS. Bez niego dowolna strona mogłaby
        # otworzyć połączenie z ciasteczkiem sesji użytkownika.
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
