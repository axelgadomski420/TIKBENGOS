#!/usr/bin/env python3
"""Worker asystenta — Ollama jako silnik modelu.

Serwis w `services/ai-worker`. Odbiera zlecenie od API po HTTP, woła Ollamę
po `/api/chat` i oddaje odpowiedź na endpoint zwrotny API. Nic nie zapisuje,
nic nie czyta z bazy — rozmawia wyłącznie po HTTP.

── DLACZEGO OLLAMA, A NIE DOSTAWCA Z KLUCZEM ──────────────────────────────
Model chodzi na tej samej maszynie co reszta stosu, więc:
- nie ma klucza, który mógłby wyciec albo zostać obciążony,
- nie ma kosztu za token — to jedyny powód, dla którego da się to trzymać
  na darmowej maszynie Oracle,
- nie ma drugiej tożsamości: użytkownik nie zakłada konta u nikogo, żeby
  asystent odpowiedział. Zostaje jedna tożsamość BENGOS z briefu.

── PROTOKÓŁ: PRZYJMUJEMY POST, ODPOWIADAMY 202 ────────────────────────────
`ask_assistant` w `services/api/ai/api.py` wysyła POST na
`ASSISTANT_LLM_ENDPOINT` i **nie czeka na treść odpowiedzi** — sprawdza tylko,
że połączenie się udało, i od razu zwraca użytkownikowi 202 z `jobId`.
Dlatego ten worker odpowiada 202 natychmiast, a model woła w wątku w tle.
Gdyby czekał z odpowiedzią do końca generacji, żądanie API wisiałoby minuty
i padało przy każdym restarcie workera — a to jest dokładnie ten problem,
którego architektura zadań ma unikać.

Odpowiedź powstaje WYŁĄCZNIE na endpoincie zwrotnym
`/api/ai/jobs/{id}/complete` z sekretem `BENGOS_WORKER_TOKEN`. Ten plik nie
zna modelu zadań Django i nie potrzebuje go.

── CZEGO TEN PLIK NIE ROBI ────────────────────────────────────────────────
Nie generuje odpowiedzi „z ogólnej wiedzy”, gdy model milczy. Endpoint API
mówi wprost: serwer żadnej wiedzy nie ma. Porażka Ollamy to `failed`
z ludzkim wyjaśnieniem, nigdy pusta odpowiedź.

── DLACZEGO BIBLIOTEKA STANDARDOWA ────────────────────────────────────────
`http.server` + `urllib.request` + `threading`. Jedna funkcja i jeden
endpoint nie są warte zależności; `fastapi` z uvicornem dołożyłby kilkanaście
pakietów do obrazu, który ma robić trzy rzeczy. Patrz `requirements.txt`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ── Limity ───────────────────────────────────────────────────────────────
# Twarde, bo model bez limitu potrafi myśleć w nieskończoność i trzymać
# proces na darmowej maszynie. `ANSWER_MAX` jest ten sam co w modelu
# `AssistantJob` (20000) — ucinamy TU, żeby przez sieć nie szło nic,
# czego baza i tak by nie przyjęła.
REQUEST_TIMEOUT_SECONDS = 180
ANSWER_MAX = 20_000
PROMPT_MAX = 4_000
MAX_BODY_BYTES = 64_000
PORT = 8000

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
    """POST z JSON-em i JSON-em w odpowiedzi.

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
    # Ollama zwraca nazwy z etykietą (`qwen2.5:7b`), a `ASSISTANT_MODEL`
    # bywa podany bez niej. Porównujemy więc także część przed dwukropkiem,
    # bo inaczej `qwen2.5` zgłosiłoby brak modelu, który JEST pobrany.
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


def report(config: Config, job_id: str, payload: dict) -> bool:
    """Oddaje raport na endpoint zwrotny API. Zwraca, czy się udało.

    ── TO JEDYNA DROGA, KTÓRĄ ODPOWIEDŹ WIDAĆ W APLIKACJI ────────────────
    API nie ma wag modelu i nie udaje, że ma — bez tego POST-a pytanie
    wisiałoby w `queued` przy działającym modelu. Sekret idzie w nagłówku
    `X-Bengos-Worker`, tak samo jak dla workera muzyki i executora zmian.
    """
    try:
        _post_json(
            f"{config.api_url}/api/ai/jobs/{job_id}/complete",
            payload,
            timeout=30,
            headers={"X-Bengos-Worker": config.worker_token},
        )
        return True
    except Exception as exc:  # noqa: BLE001 - raport nie może wywalić wątku
        # Nie podnosimy błędu dalej: nieudany raport nie zmieni faktu, że
        # model już odpowiedział, a wyjątek w wątku tła zabiłby tylko log.
        print(
            json.dumps(
                {
                    "level": "error",
                    "message": f"Raport dla zadania {job_id} nie dotarł do API: {exc}",
                },
                ensure_ascii=False,
            ),
            flush=True,
        )
        return False


def process_job(config: Config, job_id: str, prompt: str) -> None:
    """Cała praca nad jednym pytaniem — wołana w wątku tła.

    Kolejność jest celowa: najpierw raport `running`, potem model, potem
    wynik. Użytkownik ma zobaczyć, że zadanie ruszyło, ZANIM przyjdzie
    odpowiedź — inaczej przy wolnym modelu ekran stoi bez zmian.
    """
    report(config, job_id, {"state": "running", "stage": "Model czyta pytanie", "progress": 0.1})

    started = time.monotonic()
    try:
        answer = generate(config, prompt)
    except WorkerError as error:
        # Porażka MUSI dotrzeć do API — inaczej zadanie wisi w `running`
        # na zawsze i użytkownik nie wie, co się stało.
        report(config, job_id, {"state": "failed", "error": error.message})
        print(
            json.dumps(
                {"level": "error", "jobId": job_id, "message": error.message},
                ensure_ascii=False,
            ),
            flush=True,
        )
        return

    ok = report(
        config,
        job_id,
        {"state": "succeeded", "stage": "Gotowe", "progress": 1.0, "answer": answer},
    )
    print(
        json.dumps(
            {
                "level": "info",
                "jobId": job_id,
                "seconds": round(time.monotonic() - started, 1),
                "delivered": ok,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


class Handler(BaseHTTPRequestHandler):
    """Jeden endpoint: POST /. Wszystko inne to 404 albo 405.

    ── DLACZEGO TYLKO POST I TYLKO JEDNA ŚCIEŻKA ─────────────────────────
    API wysyła zlecenie na adres usługi bez ścieżki. Endpointów diagnostycznych
    tu nie ma: `--check` jest komendą, którą uruchamia człowiek, a nie
    publicznym adresem. Mniej powierzchni = mniej rzeczy do zepsucia.
    """

    # Konfiguracja jest na klasie, bo `http.server` tworzy nową instancję
    # handlera na każde żądanie — nie ma gdzie przekazać jej inaczej.
    config: Config

    def do_POST(self) -> None:  # noqa: N802 - nazwa narzucona przez http.server
        if self.path not in ("/", ""):
            self._json(404, {"code": "not_found", "message": "Ten adres nic nie obsługuje."})
            return

        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0:
            self._json(400, {"code": "bad_request", "message": "Brak treści zlecenia."})
            return
        if length > MAX_BODY_BYTES:
            self._json(413, {"code": "bad_request", "message": "Zlecenie jest za duże."})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"code": "bad_request", "message": "Zlecenie nie jest poprawnym JSON-em."})
            return

        if not isinstance(payload, dict):
            self._json(400, {"code": "bad_request", "message": "Zlecenie musi być obiektem."})
            return

        job_id = str(payload.get("jobId") or "").strip()
        prompt = str(payload.get("prompt") or "").strip()

        if not job_id or not prompt:
            self._json(
                400,
                {
                    "code": "bad_request",
                    "message": "Zlecenie wymaga pól `jobId` i `prompt`.",
                },
            )
            return

        if len(prompt) > PROMPT_MAX:
            prompt = prompt[:PROMPT_MAX]

        # ── 202 TERAZ, MODEL W TLE ─────────────────────────────────────
        # API czyta tylko fakt, że połączenie się udało. Czekanie tutaj
        # do końca generacji trzymałoby żądanie minuty i wywalało timeout
        # po stronie Django (gunicorn ma 60 s).
        thread = threading.Thread(
            target=process_job,
            args=(self.config, job_id, prompt),
            daemon=True,
        )
        thread.start()

        self._json(202, {"accepted": True, "jobId": job_id})

    def do_GET(self) -> None:  # noqa: N802 - nazwa narzucona przez http.server
        # Bez adresu diagnostycznego: stan sprawdza się `--check` z konsoli
        # albo stanem kontenera, a nie publicznym GET-em.
        self._json(405, {"code": "bad_request", "message": "Ten endpoint przyjmuje tylko POST."})

    def _json(self, status: int, body: dict) -> None:
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, fmt: str, *args) -> None:
        """Log w jednej linii JSON, bez adresu klienta w treści.

        Wewnętrzny adres w logu to informacja bez wartości dla właściciela,
        a szum w każdym żądaniu. Zostaje sam fakt i ścieżka.
        """
        print(
            json.dumps(
                {"level": "access", "path": self.path, "format": fmt % args},
                ensure_ascii=False,
            ),
            flush=True,
        )


def serve(config: Config, model: str) -> int:
    """Podnosi serwer i stoi, aż proces zostanie zatrzymany.

    `ThreadingHTTPServer`, nie `HTTPServer`: przy zwykłym serwerze jedno
    długie zlecenie zablokowałoby przyjmowanie kolejnych, mimo że model
    i tak pracuje poza wątkiem obsługi.
    """
    Handler.config = config
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(
        json.dumps(
            {"status": "ready", "model": model, "port": PORT, "ollama": config.ollama_url},
            ensure_ascii=False,
        ),
        flush=True,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Worker asystenta BENGOS na Ollamie.")
    parser.add_argument("--input", help="Plik JSON ze zleceniem. Bez tego czyta stdin.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Tylko sprawdzenie konfiguracji i dostępności modelu, bez pracy.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Przetwarza jedno zlecenie ze stdin i kończy pracę. Do testów.",
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

    if args.once:
        # Tryb jednorazowy zostaje dla człowieka: pozwala sprawdzić całą
        # drogę zlecenie → model → raport bez podnoszenia serwera.
        try:
            raw = open(args.input, encoding="utf-8").read() if args.input else sys.stdin.read()
            payload = json.loads(raw or "{}")
        except (OSError, json.JSONDecodeError) as exc:
            print(json.dumps({"code": "bad_request", "message": f"Złe zlecenie: {exc}"}, ensure_ascii=False))
            return 1

        job_id = str(payload.get("jobId") or "").strip()
        prompt = str(payload.get("prompt") or "").strip()
        if not job_id or not prompt:
            print(json.dumps({"code": "bad_request", "message": "Wymagane `jobId` i `prompt`."}, ensure_ascii=False))
            return 1

        process_job(config, job_id, prompt[:PROMPT_MAX])
        return 0

    # ── TRYB DOMYŚLNY: SERWER ───────────────────────────────────────────
    # To jest tryb, w którym kontener żyje w produkcji. `CMD` w Dockerfile
    # nie ma żadnej flagi, więc trafia tutaj.
    return serve(config, model)


if __name__ == "__main__":
    raise SystemExit(main())
