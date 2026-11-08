"""Endpointy muzyki — montowane pod /music (prefiks z API.music).

Trzy uczciwe prawdy tego modułu, wbudowane w endpointy:

1. Generacja MusicGen/JASCO wymaga workera z GPU. Bez MUSICGEN_ENDPOINT
   zadanie powstaje i CZEKA — a interfejs mówi to wprost. Nie ma spinnera,
   który udaje postęp.
2. Sekwencer BENGOS Beat działa w przeglądarce i daje REALNY utwór już
   dziś — upload idzie przez ten sam endpoint i ten sam model Track.
3. Licencja utworu zależy od jego pochodzenia: sekwencer to dzieło autora,
   MusicGen ma warunki wag modelu. Pole licence niesie to rozróżnienie.
"""

import json
import urllib.error
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import FileResponse
from django.utils import timezone
from ninja import File, Form, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from accounts.api import current_user
from accounts.audit import record
from accounts.schemas import ErrorOut

from .models import (
    AUDIO_MAX_BYTES,
    DURATION_MAX,
    MODEL_CHOICES,
    PROMPT_MAX,
    TRACK_TITLE_MAX,
    TRACKS_PAGE,
    GenerationJob,
    Track,
)
from .schemas import (
    GenerateTrackIn,
    GenerateTrackOut,
    LicenceOut,
    TrackListOut,
    TrackOut,
)

router = Router(tags=["music"])

# Modele, dla których nadal nie ma workera — z informacją o wymaganym GPU,
# żeby wybór modelu był świadomym wyborem, a nie loterią.
GPU_MODELS = {"musicgen-medium", "musicgen-melody", "jasco"}


def _track_out(track: Track) -> dict:
    # audioUrl to ścieżka przez proxy interfejsu (/api/...), bo utwory są
    # prywatne: dostęp ma właściciel z sesją, a nie każdy, kto zna adres.
    audio_url = "/api/music/tracks/" + str(track.id) + "/audio" if track.audio else None
    licence = track.licence or {}
    return {
        "id": str(track.id),
        "ownerId": str(track.owner_id),
        "title": track.title,
        "prompt": track.prompt,
        "model": track.model,
        "durationSeconds": track.duration_seconds,
        # Relacja do wideo dojdzie ze Studio wideo — pole z kontraktu jest
        # pustą listą, nie znika z odpowiedzi.
        "attachedToPostIds": [],
        "licence": {
            "commercialUseAllowed": licence.get("commercialUseAllowed"),
            "attributionRequired": bool(licence.get("attributionRequired")),
            "notes": licence.get("notes", ""),
        },
        "audioUrl": audio_url,
        "createdAt": track.created_at,
    }


def _quota_of(user) -> dict:
    limit = int(getattr(settings, "MUSIC_DAILY_LIMIT", 10))
    used = GenerationJob.objects.filter(
        owner=user, kind="music.generate", created_at__date=timezone.localdate()
    ).count()
    tomorrow = (timezone.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return {
        "limitPerDay": limit,
        "usedToday": used,
        "remainingToday": max(0, limit - used),
        "resetsAt": tomorrow.isoformat(),
    }


@router.get("/tracks", response={200: TrackListOut, 401: ErrorOut})
def list_tracks(request):
    """Biblioteka użytkownika — bez zmyślonych pozycji. Pusta = pusta."""
    user = current_user(request)
    rows = Track.objects.filter(owner=user)[:TRACKS_PAGE]
    return 200, {"items": [_track_out(track) for track in rows]}


@router.post(
    "/tracks",
    response={201: TrackOut, 400: ErrorOut, 401: ErrorOut, 413: ErrorOut},
)
def upload_track(
    request,
    title: str = Form(...),
    durationSeconds: float = Form(0.0),
    file: UploadedFile = File(...),
):
    """Zapis utworu z sekwencera BENGOS Beat (multipart, audio/wav).

    To jest jedyny sposób posiadania własnej muzyki, który działa BEZ
    maszyny z GPU — i dlatego jest pełnoprawnym obywatelem biblioteki,
    a nie "plikiem tymczasowym". Walidacja typu i rozmiaru jest po stronie
    serwera: interfejs nie jest strażnikiem.
    """
    user = current_user(request)

    clean_title = (title or "").strip()[:TRACK_TITLE_MAX]
    if not clean_title:
        raise HttpError(
            400, {"code": "bad_request", "message": "Tytuł utworu nie może być pusty.", "field": "title"}
        )
    if file.size is not None and file.size > AUDIO_MAX_BYTES:
        raise HttpError(
            413,
            {
                "code": "bad_request",
                "message": "Plik audio może mieć najwyżej 20 MB.",
                "field": "file",
            },
        )
    content_type = (file.content_type or "audio/wav").lower()
    if not content_type.startswith("audio/"):
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Prześlij plik audio — sekwencer zapisuje WAV.",
                "field": "file",
            },
        )

    track = Track(
        owner=user,
        title=clean_title,
        model="webaudio-sequencer",
        duration_seconds=max(0.0, durationSeconds),
        content_type=content_type,
    )
    suffix = ".wav"
    if file.name and "." in file.name:
        suffix = "." + file.name.rsplit(".", 1)[1][:8]
    track.audio.save("beat-" + track.id.hex + suffix, ContentFile(file.read()), save=False)
    track.save()
    record(user, "music.track.upload", resource=str(track.id))
    return 201, _track_out(track)


@router.delete("/tracks/{track_id}", response={204: None, 401: ErrorOut, 404: ErrorOut})
def delete_track(request, track_id: str):
    """Usuwanie własnego utworu — plik znika razem z wierszem."""
    user = current_user(request)
    track = Track.objects.filter(id=track_id, owner=user).first()
    if track is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego utworu."})
    if track.audio:
        track.audio.delete(save=False)
    track.delete()
    record(user, "music.track.delete", resource=track_id)
    return 204, None


@router.get("/tracks/{track_id}/audio")
def track_audio(request, track_id: str):
    """Strumień utworu — tylko właścicielowi, z sesją.

    Bez obsługi Range: pliki z sekwencera mają kilka MB i przewijanie
    w przeglądarce działa po pełnym buforze. Range dojdzie z R2 i dużymi
    plikami; zapisywanie go teraz byłoby dekoracją bez zachowania.
    """
    user = current_user(request)
    track = Track.objects.filter(id=track_id, owner=user).first()
    if track is None or not track.audio:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego utworu."})
    record(user, "music.track.play", resource=str(track.id))
    return FileResponse(track.audio.open("rb"), content_type=track.content_type or "audio/wav")


@router.post(
    "/generate",
    response={202: GenerateTrackOut, 400: ErrorOut, 401: ErrorOut, 429: ErrorOut},
)
def generate_track(request, payload: GenerateTrackIn):
    """Zlecenie generacji — asynchroniczne z definicji kontraktu.

    Limit dzienny jest egzekwowany TU, nie w interfejsie. Dyspatsza do
    workera jest best-effort: gdy worker nie odpowiada, zadanie dostaje
    stan failed z LUDZKIM komunikatem, a nie wisi wiecznie jako "queued".
    """
    user = current_user(request)

    prompt = payload.prompt.strip()[:PROMPT_MAX]
    if not prompt:
        raise HttpError(
            400, {"code": "bad_request", "message": "Opis utworu nie może być pusty.", "field": "prompt"}
        )
    if payload.model not in {value for value, _ in MODEL_CHOICES if value != "webaudio-sequencer"}:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Nieznany model. Wybierz jeden z musicgen-small, musicgen-medium, musicgen-melody, jasco.",
                "field": "model",
            },
        )
    if not 1 <= payload.durationSeconds <= DURATION_MAX:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Długość utworu musi być między 1 a 600 sekund.",
                "field": "durationSeconds",
            },
        )

    quota = _quota_of(user)
    if quota["remainingToday"] <= 0:
        raise HttpError(
            429,
            {
                "code": "rate_limited",
                "message": "Dzienny limit generacji wyczerpany. Reset o północy: " + quota["resetsAt"],
            },
        )

    job = GenerationJob.objects.create(
        owner=user,
        prompt=prompt,
        model=payload.model,
        duration_seconds=payload.durationSeconds,
    )

    endpoint = getattr(settings, "MUSICGEN_ENDPOINT", "")
    if endpoint:
        try:
            data = json.dumps(
                {
                    "jobId": str(job.id),
                    "prompt": prompt,
                    "model": payload.model,
                    "durationSeconds": payload.durationSeconds,
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                endpoint,
                data=data,
                method="POST",
                headers={"Content-Type": "application/json", "User-Agent": "TIKBENGOS-Music"},
            )
            urllib.request.urlopen(req, timeout=15).read()
        except (urllib.error.URLError, urllib.error.HTTPError, OSError):
            job.state = "failed"
            job.error = {
                "code": "unavailable",
                "message": "Worker GPU nie odpowiada. Zlecenie zostało zapisane jako nieudane — nic nie udajemy.",
            }
            job.save(update_fields=["state", "error", "updated_at"])
    record(user, "music.generate", resource=str(job.id))
    return 202, {
        "jobId": str(job.id),
        "channel": "jobs." + str(user.id),
        "model": payload.model,
        # Szacunek czasu wymaga znajomości workera; bez niego null zamiast
        # zmyślonej liczby.
        "estimatedSeconds": None,
    }


@router.get("/jobs/{job_id}", response={401: ErrorOut, 404: ErrorOut})
def job_status(request, job_id: str):
    """Stan zadania — kształt JobStatus z kontraktu, dokładnie ta unia."""
    user = current_user(request)
    job = GenerationJob.objects.filter(id=job_id, owner=user).first()
    if job is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego zadania."})
    # Zwracamy surową unię (bez schematu ninja): kwantyfikatory union
    # walidowałyby każdy wariant osobno i kłamiały o kształcie.
    return 200, job.status()


@router.get("/quota", response={200: QuotaOut, 401: ErrorOut})
def quota(request):
    """Limity generacji z kontraktu — liczone, nie zgadywane."""
    user = current_user(request)
    return 200, _quota_of(user)
