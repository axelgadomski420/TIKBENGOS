"""ASGI — punkt wejścia dla daphne i kanału czasu rzeczywistego."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tikbengos.settings")
application = get_asgi_application()
