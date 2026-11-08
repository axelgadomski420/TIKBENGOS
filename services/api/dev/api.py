"""Endpointy modułu Dev (montowane pod /git).

Zasada z audytu, przeniesiona w kod: NIC nie jest zapisywane do GitHuba
bez użytkownika, który to widzi i ponosi. Issue zakłada użytkownik,
komentarz pisze użytkownik, a agent dostanie prawo zapisu dopiero przez
zatwierdzony plan — i to w executorze, nigdy w procesie serwera API.

Cudze repozytorium w tej instalacji: 404, nie 403 — zasada z czatu,
że odpowiedź nie może zdradzać, że coś istnieje.
"""

import re
import secrets
from datetime import datetime

from django.conf import settings
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from accounts.api import current_user
from accounts.audit import record
from accounts.schemas import ErrorOut

from . import github as gh
from .models import (
    ISSUE_BODY_MAX,
    ISSUE_TITLE_MAX,
    LABELS_MAX,
    OPERATIONS_PAGE,
    PLAN_REQUEST_MAX,
    ChangePlan,
    CodeJob,
    CodeOperation,
    ConnectedRepository,
)
from .schemas import (
    ApprovePlanIn,
    CommentIn,
    CommitListOut,
    ConnectRepositoryIn,
    ConnectRepositoryOut,
    CreateIssueIn,
    CreatePlanIn,
    IssueCommentOut,
    IssueListOut,
    IssueOut,
    JobCompleteIn,
    OperationListOut,
    OperationOut,
    PlanListOut,
    PlanOut,
    RejectPlanIn,
    RepositoryListOut,
    RepositoryOut,
)

router = Router(tags=["dev"])

# Wzorzec właściciel/nazwa z GitHuba: litery, cyfry, myślnik, kropka,
# podkreślnik. Odrzucamy na wejściu, zanim żądanie poleci w świat —
# błąd walidacji jest tańszy od błędu HTTP z GitHuba i czytelniejszy.
_REPO_PART = re.compile(r"^[A-Za-z0-9_.-]+$")
_STATE_VALUES = ("open", "closed", "all")


def _repository_out(row: ConnectedRepository) -> dict:
    return {
        "id": str(row.id),
        "owner": row.github_owner,
        "name": row.github_name,
        "defaultBranch": row.default_branch,
        "isPrivate": row.is_private,
        "permissions": {
            "readContents": True,
            "writeContents": row.write_contents,
            "openPullRequests": row.open_pull_requests,
            "readIssues": row.read_issues,
            "writeIssues": row.write_issues,
        },
        "connectedAt": row.connected_at,
    }


def _plan_out(plan: ChangePlan) -> dict:
    return {
        "id": str(plan.id),
        "repositoryId": str(plan.repository_id),
        "request": plan.request,
        "summary": plan.summary,
        "steps": plan.steps or [],
        "filesTouched": plan.files_touched or [],
        "state": plan.state or {"state": "awaiting-approval"},
        "createdAt": plan.created_at,
    }


def _operation_out(row: CodeOperation) -> dict:
    return {
        "id": str(row.id),
        "planId": str(row.plan_id) if row.plan_id else None,
        "actorId": str(row.actor_id),
        "operation": row.operation,
        "repositoryId": str(row.repository_id) if row.repository_id else None,
        "detail": row.detail,
        "createdAt": row.created_at,
    }


def _my_repository(request, repository_id: str) -> ConnectedRepository:
    user = current_user(request)
    row = ConnectedRepository.objects.filter(id=repository_id, owner=user).first()
    if row is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego repozytorium."})
    return row


def _guard_github(exc: gh.GitHubUnavailable):
    """Tłumaczy błąd GitHuba na ApiError — nigdy go nie połyka.

    Komunikat z github.py jest pisany po ludzku i to ON idzie do
    interfejsu, bo użytkownik naprawia przyczynę (token, prawa, nazwę),
    a nie stos wywołań.
    """
    code = "internal"
    if exc.status in (400, 422):
        code = "bad_request"
    elif exc.status in (401, 403):
        code = "forbidden"
    elif exc.status == 404:
        code = "not_found"
    elif exc.status == 409:
        code = "conflict"
    elif exc.status >= 500:
        code = "unavailable"
    raise HttpError(exc.status if exc.status < 500 else 502, {"code": code, "message": exc.message})


def _log(user, repository: ConnectedRepository | None, operation: str, detail: str, plan=None) -> None:
    CodeOperation.objects.create(
        repository=repository, actor=user, operation=operation, detail=detail, plan=plan
    )


# ── Repozytoria ──────────────────────────────────────────────────────


@router.get("/repositories", response={200: RepositoryListOut, 401: ErrorOut})
def list_repositories(request):
    """Repozytoria podłączone przez użytkownika — z bazy, nie z GitHuba.

    Stan połączeń jest nasz; odpytywanie GitHuba przy KAŻDYM wejściu
    do modułu byłoby klientem API, który liczy się do limitów, a nie
    dawał nic ponad to, co już wiemy.
    """
    user = current_user(request)
    rows = ConnectedRepository.objects.filter(owner=user)
    return 200, {"items": [_repository_out(row) for row in rows]}


@router.post(
    "/repositories",
    response={201: ConnectRepositoryOut, 400: ErrorOut, 401: ErrorOut, 409: ErrorOut},
)
def connect_repository(request, payload: ConnectRepositoryIn):
    """Podłączenie repozytorium. Waliduje GitHub, nie ufamy literkom.

    Uprawnienia zapisujemy WYKRYTE z odpowiedzi GitHuba: pole
    "permissions" mówi, co token naprawdę może, i to jest stan, który
    interfejs pokazuje użytkownikowi. Zgadywanie ("będzie umiał") byłoby
    kłamstwem wypisanym w bazie.
    """
    user = current_user(request)
    owner = payload.owner.strip()
    name = payload.name.strip()
    if not _REPO_PART.match(owner) or not _REPO_PART.match(name):
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Właściciel i nazwa mogą zawierać tylko litery, cyfry, kropkę, myślnik i podkreślnik.",
            },
        )

    if ConnectedRepository.objects.filter(owner=user, github_owner=owner, github_name=name).exists():
        raise HttpError(
            409, {"code": "conflict", "message": "To repozytorium jest już podłączone."}
        )

    try:
        gh_repo = gh.fetch_repo(owner, name)
    except gh.GitHubUnavailable as exc:
        _guard_github(exc)

    perms = gh.repo_permissions(gh_repo)
    row = ConnectedRepository.objects.create(
        owner=user,
        github_owner=owner,
        github_name=name,
        default_branch=gh_repo.get("default_branch", "main"),
        is_private=bool(gh_repo.get("private", False)),
        write_contents=perms["writeContents"],
        open_pull_requests=perms["openPullRequests"],
        read_issues=perms["readIssues"],
        write_issues=perms["writeIssues"],
    )
    record(user, "git.repository.connect", resource=owner + "/" + name)
    _log(user, row, "repository.connect", "Podłączono " + owner + "/" + name + ".")
    return 201, {
        "repository": _repository_out(row),
        # Dla tokenu serwera "instalacja" to po prostu adres repozytorium.
        # Pole zostaje z kontraktu: gdy dojdzie aplikacja GitHub, trafi
        # tu adres instalacji aplikacji i interfejs nie zmieni się o piksel.
        "installationUrl": gh_repo.get("html_url", ""),
    }


@router.delete("/repositories/{repository_id}", response={204: None, 401: ErrorOut, 404: ErrorOut})
def disconnect_repository(request, repository_id: str):
    """Odłączenie repozytorium. Dziennik operacji zostaje — to jego sens."""
    user = current_user(request)
    row = _my_repository(request, repository_id)
    label = row.github_owner + "/" + row.github_name
    row.delete()
    record(user, "git.repository.disconnect", resource=label)
    _log(user, None, "repository.disconnect", "Odłączono " + label + ".")
    return 204, None


# ── Issue ─────────────────────────────────────────────────────────────


@router.get(
    "/repositories/{repository_id}/issues",
    response={200: IssueListOut, 400: ErrorOut, 401: ErrorOut, 404: ErrorOut},
)
def list_issues(request, repository_id: str, state: str = "open"):
    """Issue PROSTO z GitHuba — stan na żywo, bez kopii w bazie.

    Kopiowanie issue do bazy tworzyłoby drugą prawdę, która zdezaktualizuje
    się przy pierwszym komentarzu spoza modułu. Moduł czyta źródło.
    """
    user = current_user(request)
    row = _my_repository(request, repository_id)
    if state not in _STATE_VALUES:
        raise HttpError(
            400, {"code": "bad_request", "message": "Stan może być open, closed albo all."}
        )
    try:
        raw = gh.list_issues(row.github_owner, row.github_name, state)
    except gh.GitHubUnavailable as exc:
        _guard_github(exc)
    _log(user, row, "read", "Odczyt issue (" + state + ").")
    return 200, {"items": [item for item in (gh.issue_out(r) for r in raw) if item]}


@router.post(
    "/repositories/{repository_id}/issues",
    response={201: IssueOut, 400: ErrorOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def create_issue(request, repository_id: str, payload: CreateIssueIn):
    """Zakłada issue w GitHubie. Prawa są sprawdzane PRZED wyjściem z domu.

    Odmowa "403 z GitHuba" po zapisie walidacji byłaby tańsza w kodzie,
    ale droższa w zaufaniu: użytkownik napisał treść, wysłał ją i dostał
    odmowę z cudzego serwera. Nasza odmowa mówi po ludzku i nie zabiera
    treści.
    """
    user = current_user(request)
    row = _my_repository(request, repository_id)
    if not row.write_issues:
        raise HttpError(
            403,
            {
                "code": "forbidden",
                "message": "Token nie ma prawa zapisu issue w tym repozytorium. Połącz repozytorium z tokenem, który je ma.",
            },
        )
    title = payload.title.strip()[:ISSUE_TITLE_MAX]
    if not title:
        raise HttpError(400, {"code": "bad_request", "message": "Tytuł nie może być pusty.", "field": "title"})
    body = (payload.body or "").strip()[:ISSUE_BODY_MAX]
    labels = [l.strip() for l in (payload.labels or []) if l.strip()][:LABELS_MAX]

    try:
        created = gh.create_issue(row.github_owner, row.github_name, title, body, labels)
    except gh.GitHubUnavailable as exc:
        _guard_github(exc)
    record(user, "git.issue.create", resource=title)
    _log(user, row, "issue.create", "Utworzono issue: " + title + ".")
    return 201, gh.issue_out(created)


@router.post(
    "/repositories/{repository_id}/issues/{number}/comments",
    response={201: IssueCommentOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def comment_issue(request, repository_id: str, number: int, payload: CommentIn):
    """Komentarz pod issue — realny zapis, z danymi użytkownika."""
    user = current_user(request)
    row = _my_repository(request, repository_id)
    if not row.write_issues:
        raise HttpError(
            403, {"code": "forbidden", "message": "Token nie ma prawa zapisu w tym repozytorium."}
        )
    body = (payload.body or "").strip()
    if not body:
        raise HttpError(400, {"code": "bad_request", "message": "Komentarz nie może być pusty.", "field": "body"})
    try:
        created = gh.add_comment(row.github_owner, row.github_name, number, body)
    except gh.GitHubUnavailable as exc:
        _guard_github(exc)
    record(user, "git.issue.comment", resource="#" + str(number))
    _log(user, row, "issue.comment", "Komentarz pod issue #" + str(number) + ".")
    return 201, gh.comment_out(created)


@router.post(
    "/repositories/{repository_id}/issues/{number}/close",
    response={200: IssueOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def close_issue(request, repository_id: str, number: int):
    return _change_issue_state(request, repository_id, number, "closed")


@router.post(
    "/repositories/{repository_id}/issues/{number}/reopen",
    response={200: IssueOut, 401: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def reopen_issue(request, repository_id: str, number: int):
    return _change_issue_state(request, repository_id, number, "open")


def _change_issue_state(request, repository_id: str, number: int, state: str):
    user = current_user(request)
    row = _my_repository(request, repository_id)
    if not row.write_issues:
        raise HttpError(
            403, {"code": "forbidden", "message": "Token nie ma prawa zapisu w tym repozytorium."}
        )
    try:
        updated = gh.set_issue_state(row.github_owner, row.github_name, number, state)
    except gh.GitHubUnavailable as exc:
        _guard_github(exc)
    record(user, "git.issue.state", resource="#" + str(number))
    _log(user, row, "issue.state", "Issue #" + str(number) + " -> " + state + ".")
    return 200, gh.issue_out(updated)


# ── Commity ───────────────────────────────────────────────────────────


@router.get(
    "/repositories/{repository_id}/commits",
    response={200: CommitListOut, 401: ErrorOut, 404: ErrorOut},
)
def list_commits(request, repository_id: str):
    """Ostatnie commity — podgląd, nie audyt. Audyt to CodeOperation."""
    user = current_user(request)
    row = _my_repository(request, repository_id)
    try:
        raw = gh.list_commits(row.github_owner, row.github_name)
    except gh.GitHubUnavailable as exc:
        _guard_github(exc)
    _log(user, row, "read", "Odczyt ostatnich commitów.")
    return 200, {"items": [gh.commit_out(r) for r in raw]}


# ── Plany zmian ───────────────────────────────────────────────────────


@router.get("/plans", response={200: PlanListOut, 401: ErrorOut})
def list_plans(request):
    user = current_user(request)
    rows = ChangePlan.objects.filter(repository__owner=user)[:OPERATIONS_PAGE]
    return 200, {"items": [_plan_out(plan) for plan in rows]}


@router.post("/plans", response={201: PlanOut, 400: ErrorOut, 401: ErrorOut, 404: ErrorOut})
def create_plan(request, payload: CreatePlanIn):
    """Plan zmian z opisu funkcji. Zgoda idzie PRZEZ plan, nie obok niego.

    Kroki są puste i to jest uczciwe: rozpisanie planu robi executor
    (Aider w piaskownicy), a nie zmyślony generator. Puste kroki mówią
    "plan czeka na rozpisanie" — lista zmyślonych plików mówi "ktoś
    tu kłamie".
    """
    user = current_user(request)
    repository = _my_repository(request, payload.repositoryId)
    request_text = payload.request.strip()[:PLAN_REQUEST_MAX]
    if not request_text:
        raise HttpError(
            400, {"code": "bad_request", "message": "Opis funkcji nie może być pusty.", "field": "request"}
        )
    plan = ChangePlan.objects.create(
        repository=repository,
        request=request_text,
        summary=(
            "Plan utworzony z opisu użytkownika. Kroki i pliki rozpisze executor "
            "(Aider w piaskownicy) po podłączeniu BENGOS_CODE_EXECUTOR_URL — pusta "
            "lista jest tu stanem prawdziwym, nie brakiem funkcji."
        ),
        state={"state": "awaiting-approval"},
    )
    record(user, "git.plan.create", resource=str(plan.id))
    _log(user, repository, "plan.create", "Plan: " + request_text[:120], plan=plan)
    return 201, _plan_out(plan)


@router.post(
    "/plans/{plan_id}/approve",
    response={200: PlanOut, 401: ErrorOut, 404: ErrorOut, 409: ErrorOut, 503: ErrorOut},
)
def approve_plan(request, plan_id: str, payload: ApprovePlanIn):
    """Zatwierdzenie planu — bramka zgody z kontraktu.

    Bez pola confirm o wartości create-branch-and-pull-request serwer
    odmawia: zatwierdzenie musi być świadome, a nie "kliknąłem dalej".
    Bez executora serwer odmawia 409 z wyjaśnieniem — zgoda na plan,
    którego nie da się wykonać, nie jest zgodą, tylko papierem.
    """
    user = current_user(request)
    plan = _my_plan(request, plan_id)

    if payload.confirm != "create-branch-and-pull-request":
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Zatwierdzenie wymaga świadomej wartości create-branch-and-pull-request.",
                "field": "confirm",
            },
        )
    if (plan.state or {}).get("state") != "awaiting-approval":
        raise HttpError(
            409, {"code": "conflict", "message": "Ten plan nie czeka już na zatwierdzenie."}
        )

    executor = getattr(settings, "BENGOS_CODE_EXECUTOR_URL", "")
    if not executor:
        raise HttpError(
            409,
            {
                "code": "conflict",
                "message": (
                    "Executor zmian (Aider w piaskownicy) nie jest podłączony. "
                    "Ustaw BENGOS_CODE_EXECUTOR_URL — dopóki go nie ma, zatwierdzenie "
                    "odrzuca zamiast udawać wykonanie."
                ),
            },
        )

    job = CodeJob.objects.create(owner=user, plan=plan, state="queued")
    try:
        gh._request_dispatch(
            executor,
            {
                "jobId": str(job.id),
                "planId": str(plan.id),
                "repository": plan.repository.github_owner + "/" + plan.repository.github_name,
                "request": plan.request,
            },
        )
    except Exception:  # noqa: BLE001 - dyspatsza może paść, i to jest normalne
        job.delete()
        raise HttpError(
            503,
            {
                "code": "unavailable",
                "message": "Executor nie odpowiada. Plan został nietknięty — spróbuj ponownie.",
            },
        )

    plan.state = {"state": "approved", "jobId": str(job.id)}
    plan.save(update_fields=["state"])
    record(user, "git.plan.approve", resource=str(plan.id))
    _log(user, plan.repository, "plan.approve", "Zatwierdzono plan " + str(plan.id) + ".", plan=plan)
    return 200, _plan_out(plan)


def _my_plan(request, plan_id: str) -> ChangePlan:
    user = current_user(request)
    plan = (
        ChangePlan.objects.select_related("repository")
        .filter(id=plan_id, repository__owner=user)
        .first()
    )
    if plan is None:
        raise HttpError(404, {"code": "not_found", "message": "Nie znaleziono tego planu."})
    return plan


@router.post("/plans/{plan_id}/reject", response={200: PlanOut, 401: ErrorOut, 404: ErrorOut})
def reject_plan(request, plan_id: str, payload: RejectPlanIn):
    user = current_user(request)
    plan = _my_plan(request, plan_id)
    if (plan.state or {}).get("state") != "awaiting-approval":
        raise HttpError(409, {"code": "conflict", "message": "Ten plan nie czeka już na decyzję."})
    plan.state = {"state": "rejected", "reason": (payload.reason or "").strip() or None}
    plan.save(update_fields=["state"])
    record(user, "git.plan.reject", resource=str(plan.id))
    _log(user, plan.repository, "plan.reject", "Odrzucono plan " + str(plan.id) + ".", plan=plan)
    return 200, _plan_out(plan)


# ── Dziennik operacji ─────────────────────────────────────────────────


@router.get("/operations", response={200: OperationListOut, 401: ErrorOut})
def list_operations(request):
    """Dziennik działań użytkownika. Tylko odczyt — usunięcie nie istnieje."""
    user = current_user(request)
    rows = CodeOperation.objects.filter(actor=user)[:OPERATIONS_PAGE]
    return 200, {"items": [_operation_out(row) for row in rows]}

# ── Endpoint zwrotny executora zmian ──────────────────────────────────

# Stany, w jakich executor może zameldować się na endpoincie zwrotnym.
WORKER_STATES = {"running", "succeeded", "failed"}


def _worker_authorized(request) -> bool:
    """Uwierzytelnienie executora — wspólny sekret, porównanie stałoczasowe.

    Ten sam sekret co worker GPU muzyki (BENGOS_WORKER_TOKEN): usługi
    wewnętrzne autoryzują się tak samo, bo różnicowanie sekretów nie daje
    tu nic — obaj wykonawcy piszą do tej samej bazy przez callbacki.
    Bez sekretu endpoint jest ZAMKNIĘTY (403), a nie „cicho”.
    """
    expected = getattr(settings, "BENGOS_WORKER_TOKEN", "")
    if not expected:
        return False
    provided = request.headers.get("X-Bengos-Worker", "")
    return secrets.compare_digest(expected, provided)


@router.post(
    "/jobs/{job_id}/complete",
    response={200: None, 400: ErrorOut, 403: ErrorOut, 404: ErrorOut},
)
def complete_job(request, job_id: str, payload: JobCompleteIn):
    """Raport executora: postęp, porażka albo wykonany plan z pull requestem.

    To jedyne miejsce, w którym plan przechodzi w stan "applied" — bez
    niego executor miałby zmieniony kod, a plan wciąż by „czekał", i to
    by było kłamstwo wprost w bazie. Zatwierdzenie planu (approve) daje
    ZGODĘ na wykonanie; ten endpoint stwierdza WYKONANIE.

    Uwierzytelnienie: nagłówek X-Bengos-Worker z BENGOS_WORKER_TOKEN.
    Sesja tu nie istnieje — executor nie jest człowiekiem.
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

    job = CodeJob.objects.filter(id=job_id).first()
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
        return 200, {"state": job.state, "stage": job.stage, "progress": job.progress}

    plan = job.plan  # SET_NULL: plan mógł zniknąć, a raport i tak musi się przyjąć

    if payload.state == "failed":
        job.state = "failed"
        job.error = {
            "code": "internal",
            "message": (payload.error or "Executor zakończył zlecenie błędem.")[:2000],
        }
        job.save(update_fields=["state", "error", "updated_at"])
        if plan is not None:
            plan.state = {"state": "failed", "jobId": str(job.id), "error": (payload.error or "")[:2000]}
            plan.save(update_fields=["state"])
            _log(job.owner, plan.repository, "plan.failed", "Plan nieudany: " + (payload.error or "")[:200], plan=plan)
            record(job.owner, "git.plan.failed", resource=str(plan.id))
        return 200, {"state": job.state, "error": job.error}

    # state == "succeeded": wykonanie jest prawdziwe tylko z pull requestem.
    # Sukces bez PR oznaczałby zmiany w gałęzi, której nikt nie zobaczy.
    pull_url = (payload.pullRequestUrl or "").strip()
    if not pull_url:
        raise HttpError(
            400,
            {
                "code": "bad_request",
                "message": "Sukces wymaga adresu pull requesta. Executor musi go utworzyć.",
                "field": "pullRequestUrl",
            },
        )

    job.state = "succeeded"
    job.progress = 1.0
    job.result_ref = pull_url[:400]
    job.save(update_fields=["state", "progress", "result_ref", "updated_at"])
    if plan is not None:
        # Kroki i pliki wypełnia EXECUTOR — tu tylko zapisujemy raport
        # wykonania. Puste kroki po sukcesie byłyby zgubą informacji,
        # nie uczciwością.
        if payload.summary.strip():
            plan.summary = payload.summary.strip()
        if payload.steps:
            plan.steps = payload.steps
        if payload.filesTouched:
            plan.files_touched = payload.filesTouched
        plan.state = {"state": "applied", "jobId": str(job.id), "pullRequestUrl": pull_url}
        plan.save(update_fields=["summary", "steps", "files_touched", "state"])
        _log(
            job.owner,
            plan.repository,
            "plan.applied",
            "Plan wykonany: " + pull_url,
            plan=plan,
        )
        record(job.owner, "git.plan.apply", resource=str(plan.id))
    return 200, {"state": job.state, "resultRef": job.result_ref}
