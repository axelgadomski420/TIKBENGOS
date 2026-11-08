"""Asystent — zadania pytań do modelu LLM.

Model odpowiada kontraktowi packages/core/src/ai.ts: AssistantJob to
zadanie z pytaniem i odpowiedzią, z unią JobStatus jako widok stanu.
Odpowiedź NIGDY nie powstaje w procesie API — API nie ma wag modelu
i nie udaje, że ma. Zlecenie odchodzi do workera (ASSISTANT_LLM_ENDPOINT),
odpowiedź wraca endpointem zwrotnym z sekretem BENGOS_WORKER_TOKEN.
"""

import uuid

from django.conf import settings
from django.db import models

# Z kontraktu ai.ts: tyle znaków mieści pytanie i odpowiedź; tyle pozycji
# mieści strona historii. Limity są po stronie serwera, bo interfejs
# tylko je POKAZUJE (maxlength), a nie egzekwuje.
PROMPT_MAX = 4000
ANSWER_MAX = 20000
HISTORY_PAGE = 30


class AssistantJob(models.Model):
    """Zadanie asystenta — pytanie, stan i odpowiedź.

    Stan trzymany jest w kolumnach prostych, bo kształt unii JobStatus
    buduje metoda status(): dodanie wariantu to zmiana metody, nie migracja.
    Odpowiedź jest pusta dopóki worker jej nie odda — pusta odpowiedź po
    sukcesie byłaby niemożliwa, bo endpoint zwrotny wymaga answer.
    """

    STATE_CHOICES = [
        ("queued", "W kolejce"),
        ("running", "Myśli"),
        ("succeeded", "Gotowe"),
        ("failed", "Nieudane"),
        ("cancelled", "Anulowane"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_jobs"
    )
    prompt = models.TextField()
    answer = models.TextField(blank=True, default="")
    state = models.CharField(max_length=12, choices=STATE_CHOICES, default="queued")
    stage = models.CharField(max_length=120, blank=True, default="")
    progress = models.FloatField(default=0)
    error = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def status(self) -> dict:
        """Unia JobStatus z kontraktu — dokładnie te warianty, nic więcej."""
        if self.state == "queued":
            return {"state": "queued", "position": None}
        if self.state == "running":
            return {"state": "running", "stage": self.stage, "progress": self.progress}
        if self.state == "succeeded":
            return {
                "state": "succeeded",
                # Odpowiedź czyta historia i endpoint zadania; resultRef
                # wskazuje tę samą drogę, żeby klient miał jedno miejsce.
                "resultRef": "/api/ai/jobs/" + str(self.id),
            }
        if self.state == "cancelled":
            return {"state": "cancelled"}
        return {
            "state": "failed",
            "error": self.error or {"code": "internal", "message": "Zadanie nieudane."},
        }
