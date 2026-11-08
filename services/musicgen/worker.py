"""Worker GPU generacji muzyki — usługa TIKBENGOS.

Przyjmuje zlecenia z API (MUSICGEN_ENDPOINT wskazuje tu) i oddaje gotowy
WAV przez endpoint zwrotny POST /v1/music/jobs/{id}/complete z sekretem
BENGOS_WORKER_TOKEN w nagłówku X-Bengos-Worker.

Celowo stdlib tam, gdzie się da (serwer HTTP, callbacki, WAV): jedyną
ciężką zależnością jest para torch + transformers, bez której generacji
fizycznie nie ma. Bez GPU worker odmawia uczciwie — zlecenie wraca do
API jako failed z komunikatem, a nie wisi jako "queued".

Uruchomienie (maszyna z GPU, Python 3.11+):
    pip install -r requirements.txt
    BENGOS_API_URL=http://ADRES_API:8000 \
    BENGOS_WORKER_TOKEN=TEN_SAM_SEKRET_CO_W_API \
    python worker.py
"""

import json
import os
import queue
import threading
import urllib.error
import urllib.request
import uuid
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BENGOS_API_URL = os.environ.get("BENGOS_API_URL", "http://127.0.0.1:8000").rstrip("/")
BENGOS_WORKER_TOKEN = os.environ.get("BENGOS_WORKER_TOKEN", "")
LISTEN_HOST = os.environ.get("MUSICGEN_LISTEN_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("MUSICGEN_LISTEN_PORT", "8090"))
# MusicGen liczy ~50 tokenów na sekundę audio; 1536 tokenów ≈ 30 s.
# Sekwencja dłuższych utworów składa się z odciętych fragmentów.
CHUNK_SECONDS = 30
TOKENS_PER_SECOND = 51
REQUIRE_GPU = os.environ.get("MUSICGEN_REQUIRE_GPU", "1") != "0"

_jobs: "queue.Queue[dict]" = queue.Queue()


def _report(job_id: str, state: str, *, stage: str = "", progress: float = 0,
            error: str = "", audio: bytes | None = None,
            title: str = "", duration: float = 0) -> None:
    """Raport do endpointu zwrotnego API — jedyna droga wyniku.

    Bez tego wywołania zlecenie wisi w "queued" nawet przy działającym
    modelu, więc każdy raport jest wysyłany best-effort z logiem porażki:
    worker nie ma stanu, który mógłby „zapamiętać na później”.
    """
    if not BENGOS_WORKER_TOKEN:
        print("[worker] Brak BENGOS_WORKER_TOKEN — nie mam jak zameldować wyniku.")
        return
    fields = {
        "state": state,
        "stage": stage,
        "progress": str(progress),
        "error": error,
    }
    content_type = "application/x-www-form-urlencoded"
    body = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in fields.items()).encode()
    headers = {"X-Bengos-Worker": BENGOS_WORKER_TOKEN, "Content-Type": content_type}
    if audio is not None:
        boundary = "bengos-" + uuid.uuid4().hex
        parts = []
        for name, value in fields.items():
            parts.append(
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()
            )
        parts.append(
            (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
             f"filename=\"track.wav\"\r\nContent-Type: audio/wav\r\n\r\n").encode()
            + audio + b"\r\n"
        )
        parts.append(f"--{boundary}--\r\n".encode())
        body = b"".join(parts)
        headers["Content-Type"] = "multipart/form-data; boundary=" + boundary
        fields_extra = {"title": title, "durationSeconds": str(duration)}
        # title i durationSeconds doklejamy jako pola formularza PRZED plikiem
        extra = b"".join(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()
            for name, value in fields_extra.items()
        )
        body = body.replace(b"--" + boundary.encode() + b"\r\nContent-Disposition: form-data; name=\"file\"",
                            extra + b"--" + boundary.encode() + b"\r\nContent-Disposition: form-data; name=\"file\"")
    url = f"{BENGOS_API_URL}/v1/music/jobs/{job_id}/complete"
    req = urllib.request.Request(url, data=body, method="POST", headers=headers)
    try:
        urllib.request.urlopen(req, timeout=30).read()
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        print(f"[worker] Raport {state} dla {job_id} nie doszedł: {exc}")


def _generate(prompt: str, model: str, duration_seconds: float) -> bytes:
    """Właściwa generacja — torch + transformers, poza stdlib.

    Importy są wewnątrz funkcji celowo: serwer ma wstać i odpowiedzieć
    503-stylem bez 4 GB zależności, a test ruchu HTTP nie może czekać
    na ładowanie wag.
    """
    import torch

    if REQUIRE_GPU and not torch.cuda.is_available():
        raise RuntimeError(
            "Ta maszyna nie ma GPU (CUDA niedostępne), a MusicGen bez GPU "
            "liczy minuty na sekundę audio. Ustaw MUSICGEN_REQUIRE_GPU=0, "
            "jeśli świadomie chcesz generować na CPU."
        )
    from transformers import AutoProcessor, MusicgenForConditionalGeneration

    device = "cuda" if torch.cuda.is_available() else "cpu"
    _report_running_stage = model  # tylko dla czytelności logu
    processor = AutoProcessor.from_pretrained("facebook/" + model)
    musicgen = MusicgenForConditionalGeneration.from_pretrained("facebook/" + model).to(device)

    chunks = max(1, int(duration_seconds // CHUNK_SECONDS) + (1 if duration_seconds % CHUNK_SECONDS else 0))
    sample_rate = musicgen.config.audio_encoder.sampling_rate
    pieces = []
    for index in range(chunks):
        inputs = processor(text=[prompt], padding=True, return_tensors="pt").to(device)
        tokens = int(min(duration_seconds - index * CHUNK_SECONDS, CHUNK_SECONDS) * TOKENS_PER_SECOND)
        with torch.no_grad():
            audio_values = musicgen.generate(**inputs, max_new_tokens=max(256, tokens), do_sample=True)
        pieces.append(audio_values[0, 0].float().cpu())

    # Normalizacja do pełnej skali int16 — bez niej szept byłby plikiem
    # z niemal ciszą i „sukcesem” w bazie.
    import torch as _torch

    whole = _torch.cat(pieces)
    peak = _torch.max(_torch.abs(whole)).item() or 1.0
    scaled = (whole / peak * 32767.0).clamp(-32768, 32767).to(_torch.int16)

    import io

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(scaled.numpy().tobytes())
    return buffer.getvalue()


def _worker_loop() -> None:
    while True:
        job = _jobs.get()
        job_id = job["jobId"]
        try:
            _report(job_id, "running", stage="Generowanie na GPU", progress=0.1)
            audio = _generate(job["prompt"], job["model"], float(job.get("durationSeconds", 30)))
            _report(
                job_id,
                "succeeded",
                title=job.get("prompt", "")[:60],
                duration=float(job.get("durationSeconds", 30)),
                audio=audio,
            )
            print(f"[worker] Zlecenie {job_id} zakończone sukcesem.")
        except Exception as exc:  # noqa: BLE001 - worker musi żyć dalej
            _report(job_id, "failed", error=str(exc)[:2000])
            print(f"[worker] Zlecenie {job_id} nieudane: {exc}")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 — nazwa z http.server
        if self.path != "/jobs":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            job_id = str(payload["jobId"])
            prompt = str(payload["prompt"])[:4000]
            model = str(payload.get("model", "musicgen-small"))
            duration = float(payload.get("durationSeconds", 30))
        except (ValueError, KeyError) as exc:
            self.send_error(400, str(exc))
            return
        _jobs.put({"jobId": job_id, "prompt": prompt, "model": model, "durationSeconds": duration})
        self.send_response(202)
        self.end_headers()

    def log_message(self, fmt: str, *args) -> None:
        print("[worker] " + fmt % args)


def main() -> None:
    if not BENGOS_WORKER_TOKEN:
        raise SystemExit(
            "Brak BENGOS_WORKER_TOKEN — worker nie zamelduje wyniku. "
            "Ustaw ten sam sekret co w API."
        )
    threading.Thread(target=_worker_loop, daemon=True).start()
    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), Handler)
    print(f"[worker] Słucham na {LISTEN_HOST}:{LISTEN_PORT}, API: {BENGOS_API_URL}")
    server.serve_forever()


if __name__ == "__main__":
    main()
