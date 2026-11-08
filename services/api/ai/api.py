"""Endpointy asystenta — montowane pod /ai (prefiks z API.ai).

Asystent jest asynchroniczny: pytanie tworzy zadanie, które wykonuje
wewnętrzny worker Pluter. Odpowiedź wraca przez uwierzytelniony callback.
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

from .models import ANSWER_MAX, HISTORY_PAGE, PROMPT_MAX, AssistantJob
from .schemas import AskIn, AskOut, AssistantCompleteIn, AssistantHistoryOut

router = Router(tags=["ai"])
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
    expected = getattr(settings, "BENGOS_WORKER_TOKEN", "")
    provided = request.headers.get("X-Bengos-Worker", "")
    return bool(expected) and secrets.compare_digest(expected, provided)


@router.post("/assistant", response={202: AskOut, 400: ErrorOut, 401: ErrorOut, 503: ErrorOut})
def ask_assistant(request, payload: AskIn):
    user = current_user(request)
    endpoint = getattr(settings, "ASSISTANT_LLM_ENDPOINT", "")
    worker_token = getattr(settings, "BENGOS_WORKER_TOKEN", "")
    if not endpoint or not worker_token:
        raise HttpError(
            503,
            {
                "code": "unavailable",
                "message": "Pluter nie jest skonfigurowany. Ustaw ASSISTANT_LLM_ENDPOINT i BENGOS_WORKER_TOKEN.",
            },
        )

    prompt = payload.prompt.strip()[:PROMPT_MAX]
    if not prompt:
        raise HttpError(400, {"code": "bad_request", "message": "Pytanie nie może być puste.", "field": "prompt"})

    job = AssistantJob.objects.create(owner=user, prompt=prompt)
    model_name = getattr(settings, "ASSISTANT_MODEL", "")
    try:
        data = json.dumps({"jobId": str(job.id), "prompt": prompt, "model": model_name}).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "User-Agent": "BENGOS-Pluter-Assistant",
                "X-Bengos-Worker": worker_token,
            },
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status != 202:
                raise urllib.error.HTTPError(endpoint, response.status, "Worker odrzucił zadanie", response.headers, None)
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, TimeoutError):
        job.state = "failed"
        job.error = {
            "code": "unavailable",
            "message": "Worker Pluter nie odpowiada. Sprawdź jego stan i konfigurację.",
        }
        job.save(update_fields=["state", "error", "updated_at"])
    record(user, "ai.assistant.ask", resource=str(job.id))
    return 202, {"jobId": str(job.id), "channel": "jobs." + str(user.id), "model": model_name}


@router.get("/jobs/{job_id}", response={401: ErrorOut, 404: ErrorOut})
def assistant_job_status(request, job_id: str):
    user = current_user(request)
    job = AssistantJob.objects.filter(id=job_id, owner=user).first()
    if job is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego zadania."})
    return 200, job.status()


@router.get("/history", response={200: AssistantHistoryOut, 401: ErrorOut})
def assistant_history(request):
    user = current_user(request)
    rows = AssistantJob.objects.filter(owner=user)[:HISTORY_PAGE]
    return 200, {"items": [_job_out(job) for job in rows]}


@router.post("/jobs/{job_id}/complete", response={200: None, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut})
def assistant_complete_job(request, job_id: str, payload: AssistantCompleteIn):
    if not _worker_authorized(request):
        raise HttpError(403, {"code": "forbidden", "message": "Endpoint zwrotny wymaga poprawnego X-Bengos-Worker."})

    job = AssistantJob.objects.filter(id=job_id).first()
    if job is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego zadania."})
    if payload.state not in WORKER_STATES:
        raise HttpError(400, {"code": "bad_request", "message": "Stan raportu może być running, succeeded albo failed.", "field": "state"})

    if payload.state == "running":
        job.state = "running"
        job.stage = (payload.stage or "")[:120]
        job.progress = max(0.0, min(1.0, payload.progress))
        job.save(update_fields=["state", "stage", "progress", "updated_at"])
        return 200, job.status()

    if payload.state == "failed":
        job.state = "failed"
        job.error = {"code": "internal", "message": (payload.error or "Pluter zakończył zadanie błędem.")[:2000]}
        job.save(update_fields=["state", "error", "updated_at"])
        record(job.owner, "ai.assistant.failed", resource=str(job.id))
        return 200, job.status()

    answer = (payload.answer or "").strip()
    if not answer:
        raise HttpError(400, {"code": "bad_request", "message": "Sukces wymaga odpowiedzi.", "field": "answer"})
    job.state = "succeeded"
    job.answer = answer[:ANSWER_MAX]
    job.progress = 1.0
    job.save(update_fields=["state", "answer", "progress", "updated_at"])
    record(job.owner, "ai.assistant.complete", resource=str(job.id))
    return 200, job.status()
