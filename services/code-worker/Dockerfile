FROM python:3.12-slim

# Python 3.12, nie 3.13 — ta sama wersja co reszta stosu (MediaPipe i TensorFlow
# nie mają wydania dla 3.13, a Aider wymaga wersji poniżej 3.13).
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# ── PO CO `git` W OBRAZIE ────────────────────────────────────────────────
# Worker klonuje repozytorium użytkownika do katalogu tymczasowego i zwraca
# `git diff` jako patch. Bez `git` nie powstanie ani klon, ani patch — a to
# jest cała praca tego kontenera.
#
# Kluczy SSH nie montujemy: worker dopuszcza WYŁĄCZNIE `https://github.com/…`
# (patrz `handle_request` w `worker.py`), więc `openssh-client` nie jest
# potrzebny, a obraz bez klucza to obraz, z którego nie ma czego wyciec.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY services/code-worker/requirements.txt /srv/requirements.txt
RUN pip install --upgrade pip && pip install -r /srv/requirements.txt

COPY services/code-worker /srv

# ── KATALOG PRACY ────────────────────────────────────────────────────────
# Worker tworzy świeży klon na KAŻDE zlecenie (`prepare_workspace`), więc ten
# katalog jest tylko miejscem, w którym `tempfile` stawia katalogi.
RUN mkdir -p /srv/work

# ── UŻYTKOWNIK NIEUPRZYWILEJOWANY ────────────────────────────────────────
# Agent wykonuje polecenia powłoki. Gdyby chodził jako root, jedno polecenie
# mogłoby sięgnąć dalej niż katalog pracy. Konto bez uprawnień zawęża szkodę
# do `/srv/work` — a to jest granica, którą ten kontener ma trzymać.
RUN useradd --create-home --uid 10001 worker \
    && chown -R worker:worker /srv
USER worker

ENV CODE_WORK_DIR=/srv/work

# Bez `EXPOSE` celowo: ten kontener nie ma portu. Woła go API, nie świat —
# a brak portu to brak powierzchni ataku, której nie potrzebujemy.
#
# Domyślna komenda to `--check`: kontener, który wystartuje i nie zrobi nic,
# jest uczciwszy niż kontener, który udaje, że czeka na zlecenia, których
# jeszcze nie ma dokąd przyjąć (brak endpointu w API).
CMD ["python", "worker.py", "--check"]
