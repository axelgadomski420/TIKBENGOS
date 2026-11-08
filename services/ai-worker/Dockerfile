FROM python:3.12-slim

# Python 3.12, nie 3.13 — ta sama wersja co reszta stosu (MediaPipe i TensorFlow
# nie mają wydania dla 3.13, a Aider wymaga wersji poniżej 3.13).
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# ── CZEGO TU NIE MA I DLACZEGO ───────────────────────────────────────────
# Bez `git`. Worker asystenta niczego nie klonuje i nie tworzy patchy —
# tamta praca należy do `code-worker`. Instalowanie gita „na wszelki wypadek”
# dołożyłoby narzędzie, którego żadna linia tego obrazu nie woła.
#
# Bez `curl` i bez `openssh-client`. Jedyną drogą wyjścia jest HTTPS do
# Ollamy przez `urllib.request`; klienta HTTP dostarcza sam Python.
#
# Nie instalujemy więc NICZEGO poza tym, co jest w obrazie bazowym.

WORKDIR /srv

COPY services/ai-worker/requirements.txt /srv/requirements.txt
# Lista jest pusta z wyboru (patrz komentarz w requirements.txt), ale
# polecenie zostaje: gdy dojdzie pierwsza zależność, obraz zbuduje się
# z nią bez zmiany tego pliku.
RUN pip install --upgrade pip && pip install -r /srv/requirements.txt

COPY services/ai-worker /srv

# ── UŻYTKOWNIK NIEUPRZYWILEŻONY ──────────────────────────────────────────
# Ten worker nie wykonuje poleceń powłoki, więc ryzyko jest mniejsze niż
# przy agencie kodującym. Mimo to konto bez uprawnień zostaje: proces,
# który nie potrzebuje prawa zapisu poza własnym katalogiem, nie powinien
# go mieć. Granica jest ta sama, choć stawka niższa.
RUN useradd --create-home --uid 10002 worker \
    && chown -R worker:worker /srv
USER worker

# ── PORT W SIECI DOCKERA ─────────────────────────────────────────────────
# API wysyła zlecenie POST-em na `ASSISTANT_LLM_ENDPOINT`, więc ten kontener
# MUSI nasłuchiwać. `EXPOSE` jest tu tylko dokumentacją — port i tak nie jest
# mapowany na host, bo usługa stoi w sieci Dockera.
EXPOSE 8000

# ── CMD: SERWER, NIE `--check` ──────────────────────────────────────────
#
# ── POPRAWIONA KOMENDA STARTOWA ─────────────────────────────────────────
# Stało tu kiedyś `CMD ["python", "worker.py", "--check"]`. `--check` jest
# poleceniem DIAGNOSTYCZNYM: sprawdza konfigurację, wypisuje `status: ok`
# i KOŃCZY PRACĘ. Jako komenda startowa kontenera robiło więc dokładnie to:
# proces wstawał, sprawdzał model i wychodził z kodem 0, a `restart:
# unless-stopped` wznawiał go w pętli.
#
# Objaw był mylący: `docker compose ps` pokazywał `Restarting (0)`, a log
# zapełniał się liniami `{"status": "ok", "model": ...}`. Wyglądało to na
# działającą usługę, która z jakiegoś powodu się przewraca — a była to
# usługa, która kończy pracę POPRAWNIE, tylko nie ma czego robić.
#
# Bez żadnej flagi `worker.py` wchodzi w tryb domyślny: `ThreadingHTTPServer`
# na porcie 8000, jeden endpoint `POST /`, odpowiedź 202 natychmiast,
# a model wołany w wątku tła. To jest tryb, w którym kontener żyje
# w produkcji — patrz `serve()` w `worker.py`.
#
# Sprawdzenie stanu należy do człowieka i ma osobną flagę:
#     docker compose exec -T ai-worker python worker.py --check
CMD ["python", "worker.py"]
