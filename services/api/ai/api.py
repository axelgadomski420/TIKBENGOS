"""Endpointy asystenta — montowane pod /ai (prefiks z API.ai).

Asystent jest asynchroniczny z definicji: pytanie tworzy zadanie i odchodzi
do workera z modelem LLM, odpowiedź wraca endpointem zwrotnym. Bez
ASSISTANT_LLM_ENDPOINT pytanie dostaje 503 z wyjaśnieniem — asystent
bez modelu nie generuje tekstów „z ogólnej wiedzy serwera”, bo serwer
żadnej wiedzy nie ma.

To jest decyzja projektowa, nie brak: synchroniczne czekanie na LLM
w żądaniu HTTP trzymałoby połączenie minute i padało przy każdym
restartze workera.
"""

import json
import secrets
import urllib.error
import urllib.request

from django.conf import settings
from ninja import Router
from ninja.errors import HttpError

from accounts.api import current_user
from accounts.audit import record
from accounts.schemas import ErrorOut

from accounts.models import ProviderCredential
from accounts.providers import ProviderError, auth_headers_for, resolve_engine

from .models import ANSWER_MAX, HISTORY_PAGE, PROMPT_MAX, AssistantJob
from .schemas import AskIn, AskOut, AssistantCompleteIn, AssistantHistoryOut, EngineIn, EngineOut

router = Router(tags=["ai"])


def _extract_text(protocol: str, payload: dict) -> str:
    if protocol == "gemini":
        parts = (((payload.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
        return str((parts[0] if parts else {}).get("text") or "")
    if protocol == "anthropic":
        blocks = payload.get("content") or []
        return "".join(str(block.get("text") or "") for block in blocks if isinstance(block, dict))
    if protocol == "xai-responses":
        if payload.get("output_text"):
            return str(payload["output_text"])
        chunks: list[str] = []
        for item in payload.get("output") or []:
            if not isinstance(item, dict):
                continue
            for block in item.get("content") or []:
                if isinstance(block, dict) and block.get("text"):
                    chunks.append(str(block["text"]))
        return "".join(chunks)
    message = ((payload.get("choices") or [{}])[0].get("message") or {})
    return str(message.get("content") or "")


@router.post("/engine", response={200: EngineOut, 400: ErrorOut, 401: ErrorOut, 502: ErrorOut})
def run_engine(request, payload: EngineIn):
    """Woła model dostawcy kluczem tego użytkownika.

    Klucz nie wraca w odpowiedzi. Adres bierze się z katalogu.
    """
    user = current_user(request)
    prompt = (payload.prompt or "").strip()[:8000]
    if not prompt:
        raise HttpError(400, {"code": "bad_request", "message": "Pytanie nie może być puste.", "field": "prompt"})
    try:
        url, protocol = resolve_engine(payload.providerId, payload.routeId, payload.model)
    except ProviderError as exc:
        raise HttpError(400, {"code": exc.code, "message": exc.message})

    credential = (
        ProviderCredential.objects.filter(user=user, provider_id=payload.providerId, revoked_at__isnull=True)
        .order_by("-created_at")
        .first()
    )
    if credential is None:
        raise HttpError(
            400,
            {"code": "bad_request", "message": "Najpierw dodaj swój klucz tego dostawcy w ustawieniach."},
        )

    key = credential.reveal()
    headers = {"Content-Type": "application/json", "User-Agent": "Bengos"}
    headers.update(auth_headers_for(payload.providerId, key))
    if protocol == "anthropic":
        headers["anthropic-version"] = "2023-06-01"
    if protocol == "gemini":
        body = {"contents": [{"parts": [{"text": prompt}]}]}
    elif protocol == "anthropic":
        body = {"model": payload.model, "max_tokens": 1400, "messages": [{"role": "user", "content": prompt}]}
    elif protocol == "xai-responses":
        body = {"model": payload.model, "input": prompt}
    else:
        body = {"model": payload.model, "messages": [{"role": "user", "content": prompt}]}

    try:
        req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST", headers=headers)
        with urllib.request.urlopen(req, timeout=50) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:240]
        raise HttpError(502, {"code": "unavailable", "message": f"Dostawca odmówił ({exc.code}). {detail}"})
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
        raise HttpError(502, {"code": "unavailable", "message": "Dostawca nie odpowiedział."})

    text = _extract_text(protocol, raw if isinstance(raw, dict) else {}).strip()
    if not text:
        raise HttpError(502, {"code": "unavailable", "message": "Dostawca nie zwrócił tekstu."})
    credential.last_used_at = timezone_now()
    credential.save(update_fields=["last_used_at"])
    return 200, {"text": text[:ANSWER_MAX] if ANSWER_MAX else text, "providerId": payload.providerId, "model": payload.model, "routeId": payload.routeId}


def timezone_now():
    from django.utils import timezone

    return timezone.now()


# Stany, w jakich worker LLM może zameldować się na endpoincie zwrotnym.
WORKER_STATES = {"running", "succeeded", "failed"}


def _job_out(job: AssistantJob) -> dict:
    return {
        "id": str(job.id),
        "prompt": job.prompt,
        "answer": job.answer,
        "state": job.state,
        "createdAt": job.created_at,
    }


def _worker_authorized(request) -> bool:
    """Uwierzytelnienie workera LLM — wspólny sekret BENGOS_WORKER_TOKEN.

    Ten sam sekret co worker GPU muzyki i executor zmian: usługi
    wewnętrzne autoryzują się jednakowo, bo różne sekrety nie dają tu
    bezpieczeństwa, tylko trzecią rzecz do zepsucia przy wdrożeniu.
    Bez sekretu endpoint jest ZAMKNIĘTY (403), nie „cicho otwarty”.
    """
    expected = getattr(settings, "BENGOS_WORKER_TOKEN", "")
    if not expected:
        return False
    provided = request.headers.get("X-Bengos-Worker", "")
    return secrets.compare_digest(expected, provided)


@router.post("/assistant", response={202: AskOut, 400: ErrorOut, 401: ErrorOut, 503: ErrorOut})
def ask_assistant(request, payload: AskIn):
    """Zlecenie pytania — tworzy zadanie, odchodzi do workera modelu.

    Bez ASSISTANT_LLM_ENDPOINT: 503 z wyjaśnieniem. Z endpointem:
    dyspatsza jest best-effort — gdy worker nie odpowiada, zadanie
    dostaje stan failed z LUDZKIM komunikatem, a nie wisi wiecznie.
    """
    user = current_user(request)

    endpoint = getattr(settings, "ASSISTANT_LLM_ENDPOINT", "")
    if not endpoint:
        raise HttpError(
            503,
            {
                "code": "unavailable",
                "message": (
                    "Asystent nie ma podłączonego modelu. Ustaw ASSISTANT_LLM_ENDPOINT "
                    "(np. Ollama na tej samej maszynie) — dopóki go nie ma, pytać nie ma kogo."
                ),
            },
        )

    prompt = payload.prompt.strip()[:PROMPT_MAX]
    if not prompt:
        raise HttpError(
            400,
            {"code": "bad_request", "message": "Pytanie nie może być puste.", "field": "prompt"},
        )

    job = AssistantJob.objects.create(owner=user, prompt=prompt)
    model_name = getattr(settings, "ASSISTANT_MODEL", "")
    try:
        data = json.dumps(
            {"jobId": str(job.id), "prompt": prompt, "model": model_name}
        ).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data,
            method="POST",
            headers={"Content-Type": "application/json", "User-Agent": "TIKBENGOS-Assistant"},
        )
        urllib.request.urlopen(req, timeout=15).read()
    except (urllib.error.URLError, urllib.error.HTTPError, OSError):
        job.state = "failed"
        job.error = {
            "code": "unavailable",
            "message": "Model asystenta nie odpowiada. Pytanie zapisano jako nieudane — nic nie udajemy.",
        }
        job.save(update_fields=["state", "error", "updated_at"])
    record(user, "ai.assistant.ask", resource=str(job.id))
    return 202, {"jobId": str(job.id), "channel": "jobs." + str(user.id), "model": model_name}


@router.get("/jobs/{job_id}", response={401: ErrorOut, 404: ErrorOut})
def assistant_job_status(request, job_id: str):
    """Stan zadania — surowa unia JobStatus, jak w muzyce i Dev."""
    user = current_user(request)
    job = AssistantJob.objects.filter(id=job_id, owner=user).first()
    if job is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego zadania."})
    return 200, job.status()


@router.get("/history", response={200: AssistantHistoryOut, 401: ErrorOut})
def assistant_history(request):
    """Historia pytań i odpowiedzi — bez zmyślonych pozycji."""
    user = current_user(request)
    rows = AssistantJob.objects.filter(owner=user)[:HISTORY_PAGE]
    return 200, {"items": [_job_out(job) for job in rows]}


@router.post(
    "/jobs/{job_id}/complete",
    response={200: None, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def assistant_complete_job(request, job_id: str, payload: AssistantCompleteIn):
    """Raport workera LLM: postęp, porażka albo odpowiedź.

    To jedyne miejsce, w którym odpowiedź POWSTAJE — bez niego pytanie
    wisiałoby w "queued" przy działającym modelu. Sukces bez answer
    jest odrzucany: odpowiedź pusta po sukcesie byłaby kłamstwem
    o stanie zadania.
    """
    if not _worker_authorized(request):
        raise HttpError(
            403,
            {
                "code": "forbidden",
                "message": (
                    "Endpoint zwrotny wymaga nagłówka X-Bengos-Worker z sekretem "
                    "BENGOS_WORKER_TOKEN. Bez ustawionego sekretu jest zamknięty."
                ),
            },
        )

    job = AssistantJob.objects.filter(id=job_id).first()
    if job is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego zadania."})
    if payload.state not in WORKER_STATES:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Stan raportu może być running, succeeded albo failed.",
                "field": "state",
            },
        )

    if payload.state == "running":
        job.state = "running"
        job.stage = (payload.stage or "")[:120]
        job.progress = max(0.0, min(1.0, payload.progress))
        job.save(update_fields=["state", "stage", "progress", "updated_at"])
        return 200, job.status()

    if payload.state == "failed":
        job.state = "failed"
        job.error = {
            "code": "internal",
            "message": (payload.error or "Model asystenta zakończył błędem.")[:2000],
        }
        job.save(update_fields=["state", "error", "updated_at"])
        record(job.owner, "ai.assistant.failed", resource=str(job.id))
        return 200, job.status()

    answer = (payload.answer or "").strip()
    if not answer:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Sukces wymaga odpowiedzi. Worker musi dołączyć answer.",
                "field": "answer",
            },
        )
    job.state = "succeeded"
    job.answer = answer[:ANSWER_MAX]
    job.progress = 1.0
    job.save(update_fields=["state", "answer", "progress", "updated_at"])
    record(job.owner, "ai.assistant.complete", resource=str(job.id))
    return 200, job.status()
