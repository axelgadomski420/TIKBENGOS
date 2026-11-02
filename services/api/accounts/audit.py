"""Dziennik operacji.

Logowanie nigdy nie może wywalić żądania użytkownika — jeżeli zapis wpisu
zawiedzie, żądanie i tak ma się udać. Ale brak wpisu jest widoczny w bazie,
nie ukryty.
"""

import logging

from .models import AuditLog

logger = logging.getLogger(__name__)


def record(user, action: str, resource: str = "", metadata: dict | None = None) -> None:
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            resource=resource,
            metadata=metadata or {},
        )
    except Exception:  # pragma: no cover - ścieżka awaryjna
        logger.exception("Nie udało się zapisać wpisu audytu: %s", action)
