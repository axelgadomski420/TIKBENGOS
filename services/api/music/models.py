"""Muzyka — utwory i zadania generacji.

Model odpowiada kontraktowi packages/core/src/music.ts: Track z licencją
(unia zapisana jako JSON, bo warunki wag modeli różnią się między modelami
i nie da się ich uczciwie spłaszczyć do dwóch kolumn) oraz GenerationJob
w kształcie JobStatus z packages/core/src/api.ts.

Przechowywanie plików jest LOKALNE (MEDIA_ROOT), celowo: magazyn R2 dojdzie
z mediami i wtedy tylko storage backend się zmieni, a kontrakt nie ruszy się
o piksel. Udawanie R2 zanim istnieje byłoby gorsze niż szczery lokalny katalog.
"""

import uuid

from django.conf import settings
from django.db import models

# Limity z kontraktu i zdrowego rozsądku: tytuł 200 znaków, opis 4000
# (żądanie do modelu ma sens krótsze niż wpis na czat), plik audio 20 MB
# — sekwencer renderuje WAV mono 44.1 kHz, więc 20 MB to ~90 sekund i mieści
# każdy utwór z 4 zapętleń sekwencera.
TRACK_TITLE_MAX = 200
PROMPT_MAX = 4000
TRACKS_PAGE = 50
AUDIO_MAX_BYTES = 20 * 1024 * 1024
DURATION_MAX = 600

MODEL_CHOICES = [
    ("musicgen-small", "MusicGen small"),
    ("musicgen-medium", "MusicGen medium (GPU 16 GB)"),
    ("musicgen-melody", "MusicGen melody (GPU 16 GB)"),
    ("jasco", "JASCO (GPU)"),
    ("webaudio-sequencer", "Sekwencer BENGOS Beat (przeglądarka)"),
]

JOB_STATE_CHOICES = [
    ("queued", "W kolejce"),
    ("running", "Generowanie"),
    ("succeeded", "Gotowe"),
    ("failed", "Nieudane"),
    ("cancelled", "Anulowane"),
]


def default_licence() -> dict:
    """Licencja dla utworu z sekwencera — dzieło użytkownika, nie modelu.

    Utwór złożony w przeglądarce z własnych włączeń użytkownika nie ma
    warunków wag MusicGena, więc tu NIE ma noty o modelu. Przypisanie
    "commercialUseAllowed: True" jest uczciwe: to zwykłe dzieło autora.
    """
    return {
        "commercialUseAllowed": True,
        "attributionRequired": False,
        "notes": "Utwór stworzony sekwencercem BENGOS Beat w przeglądarce. Prawa należą do autora.",
    }


class Track(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="music_tracks"
    )
    title = models.CharField(max_length=TRACK_TITLE_MAX)
    # Prompt ma sens tylko dla utworów z modelu; sekwencer zostawia pusty —
    # puste pole mówi prawdę, nie "brak funkcji".
    prompt = models.TextField(blank=True, default="")
    model = models.CharField(max_length=30, choices=MODEL_CHOICES)
    duration_seconds = models.FloatField(default=0)
    audio = models.FileField(upload_to="music/%Y/%m/", null=True, blank=True)
    # Typ MIME trzymany obok pliku: FileResponse go potrzebuje, a zgadywanie
    # po rozszerzeniu zawodzi przy wav/renderowanych blobach.
    content_type = models.CharField(max_length=100, blank=True, default="")
    licence = models.JSONField(default=default_licence)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return self.title


class GenerationJob(models.Model):
    """Zadanie generacji — jeden kształt dla każdej długiej operacji.

    Zadanie w stanie queued bez workera GPU to stan PRAWDZIWY i tak jest
    opisany w interfejsie: "czeka na maszynę z GPU". Kłamałoby dopiero
    bieganie paska postępu, którego nikt nie liczy.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="music_jobs"
    )
    kind = models.CharField(max_length=30, default="music.generate")
    state = models.CharField(max_length=12, choices=JOB_STATE_CHOICES, default="queued")
    stage = models.CharField(max_length=120, blank=True, default="")
    progress = models.FloatField(default=0)
    error = models.JSONField(null=True, blank=True)
    result_ref = models.CharField(max_length=400, blank=True, default="")
    prompt = models.TextField(blank=True, default="")
    model = models.CharField(max_length=30, default="musicgen-small")
    duration_seconds = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def status(self) -> dict:
        """Kształt JobStatus z packages/core/src/api.ts, do słownika."""
        if self.state == "queued":
            return {"state": "queued", "position": None}
        if self.state == "running":
            return {"state": "running", "progress": self.progress, "stage": self.stage}
        if self.state == "succeeded":
            return {"state": "succeeded", "resultRef": self.result_ref}
        if self.state == "failed":
            return {
                "state": "failed",
                "error": self.error or {"code": "internal", "message": "Nieznany błąd generacji."},
            }
        return {"state": "cancelled"}
