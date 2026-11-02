# TIKBENGOS — jeden społecznościowy system operacyjny

Siedem dawnych aplikacji staje się modułami, ale użytkownik nie widzi między
nimi granicy.

Ten dokument opisuje **stan po Etapie 1**. Wszystko, co nie działa, jest tu
opisane jako niedziałające — nie ma w tym repozytorium funkcji udających,
że istnieją. Stan szczegółowy jest w [`docs/stage-1.md`](docs/stage-1.md).

## Moduły

| Moduł | Dawna aplikacja | Zakres | Stan |
| --- | --- | --- | --- |
| BENGOS Home | — (nowy) | Pulpit sterowania, wyszukiwarka uniwersalna, karty Stwórz teraz / Kontynuuj / Dla Ciebie / Dostępność | **działa** |
| BENGOS Feed | TIKTAK | Krótkie wideo, dźwięki, posty, twórcy | Etap 2 |
| BENGOS Studio | TIKTAK + TIKMUSIC | Tworzenie wideo, muzyki AI, postów, projektów kodu | Etap 2 |
| BENGOS Chat | TIKMESS | Wiadomości, grupy, tłumaczenia | Etap 4 — kanał czasu rzeczywistego **gotowy** |
| BENGOS Create | TIKAL | Asystent AI | Etap 5 |
| BENGOS Dev | TIKGIT | GitHub, repozytoria, agent kodujący | Etap 5 |
| BENGOS Access | TIKMIG + TIKMORS | Język migowy, napisy, TTS, Morse, wibracje | Etap 4 |
| BENGOS Profile | TIKTAK | Tożsamość, twórczość, ustawienia | Etap 2 |

## Struktura monorepo

```
apps/web                  Next.js 15 PWA — cały interfejs użytkownika
packages/ui               design system: bengos-surface, bengos-accent, bengos-glow, …
packages/core             typy, kontrakty API, walidacja, katalog dostawców
packages/accessibility    TTS, STT, napisy, Morse, wibracje (przenoszone z TIKMORS/TIKMIG)
packages/i18n             katalogi tłumaczeń — na razie tylko .gitkeep
services/api              Django 5 + django-ninja — tożsamość, sesje, klucze, kanał WebSocket
services/realtime         ta sama aplikacja ASGI, uruchamiana na daphne/uvicorn (port 8001)
services/ai-worker        asystent (django-ai-assistant jako zależność)
services/sign-worker      rozpoznawanie migów (FastAPI + MediaPipe)
services/music-worker     generacja muzyki (Audiocraft, osobny GPU)
services/code-worker      agent kodujący (Aider w sandboxie)
infra                     Compose, Caddy, CI/CD
scripts                   deploy.sh, dev.sh, generate-icons.py
```

## Zasady, które ten kod respektuje

- **Jedno konto, jedna tożsamość, jeden system uprawnień.** Nie ma drugiego modelu użytkownika.
- **Żaden moduł nie importuje kodu innego dawnego repozytorium.** Komunikacja przez API, zdarzenie albo kolejkę.
- **Sekrety nigdy w repozytorium.** Klucze API wpisywane w ustawieniach aplikacji, szyfrowane, pokazywane raz.
- **Długie operacje są asynchroniczne.** Zadanie → identyfikator → stan → powiadomienie.
- **Dostępność nie jest dodatkiem.** Każdy ekran przechodzi WCAG 2.2 AA.

## Jak uruchomić

### Najszybciej — skryptem

```bash
bash scripts/dev.sh
```

Skrypt tworzy środowisko Pythona, instaluje zależności, generuje klucze, robi
migracje na SQLite (bez PostgreSQL), uruchamia testy i podnosi API oraz
interfejs. Wymaga tylko Pythona 3.12 i Node 20+.

### Na Oracle Cloud — jednym poleceniem

```bash
bash scripts/deploy.sh
```

Skrypt pyta o domenę (albo publiczne IP) i e-mail do certyfikatu, a resztę —
Docker, sekrety, zaporę, ikony, migracje, certyfikat — robi sam. Pełny opis
z obrazkami panelu jest w [`docs/deploy-oracle.md`](docs/deploy-oracle.md).

Wdrożenie da się też uruchomić z zakładki **Actions** (workflow
*Wdrożenie na Oracle*), jeśli ustawi się sekrety repozytorium.

### Ręcznie

Wymagania: Python **3.12** (nie 3.13 — MediaPipe i TensorFlow nie mają
wydania dla 3.13, a Aider wymaga poniżej 3.13), Node.js 20+, PostgreSQL 16+,
Redis 7+.

```bash
# API
cd services/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000

# Interfejs (drugi terminal)
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

## Status etapów

| Etap | Zakres | Stan |
| --- | --- | --- |
| 0 | Audyt siedmiu repozytoriów, licencje, ryzyka | **Zamknięty** |
| 1 | Monorepo, tożsamość, design system, BENGOS Home, klucze dostawców, kanał WebSocket | **Zamknięty** — patrz `docs/stage-1.md` |
| 2 | Feed i Studio | Nierozpoczęty |
| 3 | Muzyka AI | Nierozpoczęty |
| 4 | Czat i dostępność | Nierozpoczęty |
| 5 | Asystent i GitHub | Nierozpoczęty |
| 6 | Dopracowanie i wydanie 1.0 | Nierozpoczęty |

## Dokumentacja

- [`docs/stage-1.md`](docs/stage-1.md) — co dokładnie jest w tym etapie zrobione, a co nie
- [`docs/licensing.md`](docs/licensing.md) — stan licencji siedmiu repozytoriów
- [`docs/accessibility.md`](docs/accessibility.md) — wymagania dostępności i jak są egzekwowane
- [`docs/deploy-oracle.md`](docs/deploy-oracle.md) — wdrożenie na Oracle Cloud krok po kroku

## Licencja

MIT — zobacz [`LICENSE`](LICENSE). Zależności zewnętrzne i ich licencje:
[`THIRD_PARTY.md`](THIRD_PARTY.md). Nie jest to porada prawna.
