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

# Bez `EXPOSE` celowo: ten kontener nie ma portu. Woła go API, nie świat —
# a brak portu to brak powierzchni ataku, której nie potrzebujemy. Odpowiedź
# wraca POST-em na endpoint zwrotny API, nie połączeniem przychodzącym.
#
# `--check` sprawdza konfigurację i kończy pracę: kontener, który startuje
# bez modelu, ma powiedzieć dlaczego, a nie padać w połowie zadania.
CMD ["python", "worker.py", "--check"]
