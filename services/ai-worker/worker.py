#!/usr/bin/env python3
"""Worker asystenta — Ollama jako silnik modelu.

Serwis w `services/ai-worker`. Bierze zadanie od API, woła Ollamę po
`/api/chat` i oddaje odpowiedź na endpoint zwrotny API. Nic nie zapisuje,
nic nie czyta z bazy — rozmawia wyłącznie po HTTP.

── DLACZEGO OLLAMA, A NIE DOSTAWCA Z KLUCZEM ──────────────────────────────
Model chodzi na tej samej maszynie co reszta stosu, więc:
- nie ma klucza, który mógłby wyciec albo zostać obciążony,
- nie ma kosztu za token — to jedyny powód, dla którego da się to trzymać
  na darmowej maszynie Oracle,
- nie ma drugiej tożsamości: użytkownik nie zakłada konta u nikogo, żeby
  asystent odpowiedział. Zostaje jedna tożsamość BENGOS z briefu.

── ZADANIE JEST ASYNCHRONICZNE I TAK ZOSTAJE ──────────────────────────────
API tworzy `AssistantJob` i zwraca 202 z `jobId`. Ten worker odbiera zlecenie,
oddaje `running` z postępem, a na końcu `succeeded` z odpowiedzią albo
`failed` z komunikatem. Kontrakt `AssistantCompleteIn` w `services/api/ai/`
jest jedynym kształtem, w jakim raport wychodzi — bez własnych wariantów.

── CZEGO TEN PLIK NIE ROBI ────────────────────────────────────────────────
Nie generuje odpowiedzi "z ogólnej wiedzy", gdy model milczy. Endpoint API
mówi wprost: serwer żadnej wiedzy nie ma. Porażka Ollamy to `failed`
z ludzkim wyjaśnieniem, nigdy pusta odpowiedź.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

# ── Limity ───────────────────────────────────────────────────────────────
# Twarde, bo model bez limitu potrafi myśleć w nieskończoność i trzymać
# proces na darmowej maszynie. `ANSWER_MAX` jest ten sam co w modelu
# `AssistantJob` (20000) — ucinamy TU, żeby przez sieć nie szło nic,
# czego baza i tak by nie przyjęła.
REQUEST_TIMEOUT_SECONDS = 180
ANSWER_MAX = 20_000
PROMPT_MAX = 4_000

# ── System prompt ────────────────────────────────────────────────────────
# Jedno zdanie o języku i jedno o granicy wiedzy. Bez tego model odpowiada
# po angielsku na polskie pytanie albo zgaduje fakty o projekcie, którego
# nie zna — a obie rzeczy wyglądają na błąd aplikacji, nie na zachowanie
# modelu.
SYSTEM_PROMPT = (
    "Jesteś asystentem BENGOS — jednego społecznościowego systemu operacyjnego. "
    "Odpowiadaj w języku pytania; przy pytaniu po polsku odpowiadaj po polsku. "
    "Jeżeli czegoś nie wiesz o tym projekcie, powiedz wprost, że nie wiesz — "
    "nie zgaduj. Odpowiadaj zwięźle i konkretnie."
)


class WorkerError(Exception):
    """Błąd do pokazania użytkownikowi. Nie wycieka stosu wywołań."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class Config:
    """Konfiguracja z środowiska, sprawdzona ZANIM ruszy jakakolwiek praca."""

    ollama_url: str
    model: str
    api_url: str
    worker_token: str


def load_config() -> Config:
    """Czyta środowisko i odmawia na wejściu, gdy czegoś brakuje.

    ── DLACZEGO BEZ WARTOŚCI DOMYŚLNYCH ──────────────────────────────────
    Ta sama zasada co w `settings.py` API i w `code-worker`: domyślka na
    publicznej maszynie to konfiguracja, która WYGLĄDA na działającą, a nią
    nie jest. Worker, który wystartuje z pustym `OLLAMA_URL`, padnie dopiero
    przy pierwszym pytaniu — a wtedy wina spadnie na model.
    """
    ollama_url = os.environ.get("OLLAMA_URL", "").strip()
    model = os.environ.get("ASSISTANT_MODEL", "").strip()
    api_url = os.environ.get("API_INTERNAL_URL", "").strip()
    worker_token = os.environ.get("BENGOS_WORKER_TOKEN", "").strip()

    missing = [
        name
        for name, value in (
            ("OLLAMA_URL", ollama_url),
            ("ASSISTANT_MODEL", model),
            ("API_INTERNAL_URL", api_url),
            ("BENGOS_WORKER_TOKEN", worker_token),
        )
        if not value
    ]
    if missing:
        raise WorkerError(
            "unavailable",
            "Worker asystenta nie ma konfiguracji: brakuje "
            + ", ".join(missing)
            + ". Uzupełnij `.env` — worker nie ma wartości domyślnych, bo "
            "domyślka udawałaby działającą konfigurację.",
        )

    return Config(
        ollama_url=ollama_url.rstrip("/"),
        model=model,
        api_url=api_url.rstrip("/"),
        worker_token=worker_token,
    )


def _post_json(url: str, payload: dict, timeout: int, headers: dict | None = None) -> dict:
    """POST z JSON-em i JSON-em w odpowiedzi. Jedyne wyjście na świat.

    `urllib.request` zamiast `requests`/`httpx`, bo to jedyne miejsce,
    w którym ten obraz dotyka sieci — jedna funkcja nie jest warta
    zależności (patrz komentarz w `requirements.txt`).
    """
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "TIKBENGOS-Assistant-Worker",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
    if not raw.strip():
        return {}
    return json.loads(raw)


def check_model(config: Config) -> str:
    """Sprawdza, czy Ollama żyje i czy model jest pobrany.

    ── DLACZEGO TO JEST OSOBNY KROK ──────────────────────────────────────
    Bez tego sprawdzenia worker wygląda na gotowego, a pierwsze pytanie
    kończy się „model not found” po minutach czekania. `--check` ma
    odpowiedzieć na pytanie „czy da się pracować”, a nie „czy proces wstał”.
    """
    try:
        with urllib.request.urlopen(f"{config.ollama_url}/api/tags", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, json.JSONDecodeError) as exc:
        raise WorkerError(
            "unavailable",
            f"Ollama nie odpowiada pod {config.ollama_url}. Sprawdź, czy usługa "
            f"`ollama` stoi i czy wolumen z modelami jest podłączony. ({exc})",
        ) from exc

    names = {str(item.get("name", "")) for item in payload.get("models", [])}
    # Ollama zwraca nazwy z etykietą (`llama3.2:3b`), a `ASSISTANT_MODEL`
    # bywa podany bez niej. Porównujemy więc także część przed dwukropkiem,
    # bo inaczej `llama3.2` zgłosiłoby brak modelu, który JEST pobrany.
    if config.model in names or any(n.split(":")[0] == config.model for n in names):
        return config.model

    raise WorkerError(
        "unavailable",
        f"Ollama nie ma modelu `{config.model}`. Pobierz go NA MASZYNIE "
        f"(`docker compose exec ollama ollama pull {config.model}`) — worker "
        f"nie ściąga modeli, bo to gigabajty i decyzja właściciela.",
    )


def generate(config: Config, prompt: str) -> str:
    """Woła model i zwraca samą odpowiedź.

    ── DLACZEGO `/api/chat`, A NIE `/api/generate` ───────────────────────
    `/api/chat` bierze role (`system`, `user`), więc system prompt da się
    ustawić tak, jak przewiduje to format Ollamy. `/api/generate` dokleja
    go do tekstu i model traktuje go jak treść użytkownika — a wtedy
    polecenie „odpowiedz po polsku” bywa ignorowane.
    """
    try:
        payload = _post_json(
            f"{config.ollama_url}/api/chat",
            {
                "model": config.model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "options": {"temperature": 0.6},
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8")[:300]
        except Exception:  # pragma: no cover - treść błędu bez znaczenia
            detail = ""
        raise WorkerError(
            "internal",
            f"Model odrzucił zapytanie (HTTP {exc.code}). {detail}".strip(),
        ) from exc
    except (urllib.error.URLError, OSError) as exc:
        raise WorkerError(
            "unavailable",
            f"Nie udało się dojść do modelu: {exc}. Pytanie zapisano jako nieudane — "
            "nic nie udajemy.",
        ) from exc
    except json.JSONDecodeError as exc:
        raise WorkerError(
            "internal", "Model odpowiedział w kształcie, którego nie znamy."
        ) from exc

    message = payload.get("message") or {}
    answer = str(message.get("content") or "").strip()

    if not answer:
        # Pusta odpowiedź po udanym żądaniu jest błędem stanu, nie kształtu.
        # Endpoint zwrotny API odrzuca sukces bez `answer`, więc nie wysyłamy
        # sukcesu, który i tak wróciłby jako 400.
        raise WorkerError(
            "internal",
            "Model nie zwrócił odpowiedzi. Spróbuj ponownie albo wybierz inny model.",
        )

    return answer[:ANSWER_MAX]


def complete(config: Config, job_id: str, report: dict) -> None:
    """Oddaje raport na endpoint zwrotny API.

    ── TO JEDYNA DROGA, KTÓRĄ ODPOWIEDŹ WIDAĆ W APLIKACJI ────────────────
    API nie ma wag modelu i nie udaje, że ma — bez tego POST-a pytanie
    wisiałoby w `queued` przy działającym modelu. Sekret idzie w nagłówku
    `X-Bengos-Worker`, tak samo jak dla workera muzyki i executora zmian.
    """
    try:
        _post_json(
            f"{config.api_url}/api/ai/jobs/{job_id}/complete",
            report,
            timeout=30,
            headers={"X-Bengos-Worker": config.worker_token},
        )
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        # Nie udajemy, że raport dotarł: bez niego zadanie zostaje w stanie
        # `running` i to jest prawda o tym stanie.
        raise WorkerError(
            "unavailable",
            f"Nie udało się oddać raportu do API: {exc}. Zadanie zostanie "
            "w stanie `running` do czasu ponowienia.",
        ) from exc
    except json.JSONDecodeError as exc:
        raise WorkerError(
            "internal", "API odpowiedziało w kształcie, którego nie znamy."
        ) from exc


def handle_request(config: Config, payload: dict) -> dict:
    """Punkt wejścia jednego zlecenia.

    Kształt wejścia: `{"jobId": "...", "prompt": "..."}` — dokładnie to,
    co wysyła `ask_assistant` w `services/api/ai/api.py`.

    Kolejność jest celowa: najpierw raport `running`, potem model, potem
    wynik. Użytkownik ma zobaczyć, że zadanie ruszyło, ZANIM przyjdzie
    odpowiedź — inaczej przy wolnym modelu ekran stoi bez zmian.
    """
    job_id = str(payload.get("jobId") or "").strip()
    prompt = str(payload.get("prompt") or "").strip()

    if not job_id:
        raise WorkerError("bad_request", "Brak `jobId` — nie ma do czego oddać odpowiedzi.")
    if not prompt:
        raise WorkerError("bad_request", "Brak pytania w polu `prompt`.")
    if len(prompt) > PROMPT_MAX:
        prompt = prompt[:PROMPT_MAX]

    complete(
        config,
        job_id,
        {"state": "running", "stage": "Model czyta pytanie", "progress": 0.1},
    )

    started = time.monotonic()
    answer = generate(config, prompt)

    return {
        "state": "succeeded",
        "stage": "Gotowe",
        "progress": 1.0,
        "answer": answer,
        "seconds": round(time.monotonic() - started, 1),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Worker asystenta BENGOS na Ollamie.")
    parser.add_argument("--input", help="Plik JSON ze zleceniem. Bez tego czyta stdin.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Tylko sprawdzenie konfiguracji i dostępności modelu, bez zlecenia.",
    )
    parser.add_argument(
        "--serve",
        action="store_true",
        help=(
            "Tryb usługi: worker stoi i czeka na zlecenia. Bez tej flagi "
            "przetwarza jedno zlecenie i kończy pracę."
        ),
    )
    args = parser.parse_args()

    try:
        config = load_config()
        model = check_model(config)
    except WorkerError as error:
        print(json.dumps({"code": error.code, "message": error.message}, ensure_ascii=False))
        return 1

    if args.check:
        print(
            json.dumps(
                {"status": "ok", "model": model, "ollama": config.ollama_url},
                ensure_ascii=False,
            )
        )
        return 0

    if not args.serve:
        # ── JEDNO ZLECENIE ──────────────────────────────────────────────
        # API woła workera POST-em z zadaniem, więc tryb jednorazowy jest
        # tym, którego używa produkcja: proces startuje, pracuje, oddaje
        # raport i kończy. `--serve` jest dla pracy lokalnej.
        payload: dict = {}
        try:
            if args.input:
                with open(args.input, encoding="utf-8") as handle:
                    payload = json.loads(handle.read())
            else:
                payload = json.loads(sys.stdin.read() or "{}")

            result = handle_request(config, payload)
            print(json.dumps(result, ensure_ascii=False))
            return 0
        except WorkerError as error:
            job_id = str(payload.get("jobId") or "").strip() if isinstance(payload, dict) else ""
            if job_id:
                # Porażka MUSI dotrzeć do API — inaczej zadanie wisi
                # w `running` na zawsze i użytkownik nie wie, co się stało.
                try:
                    complete(config, job_id, {"state": "failed", "error": error.message})
                except WorkerError:
                    pass
            print(json.dumps({"code": error.code, "message": error.message}, ensure_ascii=False))
            return 1
        except json.JSONDecodeError:
            print(
                json.dumps(
                    {"code": "bad_request", "message": "Zlecenie nie jest poprawnym JSON-em."},
                    ensure_ascii=False,
                )
            )
            return 1
        except Exception:  # pragma: no cover - ścieżka awaryjna
            # Bez stosu wywołań na wyjściu: w produkcji to wyciek, nie
            # informacja. Ta sama zasada co `handler(Exception)` w `urls.py`.
            print(
                json.dumps(
                    {
                        "code": "internal",
                        "message": "Coś poszło nie tak po stronie workera asystenta.",
                    },
                    ensure_ascii=False,
                )
            )
            return 1

    # ── TRYB USŁUGI ─────────────────────────────────────────────────────
    # Pętla, która czeka na zlecenia na stdin po jednej linii JSON. Nie ma
    # portu, więc nie ma powierzchni ataku; woła ją właściciel lokalnie.
    print(json.dumps({"status": "ready", "model": model}, ensure_ascii=False), flush=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request_payload = json.loads(line)
            result = handle_request(config, request_payload)
            print(json.dumps(result, ensure_ascii=False), flush=True)
        except WorkerError as error:
            print(
                json.dumps({"code": error.code, "message": error.message}, ensure_ascii=False),
                flush=True,
            )
        except json.JSONDecodeError:
            print(
                json.dumps(
                    {"code": "bad_request", "message": "Zlecenie nie jest poprawnym JSON-em."},
                    ensure_ascii=False,
                ),
                flush=True,
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
