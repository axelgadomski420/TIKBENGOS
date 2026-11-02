# BENGOS

Jeden społecznościowy system operacyjny. Siedem dawnych aplikacji staje się modułami,
ale użytkownik nie widzi między nimi granicy.

Ten dokument opisuje stan po Etapie 1. Wszystko, co nie działa, jest tu opisane jako
niedziałające — nie ma w tym repozytorium funkcji udających, że istnieją.

## Moduły

| Moduł | Dawna aplikacja | Zakres |
| --- | --- | --- |
| BENGOS Home | — (nowy) | Pulpit sterowania, wyszukiwarka uniwersalna, karty Stwórz teraz / Kontynuuj / Dla Ciebie / Dostępność |
| BENGOS Feed | TIKTAK | Krótkie wideo, dźwięki, posty, twórcy |
| BENGOS Studio | TIKTAK + TIKMUSIC | Tworzenie wideo, muzyki AI, postów, projektów kodu |
| BENGOS Chat | TIKMESS | Wiadomości, grupy, tłumaczenia |
| BENGOS Create | TIKAL | Asystent AI |
| BENGOS Dev | TIKGIT | GitHub, repozytoria, agent kodujący |
| BENGOS Access | TIKMIG + TIKMORS | Język migowy, napisy, TTS, Morse, wibracje |
| BENGOS Profile | TIKTAK | Tożsamość, twórczość, ustawienia |

## Struktura monorepo

```
apps/web                  Next.js 15 PWA — cały interfejs użytkownika
packages/ui               design system: bengos-surface, bengos-accent, bengos-glow, …
packages/core             typy, kontrakty API, walidacja
packages/accessibility    TTS, STT, napisy, Morse, wibracje (przenoszone z TIKMORS/TIKMIG)
packages/i18n             katalogi tłumaczeń — model ustawień języka jak w telefonie
services/api              Django 5 + django-ninja — jedno API
services/realtime         Channels + Redis — czat, obecność, statusy zadań
services/ai-worker        asystent (django-ai-assistant jako zależność)
services/sign-worker      rozpoznawanie migów (FastAPI + MediaPipe)
services/music-worker     generacja muzyki (Audiocraft, osobny GPU)
services/code-worker      agent kodujący (Aider w sandboxie)
infra                     Compose, CI/CD
```

## Zasady, które ten kod respektuje

- **Jedno konto, jedna tożsamość, jeden system uprawnień.** Nie ma drugiego modelu użytkownika.
- **Żaden moduł nie importuje kodu innego dawnego repozytorium.** Komunikacja przez API, zdarzenie albo kolejkę.
- **Sekrety nigdy w repozytorium.** Klucze API wpisywane w ustawieniach aplikacji, szyfrowane, pokazywane raz.
- **Długie operacje są asynchroniczne.** Zadanie → identyfikator → stan → powiadomienie.
- **Dostępność nie jest dodatkiem.** Każdy ekran przechodzi WCAG 2.2 AA.

## Jak uruchomić

### Wymagania

- Python **3.12** — nie 3.13. MediaPipe i TensorFlow nie mają wydania dla 3.13,
  a Aider wymaga wersji poniżej 3.13. To jedyna wersja, która spełnia wszystkie trzy warunki.
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### API

```bash
cd services/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env          # uzupełnij wartości
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

### Interfejs

```bash
cd apps/web
npm install
cp .env.local.example .env.local
npm run dev                   # http://localhost:3000
```

## Status etapów

| Etap | Zakres | Stan |
| --- | --- | --- |
| 0 | Audyt siedmiu repozytoriów, licencje, ryzyka | **Zamknięty** — raport w historii commitów |
| 1 | Monorepo, tożsamość, design system, BENGOS Home | **W toku** — patrz `docs/stage-1.md` |
| 2 | Feed i Studio | Nierozpoczęty |
| 3 | Muzyka AI | Nierozpoczęty |
| 4 | Czat i dostępność | Nierozpoczęty |
| 5 | Asystent i GitHub | Nierozpoczęty |
| 6 | Dopracowanie i wydanie 1.0 | Nierozpoczęty |

## Dokumentacja

- `docs/stage-1.md` — co dokładnie jest w tym etapie zrobione, a co nie
- `docs/licensing.md` — stan licencji siedmiu repozytoriów i co trzeba zamknąć przed wydaniem
- `docs/accessibility.md` — wymagania dostępności i jak są egzekwowane

## Licencja

MIT — zobacz `LICENSE`. Zależności zewnętrzne i ich licencje: `THIRD_PARTY.md`. Nie jest to porada prawna.
