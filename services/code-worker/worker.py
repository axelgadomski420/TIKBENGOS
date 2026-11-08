#!/usr/bin/env python3
"""Worker agenta kodującego — BENGOS Dev.

Serwis w `services/code-worker`. Bierze zlecenie z API, prowadzi agenta
przez plan zmian i zwraca wynik — ale NICZEGO nie zapisuje bez zatwierdzenia
człowieka. To nie ostrożność, to zasada z kontraktu
(`packages/core/src/projects.ts`): `ChangePlan` jest propozycją, `PlanState`
ma stan `awaiting-approval`, a `ApprovePlanRequest` wymaga pola `confirm`
z wartością `create-branch-and-pull-request`. Bez tego serwer odmawia.

── CZYM TEN WORKER JEST, A CZYM NIE JEST ────────────────────────────────
JEST opakowaniem wokół agenta z `TIKCODING` (fork Self-Improving Coding
Agent, Maxime Robeyns, Martin Szummer, Laurence Aitchison; ICLR 2025).
NIE JEST jego kopią ani zamiennikiem: kod agenta leży w obrazie jako
zależność, a ten plik to warstwa, która przyjmuje zlecenie w kształcie
kontraktu BENGOS, uruchamia agenta w piaskownicy i zwraca plan w kształcie,
którу rozumie interfejs.

── DLACZEGO OSOBNY PROCES, A NIE CZĘŚĆ API ──────────────────────────────
Agent wykonuje polecenia powłoki. README TIKCODING mówi to wprost:
uruchamiaj wyłącznie w kontenerze, bo inaczej agent grzebie w systemie plików
hosta. Gdyby to było w procesie Django, jedno polecenie agenta sięgałoby
do bazy i do kluczy użytkowników. Osobny kontener z własnym systemem plików
to nie wygoda — to warunek, bez którego ten moduł nie może istnieć.

── CZEGO TEN PLIK NIE ROBI ──────────────────────────────────────────────
Nie woła API GitHub. Gałąź, commit i pull request powstają w `services/api`,
gdzie jest token użytkownika i gdzie każda operacja ląduje w dzienniku
audytu. Worker zwraca PLAN i PATCH; zapis jest po stronie API, po
zatwierdzeniu przez człowieka.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

# ── Limity ───────────────────────────────────────────────────────────────
# Twarde, bo agent bez limitu potrafi pracować godzinami i zjeść całą maszynę.
# Wartości są dobrane do darmowej maszyny ARM (2 rdzenie, 24 GB), na której
# stoi to wdrożenie — nie do maszyny deweloperskiej.
MAX_STEPS = 40
STEP_TIMEOUT_SECONDS = 300
TOTAL_TIMEOUT_SECONDS = 1_800  # 30 minut na jedno zlecenie
MAX_PATCH_BYTES = 512_000
MAX_PLAN_STEPS = 12


class WorkerError(Exception):
    """Błąd do pokazania użytkownikowi. Nie wycieka stosu wywołań."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class PlanStep:
    """Krok planu. Kształt z kontraktu `PlanStep` w `packages/core/src/projects.ts`."""

    id: str
    description: str
    status: str = "pending"
    output: str | None = None


@dataclass
class ChangePlan:
    """Plan zmian. Kształt z kontraktu `ChangePlan`."""

    id: str
    repositoryId: str
    request: str
    summary: str
    steps: list[PlanStep] = field(default_factory=list)
    filesTouched: list[str] = field(default_factory=list)
    state: dict[str, Any] = field(default_factory=lambda: {"state": "drafting"})
    createdAt: str = ""


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def preflight() -> dict[str, str]:
    """Sprawdza, co jest potrzebne, ZANIM zacznie się jakakolwiek praca.

    Ten sam wzorzec co `validate_credential()` w `accounts/providers.py`:
    lepiej odmówić na wejściu z wyjaśnieniem niż w połowie drogi bez śladu.

    Klucz dostawcy jest wymagany, bo agent bez modelu nie zrobi ani jednego
    kroku. Sprawdzamy też `git`, bo bez niego powstanie plan, ale nie
    powstanie patch.
    """
    provider_key = ""
    for variable in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "DEEPSEEK_API_KEY"):
        if os.environ.get(variable, "").strip():
            provider_key = variable
            break

    if not provider_key:
        raise WorkerError(
            "unavailable",
            "Worker nie ma klucza do żadnego modelu. Ustaw w `.env` jeden z: "
            "ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY. "
            "Klucz jest po stronie serwera, nie użytkownika — agent działa "
            "w piaskownicy i nie może dostać klucza z formularza.",
        )

    if shutil.which("git") is None:
        raise WorkerError("unavailable", "Brak `git` w obrazie — bez niego nie powstanie patch.")

    return {"providerKey": provider_key}


def prepare_workspace(repo_url: str, branch: str, token: str | None) -> Path:
    """Klonuje repozytorium do KATALOGU TYMCZASOWEGO.

    ── DLACZEGO KATALOG TYMCZASOWY, A NIE STAŁY ────────────────────────────
    Agent modyfikuje pliki. Gdyby pracował na stałym katalogu, drugie zlecenie
    zobaczyłoby zmiany pierwszego, a wina za to spadłaby na model. Świeży klon
    na każde zlecenie to jedyny sposób, żeby wynik był odtwarzalny.

    ── TOKEN JEST OPCJONALNY I TAK MA ZOSTAĆ ──────────────────────────────
    Bez tokenu klonujemy publicznie — wystarczy do planu. Token jest potrzebny
    dopiero do zapisu, a zapis robi API, nie worker. Gdy token jest, wstawiamy
    go do adresu, ale nigdy nie zapisujemy w logu: adres z tokenem nie może
    trafić do wyjścia, bo wyjście widzi użytkownik.
    """
    workspace = Path(tempfile.mkdtemp(prefix="bengos-code-"))
    target = workspace / "repo"

    url = repo_url
    if token and url.startswith("https://"):
        # `https://x-access-token:TOKEN@github.com/...` — schemat, który
        # GitHub przyjmuje dla tokenów aplikacji i PAT-ów w klonowaniu.
        url = url.replace("https://", f"https://x-access-token:{token}@", 1)

    result = subprocess.run(
        ["git", "clone", "--depth", "1", "--branch", branch, url, str(target)],
        capture_output=True,
        text=True,
        timeout=180,
    )
    if result.returncode != 0:
        # Wyjście `git` MOŻE zawierać adres z tokenem — czyścimy je, zanim
        # trafi do komunikatu. Wyciek tokenu w błędzie to wyciek tokenu.
        safe = result.stderr.replace(token, "***") if token else result.stderr
        raise WorkerError(
            "not_found",
            "Nie udało się sklonować repozytorium "
            f"({branch}). Sprawdź, czy repozytorium istnieje i czy token ma "
            f"prawo czytania. Git: {safe.strip()[:400]}",
        )
    return target


def file_tree(root: Path, limit: int = 120) -> str:
    """Drzewo plików bez `node_modules`, `.git` i katalogów wynikowych.

    Bez tych wykluczeń drzewo miałoby dziesiątki tysięcy linii i zjadłoby
    cały kontekst modelu, zanim ten zobaczy cokolwiek użytecznego.
    """
    skip = {".git", "node_modules", "__pycache__", ".next", "dist", "build", ".venv", "venv"}
    lines: list[str] = []
    for path in sorted(root.rglob("*")):
        if any(part in skip for part in path.parts):
            continue
        if path.is_file():
            lines.append(str(path.relative_to(root)))
        if len(lines) >= limit:
            lines.append(f"... (ucięte na {limit} plikach)")
            break
    return "\n".join(lines) or "(puste repozytorium)"


def build_plan_prompt(request: str, tree: str) -> str:
    """Prompt dla agenta — TYLKO plan, bez zmiany plików.

    ── DLACZEGO OSOBNY KROK NA PLAN ──────────────────────────────────────
    Kontrakt ma stan `awaiting-approval`, czyli użytkownik widzi plan PRZED
    wykonaniem. Gdyby agent od razu zmieniał pliki, ten stan byłby fikcją:
    nie da się zatwierdzić czegoś, co już się stało.

    Dlatego pierwsze wywołanie modelu prosi wyłącznie o plan w JSON-ie.
    Nic nie jest zapisywane, nic nie jest uruchamiane.
    """
    return (
        "Jesteś agentem kodującym w projekcie BENGOS.\n"
        "Otrzymujesz opis funkcji od użytkownika i drzewo plików repozytorium.\n\n"
        "ZADANIE: przygotuj PLAN ZMIAN. Nie zmieniaj plików. Nie uruchamiaj poleceń.\n\n"
        f"OPIS FUNKCJI:\n{request}\n\n"
        f"DRZEWO PLIKÓW (skrócone):\n{tree}\n\n"
        "Odpowiedz WYŁĄCZNIE obiektem JSON w tym kształcie:\n"
        "{\n"
        '  "summary": "jedno zdanie, co zostanie zmienione i dlaczego",\n'
        '  "steps": [{"description": "konkretny krok", "files": ["ścieżka/pliku"]}],\n'
        '  "filesTouched": ["ścieżka/pliku"]\n'
        "}\n"
        f"Maksymalnie {MAX_PLAN_STEPS} kroków. Każdy krok musi wskazywać plik, "
        "którego dotyczy. Jeśli zadanie jest niejasne, w `summary` napisz wprost, "
        "czego brakuje, a `steps` zostaw puste."
    )


def parse_plan(raw: str, request: str, repository_id: str) -> ChangePlan:
    """Zamienia odpowiedź modelu na kontrakt. Odpowiedź niepewna = błąd.

    ── NIE ZGADUJEMY KSZTAŁTU ────────────────────────────────────────────
    Model potrafi owinąć JSON w blok kodu, dopisać zdanie przed nim albo
    zwrócić listę zamiast obiektu. Próba „naprawienia” tego po cichu dałaby
    plan, którego nikt nie napisał. Dlatego albo kształt się zgadza, albo
    worker zwraca błąd i mówi, co dostał.
    """
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        cleaned = cleaned.rsplit("```", 1)[0]

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise WorkerError(
            "internal",
            f"Model nie zwrócił poprawnego JSON-a ({exc.msg}). Pierwsze 200 znaków: "
            f"{raw.strip()[:200]}",
        ) from exc

    if not isinstance(parsed, dict):
        raise WorkerError("internal", "Model zwrócił plan w kształcie, którego nie znamy.")

    summary = str(parsed.get("summary") or "").strip()
    if not summary:
        raise WorkerError("internal", "Plan nie ma podsumowania — nie ma czego zatwierdzać.")

    steps: list[PlanStep] = []
    for index, item in enumerate((parsed.get("steps") or [])[:MAX_PLAN_STEPS], start=1):
        description = (
            str(item.get("description") or "").strip()
            if isinstance(item, dict)
            else str(item).strip()
        )
        if description:
            steps.append(PlanStep(id=f"step-{index}", description=description))

    files = [str(f) for f in (parsed.get("filesTouched") or []) if str(f).strip()]

    return ChangePlan(
        id=str(uuid.uuid4()),
        repositoryId=repository_id,
        request=request,
        summary=summary,
        steps=steps,
        filesTouched=files[:200],
        # Plan zawsze ląduje w tym stanie po zbudowaniu. Dalej prowadzi go
        # API: `approved` wymaga pola `confirm` od człowieka.
        state={"state": "awaiting-approval"} if steps else {"state": "drafting"},
        createdAt=_now(),
    )


def produce_patch(root: Path) -> str:
    """Zwraca `git diff` z katalogu pracy. Patch, nie zmienione pliki.

    ── DLACZEGO PATCH ────────────────────────────────────────────────────
    Kontrakt `ChangePlan.state.applied` niesie `pullRequestUrl`, a do pull
    requesta idzie gałąź z commitem. Patch jest najmniejszym nośnikiem zmiany:
    API może go zastosować, pokazać użytkownikowi do wglądu i cofnąć, nie
    przenosząc całych plików. Przy dużym pliku różnica to kilobajty zamiast
    megabajtów.
    """
    subprocess.run(["git", "add", "-A"], cwd=root, capture_output=True, text=True, timeout=60)
    result = subprocess.run(
        ["git", "diff", "--cached", "--no-color"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise WorkerError("internal", "Nie udało się przygotować patcha.")

    patch = result.stdout
    if len(patch.encode("utf-8")) > MAX_PATCH_BYTES:
        raise WorkerError(
            "bad_request",
            f"Zmiana przekracza {MAX_PATCH_BYTES // 1000} kB. Podziel zadanie na mniejsze.",
        )
    return patch


def run_agent_plan(
    request: str, repository_id: str, repo_url: str, branch: str, token: str | None
) -> tuple[ChangePlan, str]:
    """Uruchamia agenta w trybie PLAN. Nie zmienia plików.

    Zwraca plan i drzewo plików, żeby użytkownik widział, na czym agent
    pracował.
    """
    root = prepare_workspace(repo_url, branch, token)
    tree = file_tree(root)

    # ── TU WCHODZI AGENT ──────────────────────────────────────────────────
    # Wywołanie agenta z TIKCODING. Na razie to miejsce jest oznaczone
    # jawnie i zwraca błąd, a nie udaje, że działa: obrazu z agentem nie ma
    # jeszcze w `docker-compose`, więc wołanie zwróciłoby „command not found”,
    # a to jest dokładnie ta atrapa, której brief zakazuje.
    #
    # Gdy obraz `tikbengos-code-agent` będzie gotowy, ten blok wygląda tak:
    #   result = subprocess.run(
    #       ["python", "-m", "base_agent.agent", "--plan-only",
    #        "--repo", str(root), "-p", request],
    #       capture_output=True, text=True, timeout=TOTAL_TIMEOUT_SECONDS,
    #   )
    #   return parse_plan(result.stdout, request, repository_id), tree
    if os.environ.get("CODE_AGENT_AVAILABLE", "").strip() != "1":
        raise WorkerError(
            "unavailable",
            "Agent kodujący nie jest jeszcze wdrożony w tym środowisku. "
            "Worker przyjmuje zlecenia i ma pełną ścieżkę planu, ale obraz "
            "z agentem (`services/code-worker/Dockerfile`) nie jest podniesiony. "
            "Ustaw CODE_AGENT_AVAILABLE=1, gdy obraz będzie gotowy.",
        )

    raise WorkerError(
        "internal",
        "Ścieżka wywołania agenta jest gotowa, ale nie podłączona do modelu. "
        "Patrz komentarz w `run_agent_plan` — to jedyne miejsce do zmiany.",
    )


def handle_request(payload: dict[str, Any]) -> dict[str, Any]:
    """Punkt wejścia. Kontrakt wejścia i wyjścia opisany w `docs/dev-agent.md`."""
    request = str(payload.get("request") or "").strip()
    if not request:
        raise WorkerError("bad_request", "Brak opisu funkcji w polu `request`.")
    if len(request) > 4_000:
        raise WorkerError("bad_request", "Opis funkcji może mieć najwyżej 4000 znaków.")

    repository_id = str(payload.get("repositoryId") or "").strip()
    repo_url = str(payload.get("repoUrl") or "").strip()
    branch = str(payload.get("branch") or "main").strip()
    token = os.environ.get("GITHUB_READ_TOKEN", "").strip() or None

    if not repository_id or not repo_url:
        raise WorkerError(
            "bad_request",
            "Brak `repositoryId` albo `repoUrl`. Worker nie zgaduje repozytorium — "
            "bierze je z połączenia, które użytkownik zatwierdził w module Dev.",
        )

    # Adres musi być HTTPS i wskazywać na GitHuba. Worker nie może być
    # narzędziem do klonowania dowolnego adresu — powód jest ten sam co
    # w `providers.py`: adres pochodzi z katalogu, nie z wejścia.
    if not repo_url.startswith("https://github.com/"):
        raise WorkerError(
            "bad_request",
            "Adres repozytorium musi zaczynać się od `https://github.com/`. "
            "Worker nie klonuje adresów spoza GitHuba.",
        )

    plan, tree = run_agent_plan(request, repository_id, repo_url, branch, token)
    return {"plan": asdict(plan), "fileTree": tree}


def main() -> int:
    parser = argparse.ArgumentParser(description="Worker agenta kodującego BENGOS Dev.")
    parser.add_argument("--input", help="Plik JSON ze zleceniem. Bez tego czyta stdin.")
    parser.add_argument(
        "--check", action="store_true", help="Tylko sprawdzenie konfiguracji, bez zlecenia."
    )
    args = parser.parse_args()

    try:
        config = preflight()
        if args.check:
            print(json.dumps({"status": "ok", "provider": config["providerKey"]}, ensure_ascii=False))
            return 0

        if args.input:
            payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
        else:
            payload = json.loads(sys.stdin.read() or "{}")

        print(json.dumps(handle_request(payload), ensure_ascii=False))
        return 0

    except WorkerError as error:
        # Błąd w kształcie `ApiError` z kontraktu — ten sam, którego używa
        # każdy inny punkt API. Interfejs nie musi zgadywać, co dostał.
        print(json.dumps({"code": error.code, "message": error.message}, ensure_ascii=False))
        return 1
    except Exception:  # pragma: no cover - ścieżka awaryjna
        # Bez stosu wywołań na wyjściu: w środowisku produkcyjnym to wyciek,
        # nie informacja. Ta sama zasada co `handler(Exception)` w `urls.py`.
        print(
            json.dumps(
                {"code": "internal", "message": "Coś poszło nie tak po stronie workera."},
                ensure_ascii=False,
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
