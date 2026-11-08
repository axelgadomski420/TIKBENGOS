"""Executor zmian kodu TIKBENGOS — Aider w katalogu roboczym.

Przyjmuje zlecenia z API (BENGOS_CODE_EXECUTOR_URL wskazuje tu) i oddaje
wynik przez endpoint zwrotny POST /v1/git/jobs/{id}/complete z sekretem
BENGOS_WORKER_TOKEN w nagłówku X-Bengos-Worker.

Zasada z audytu, wdrożona tu dosłownie: agent kodujący NIGDY nie pisze do
gałęli głównej. Zmiany idą na gałąź bengos/plan-{id}, a do main wchodzi
wyłącznie pull request — przejrzenie przez człowieka nie jest opcją.

Uruchomienie:
    pip install -r requirements.txt
    BENGOS_API_URL=http://ADRES_API:8000 \
    BENGOS_WORKER_TOKEN=TEN_SAM_SEKRET_CO_W_API \
    GITHUB_TOKEN=TOKEN_Z_PRAWEM_PUSH \
    python executor.py
"""

import json
import os
import queue
import shutil
import subprocess
import tempfile
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BENGOS_API_URL = os.environ.get("BENGOS_API_URL", "http://127.0.0.1:8000").rstrip("/")
BENGOS_WORKER_TOKEN = os.environ.get("BENGOS_WORKER_TOKEN", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
AIDER_MODEL = os.environ.get("AIDER_MODEL", "gpt-4o-mini")
LISTEN_HOST = os.environ.get("EXECUTOR_LISTEN_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("EXECUTOR_LISTEN_PORT", "8091"))
# Gałąź bazowa pull requestów. Executor klonuje domyślną gałąź repozytorium,
# ale GitHub API wymaga jawnej nazwy "base" — bez tej zmiennej PR trafiałby
# zawsze na main, nawet w repozytoriach z inną główną gałęzią.
BASE_BRANCH = os.environ.get("EXECUTOR_BASE_BRANCH", "main")
# Sekundy na jeden krok (klon, Aider, push). LLM potrafi milczeć długo,
# ale wieczne czekanie zawiesza kolejkę na jednym zleceniu.
STEP_TIMEOUT = int(os.environ.get("EXECUTOR_STEP_TIMEOUT", "1800"))

_jobs: "queue.Queue[dict]" = queue.Queue()


def _report(job_id: str, payload: dict) -> None:
    """Raport do endpointu zwrotnego API — jedyna droga wyniku.

    Best-effort z logiem porażki: gdy API nie odpowiada, zlecenie wisi
    w "queued" i można je powtórzyć — zlecenie jest w bazie API,
    nie w pamięci tego procesu.
    """
    if not BENGOS_WORKER_TOKEN:
        print("[executor] Brak BENGOS_WORKER_TOKEN — nie mam jak zameldować wyniku.")
        return
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BENGOS_API_URL}/v1/git/jobs/{job_id}/complete",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "X-Bengos-Worker": BENGOS_WORKER_TOKEN},
    )
    try:
        urllib.request.urlopen(req, timeout=30).read()
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        print(f"[executor] Raport {payload.get('state')} dla {job_id} nie doszedł: {exc}")


def _run(command: list[str], cwd: str | None = None, env: dict | None = None) -> str:
    """subprocess z limitem czasu — jeden krok nie może zawiesić kolejki."""
    completed = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        timeout=STEP_TIMEOUT,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            "Polecenie '" + " ".join(command[:3]) + "...' nie udało się: " + (completed.stderr or completed.stdout)[-1500:]
        )
    return completed.stdout


def _open_pull_request(repository: str, branch: str, request: str) -> str:
    """Pull request przez REST GitHuba — nigdy bezpośredni push do main."""
    data = json.dumps(
        {
            "title": "BENGOS: " + request[:69],
            "head": branch,
            "base": BASE_BRANCH,
            "body": "Plan wykonany przez executora (Aider). Zatwierdził: użytkownik przez bramkę zgody.",
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.github.com/repos/" + repository + "/pulls",
        data=data,
        method="POST",
        headers={
            "Authorization": "Bearer " + GITHUB_TOKEN,
            "Accept": "application/vnd.github+json",
            "User-Agent": "TIKBENGOS-Executor",
        },
    )
    body = json.loads(urllib.request.urlopen(req, timeout=60).read())
    return body["html_url"]


def _execute(job: dict) -> None:
    job_id = job["jobId"]
    plan_id = str(job.get("planId", ""))
    repository = str(job["request"] and job["repository"])  # "owner/name"
    request_text = str(job["request"])[:4000]
    branch = "bengos/plan-" + plan_id[:8]
    workdir = tempfile.mkdtemp(prefix="bengos-executor-")
    try:
        _report(job_id, {"state": "running", "stage": "Klonowanie repozytorium", "progress": 0.1})
        # Token w URL nigdy nie trafia do logów — klonujemy cicho, a litery
        # w _run są tylko pierwszymi trzema słowami polecenia.
        clone_url = f"https://x-access-token:{GITHUB_TOKEN}@github.com/{repository}.git"
        _run(["git", "clone", "--depth", "1", clone_url, workdir + "/repo"])
        repo_dir = workdir + "/repo"
        _run(["git", "config", "user.email", "executor@tikbengos.local"], cwd=repo_dir)
        _run(["git", "config", "user.name", "TIKBENGOS Executor"], cwd=repo_dir)
        _run(["git", "checkout", "-b", branch], cwd=repo_dir)

        _report(job_id, {"state": "running", "stage": "Aider pisze zmiany", "progress": 0.3})
        # Aider dziedziczy środowisko: OPENAI_API_KEY albo OLLAMA_API_BASE
        # ustawia operator maszyny. AIDER_MODEL decyduje, którego modelu
        # użyje -- decyzja wdrożeniowa, nie kodowa.
        output = _run(
            ["aider", "--yes-always", "--no-git", "--model", AIDER_MODEL, "--message", request_text],
            cwd=repo_dir,
            env={**os.environ},
        )

        _run(["git", "add", "-A"], cwd=repo_dir)
        changed = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            cwd=repo_dir, capture_output=True, text=True, timeout=60,
        ).stdout.strip()
        if not changed:
            raise RuntimeError(
                "Aider nie zmienił żadnego pliku. Najpewniej opis funkcji był niejasny "
                "albo model odmówił zmian — plan warto doprecyzować."
            )
        files_touched = [line for line in changed.splitlines() if line]

        _run(["git", "commit", "-m", "BENGOS: " + request_text[:72]], cwd=repo_dir)
        _report(job_id, {"state": "running", "stage": "Push gałęzi i pull request", "progress": 0.8})
        _run(["git", "push", "origin", "HEAD"], cwd=repo_dir)
        pull_url = _open_pull_request(repository, branch, request_text)

        _report(
            job_id,
            {
                "state": "succeeded",
                "summary": (output or "Zmiany wykonane przez Aidera.")[-4000:],
                "steps": [
                    {
                        "id": "aider",
                        "description": "Zmiany Aidera na gałęzi " + branch,
                        "status": "succeeded",
                        "output": (output or "")[-2000:],
                    }
                ],
                "filesTouched": files_touched,
                "pullRequestUrl": pull_url,
            },
        )
        print(f"[executor] Zlecenie {job_id} zakończone: {pull_url}")
    except Exception as exc:  # noqa: BLE001 - executor musi żyć dalej
        _report(job_id, {"state": "failed", "error": str(exc)[:2000]})
        print(f"[executor] Zlecenie {job_id} nieudane: {exc}")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def _worker_loop() -> None:
    while True:
        job = _jobs.get()
        _execute(job)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 — nazwa z http.server
        if self.path != "/jobs":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            job = {
                "jobId": str(payload["jobId"]),
                "planId": str(payload.get("planId", "")),
                "repository": str(payload["repository"]),
                "request": str(payload["request"]),
            }
        except (ValueError, KeyError) as exc:
            self.send_error(400, str(exc))
            return
        _jobs.put(job)
        self.send_response(202)
        self.end_headers()

    def log_message(self, fmt: str, *args) -> None:
        print("[executor] " + fmt % args)


def main() -> None:
    if not BENGOS_WORKER_TOKEN:
        raise SystemExit("Brak BENGOS_WORKER_TOKEN — executor nie zamelduje wyniku.")
    if not GITHUB_TOKEN:
        raise SystemExit("Brak GITHUB_TOKEN — executor nie sklonuje ani nie wypchnie niczego.")
    threading.Thread(target=_worker_loop, daemon=True).start()
    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), Handler)
    print(f"[executor] Słucham na {LISTEN_HOST}:{LISTEN_PORT}, API: {BENGOS_API_URL}, model: {AIDER_MODEL}")
    server.serve_forever()


if __name__ == "__main__":
    main()
