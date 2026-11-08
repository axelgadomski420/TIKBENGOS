"""Kształty asystenta — te same nazwy pól co packages/core/src/ai.ts."""

from datetime import datetime

from ninja import Schema


class AskIn(Schema):
    prompt: str


class AskOut(Schema):
    jobId: str
    channel: str
    model: str


class AssistantJobOut(Schema):
    id: str
    prompt: str
    answer: str
    state: str
    createdAt: datetime


class AssistantHistoryOut(Schema):
    items: list[AssistantJobOut]


class AssistantCompleteIn(Schema):
    """Raport workera LLM — dokładnie to, co oddaje usługa modelu.

    Pola poza state są opcjonalne: raport "running" niesie tylko postęp,
    "succeeded" WYMAGA answer (walidacja w endpoincie, nie schemacie,
    bo pusta odpowiedź to błąd stanu, nie kształtu).
    """

    state: str
    stage: str = ""
    progress: float = 0
    answer: str = ""
    error: str = ""
