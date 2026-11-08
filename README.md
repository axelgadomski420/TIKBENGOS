# TIKBENGOS

> **Jedna aplikacja. Wszystkie możliwości.**  
> TikTok + WhatsApp + Suno + GitHub Copilot + Perplexity + pełna dostępność — w jednym, ultra-nowoczesnym produkcie webowym.

![status](https://img.shields.io/badge/status-MVP--in--progress-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Django-blue)
![accessibility](https://img.shields.io/badge/accessibility-WCAG%202.2%20AA-green)

---

## Co to jest

**TIKBENGOS** to nie kolejny klon TikToka.

To **system operacyjny dla twórczości, społeczności i kodu**:

- krótkie wideo jak TikTok,
- czat jak WhatsApp,
- muzyka AI jak Suno,
- asystent i wyszukiwanie jak Perplexity,
- agent kodujący jak GitHub Copilot,
- pełna dostępność: napisy, TTS, STT, język migowy, wibracje Morse'a.

Wszystko w jednej, spójnej aplikacji webowej typu PWA.

---

## Dlaczego TIKBENGOS

| Problem | Rozwiązanie BENGOS |
|---|---|
| Osobne aplikacje na wideo, czat, muzykę i kod | Jeden pulpit, jedna tożsamość, jedna baza |
| AI tylko jako chatbot | AI jako aktywny asystent w całym produkcie |
| Dostępność jako dodatek | Dostępność jako fundament |
| Wolne, ciężkie aplikacje | PWA, offline-first, szybki frontend |
| Trudne wdrożenie | Docker + darmowy stack startowy |
| Brak integracji z kodem | GitHub + agent kodujący w aplikacji |
| Tylko jeden język | Pełne i18n: UI, treści, SEO, dostępność |

---

## Główne funkcje i ich stan

Ten projekt ma jedną żelazną zasadę: **nic nie udaje, że działa**. Ekran modułu, którego jeszcze nie ma, mówi o tym wprost.

| Moduł | Zakres | Stan |
|---|---|---|
| **BENGOS Home** | Pulpit, wyszukiwarka uniwersalna, karty Stwórz / Kontynuuj / Dla Ciebie / Dostępność | ✅ działa |
| **BENGOS Profile** | Tożsamość, edycja profilu, ustawienia, klucze API | ✅ działa |
| **BENGOS Feed** | Wpisy, komentarze, lajki | 🚧 w budowie (Etap 2) |
| **BENGOS Studio** | Tworzenie wideo, muzyki i postów | ⏳ planowane (Etap 2) |
| **BENGOS Music** | Generowanie muzyki AI z promptu | ⏳ planowane (Etap 3 — wymaga GPU z 16 GB VRAM) |
| **BENGOS Chat** | Czat 1:1 i grupowy w czasie rzeczywistym | 🚧 kanał realtime gotowy (Etap 4) |
| **BENGOS Access** | Napisy, TTS, STT, język migowy, wibracje Morse'a | ⏳ planowane (Etap 4) |
| **BENGOS Assistant** | Globalny asystent AI z kontekstem aplikacji | ⏳ planowane (Etap 5) |
| **BENGOS Dev** | GitHub, repozytoria, agent kodujący w piaskownicy | 🚧 worker i piaskownica gotowe (Etap 5) |

Szczegóły stanu: [docs/stage-1.md](docs/stage-1.md) i [docs/quality.md](docs/quality.md).

---

## Architektura

```text
TIKBENGOS
├── apps/
│   └── web/            # Next.js 15 PWA — cały interfejs użytkownika
├── services/
│   ├── api/            # Django 5 + django-ninja — jedno API (WSGI, gunicorn)
│   ├── realtime/       # Django Channels + Redis — WebSocket (ASGI, uvicorn)
│   ├── code-worker/    # agent kodujący — osobny kontener, odizolowana sieć
│   ├── music-worker/   # kontrakt API; wymaga GPU — nie w compose developerskim
│   ├── sign-worker/    # kontrakt API; rozpoznawanie języka migowego
│   └── ai-worker/      # kontrakt API; asystent
├── packages/
│   ├── ui/             # design system: tokeny --bengos-*, test kontrastu WCAG
│   ├── core/           # typy domeny i kontrakty API — jedno źródło prawdy
│   └── i18n/           # lokalizacja (na razie zalążek)
├── infra/
│   ├── docker-compose.yml              # środowisko developerskie
│   ├── docker-compose.prod.yml         # produkcja: gunicorn, uvicorn, Caddy
│   ├── docker-compose.tunnel*.yml      # Cloudflare Tunnel bez otwierania portów
│   ├── Caddyfile                       # reverse proxy, TLS przez ACME
│   └── .env.example                     # wzór zmiennych środowiskowych
├── scripts/            # deploy, preflight, audyt, tunel
├── docs/               # dokumentacja prawdy: stan, jakość, wdrożenie
└── .github/workflows/  # CI (typy, testy, bramka WCAG, gitleaks) i deploy
```

---

## Stack

### Dzisiaj (w kodzie)

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, manifest PWA + service worker, offline-first.

**Backend:** Python 3.12 (nie 3.13 — MediaPipe/TensorFlow/Aider), Django 5, django-ninja, Django Channels + channels-redis, PostgreSQL 16, Redis 7, gunicorn/uvicorn (produkcja), daphne (dev).

**Bezpieczeństwo:** sesyjna autoryzacja + CSRF, szyfrowanie kluczy API (Fernet), RBAC, audit log, gitleaks w CI.

**Infrastruktura:** Docker + Docker Compose, GitHub Actions, Oracle Cloud Always Free, Cloudflare (Tunnel, DNS), Caddy (TLS/ACME).

### Planowane (kolejne etapy)

AudioCraft / MusicGen (osobna maszyna z GPU), Whisper STT, TTS jako serwis, MediaPipe / TensorFlow.js (migi), Celery (kolejki zadań), Cloudflare R2 (magazyn plików), powiadomienia push (VAPID lub usługa — do decyzji), Sentry + OpenTelemetry, testy E2E.

---

## BENGOS Home

Home to centrum całej aplikacji.

```text
┌─────────────────────────────────────────────┐
│  BENGOS   [ Zapytaj, stwórz, znajdź, koduj ]│
├─────────────────────────────────────────────┤
│  Stwórz                                      │
│  [ Wideo ] [ Muzyka ] [ Post ] [ Kod ]       │
├─────────────────────────────────────────────┤
│  Kontynuuj                                   │
│  - drafty                                    │
│  - generacje muzyki                          │
│  - projekty GitHub                           │
├─────────────────────────────────────────────┤
│  Dla Ciebie                                  │
│  - wideo                                     │
│  - muzyka                                    │
│  - twórcy                                    │
├─────────────────────────────────────────────┤
│  Dostępność                                  │
│  - napisy                                    │
│  - TTS                                       │
│  - język migowy                              │
│  - Morse                                     │
└─────────────────────────────────────────────┘
```

---

## Docelowe przepływy

### Pomysł → muzyka → wideo → publikacja
1. Użytkownik wpisuje prompt.
2. Asystent tworzy koncepcję.
3. MusicGen generuje audio.
4. Użytkownik dodaje wideo.
5. System generuje napisy.
6. Publikacja w Feed.

### Czat → dostępność
1. Wiadomość przez WebSocket.
2. Napisy.
3. TTS.
4. Język migowy.
5. Wibracje Morse'a.

### Pomysł → kod → GitHub
1. Opis funkcji.
2. Plan agenta (zatwierdzany przez użytkownika).
3. Generowanie kodu w piaskownicy.
4. Branch, commit, pull request.
5. Zatwierdzenie przez użytkownika.

### Wideo → muzyka
1. Wybór filmu.
2. Wybór stylu.
3. MusicGen generuje ścieżkę.
4. Dopasowanie długości i fade.
5. Publikacja.

---

## Quick start

### Wymagania
- Node.js 20+
- Python 3.12+ (nie 3.13)
- Docker + Docker Compose

### Instalacja

```bash
git clone https://github.com/axelgadomski420/TIKBENGOS.git
cd TIKBENGOS
cp infra/.env.example infra/.env
# uzupełnij w infra/.env: SECRET_KEY i FIELD_ENCRYPTION_KEY
docker compose -f infra/docker-compose.yml up --build
```

Kontener developerski uruchamia: PostgreSQL 16, Redis 7, API (Django) i usługę realtime (WebSocket).

### Uruchomienie frontendu (osobno)

```bash
cd apps/web
npm install
npm run dev
```

### Uruchomienie backendu (poza kontenerem)

```bash
cd services/api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Workery

Workery AI **nie są** częścią compose developerskiego:

- **music-worker** — MusicGen potrzebuje GPU z 16 GB VRAM; to osobna maszyna, nie darmowa chmura,
- **sign-worker**, **ai-worker** — osobne usługi, adres podawany zmiennymi `*_WORKER_URL`,
- **code-worker** — w compose produkcyjnym, w profilu `worker`, w sieci odizolowanej od bazy.

Sprawdzenie gotowości maszyny: `scripts/preflight.sh` (niczego nie instaluje, tylko sprawdza).

---

## Zmienne środowiskowe

Wzór: [infra/.env.example](infra/.env.example). Podstawowe:

```env
ENVIRONMENT=development
SECRET_KEY=                    # python -c "import secrets; print(secrets.token_urlsafe(50))"
FIELD_ENCRYPTION_KEY=          # klucz szyfrowania kluczy API użytkowników; nie zmieniać po starcie
DATABASE_URL=postgres://user:pass@host:5432/tikbengos
REDIS_URL=redis://127.0.0.1:6379/0
ALLOWED_HOSTS=127.0.0.1,localhost
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Opcjonalne: logowanie przez Google/GitHub (`GOOGLE_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_ID`, `OAUTH_REDIRECT_BASE`), GitHub App dla modułu Dev (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET`), powiadomienia push (`VAPID_*` — kanał do decyzji), adresy workerów (`MUSIC_WORKER_URL`, `SIGN_WORKER_URL`, `CODE_WORKER_URL`).

Zasady:
- **żadnych sekretów w repo** — wszystko przez `.env` (ignorowany) i secrets w CI/CD,
- **klucze dostawców modeli (OpenAI, Anthropic, ElevenLabs…) nie należą do env** — użytkownik wpisuje je w ustawieniach aplikacji; są szyfrowane w bazie kluczem `FIELD_ENCRYPTION_KEY`,
- `FIELD_ENCRYPTION_KEY` wygeneruj raz i zachowaj kopię — zmiana czyni zapisane klucze nieczytelnymi.

---

## Dostępność

TIKBENGOS traktuje dostępność jako fundament, nie dodatek.

- WCAG 2.2 AA — **egzekwowane automatycznie**: test kontrastu przerywa build, gdy para kolorów nie przechodzi progu,
- pełna obsługa klawiatury i widoczny fokus (zakaz `outline: none` bez zamiennika — sprawdzane w CI),
- `aria-live` dla zmian stanu, `prefers-reduced-motion` skraca animacje do 1 ms, nie wyłącza ich,
- cele dotykowe 44 px, motyw o wysokim kontraście, tokeny trybu dostępności.

Planowane: napisy i transkrypcje, TTS, STT, rozpoznawanie języka migowego, tekst → Morse → wibracje.

Ważne: pełne tłumaczenie polskiego języka migowego (PJM) wymaga własnego modelu i zbioru danych. Start: alfabet palcowy + podstawowe komendy. Interfejs mówi o tym wprost.

---

## Bezpieczeństwo

**Jest (w kodzie):**
- sesyjna autoryzacja z rotacją klucza sesji przy logowaniu (bez fiksacji sesji), CSRF na każdym zapisie,
- logowanie przez dostawców (Google, GitHub) — opcjonalne, bez wpisanych wartości endpointy uczciwie odpowiadają 503,
- RBAC: 5 ról (user, creator, moderator, developer, admin), 8 uprawnień, liczone identycznie na froncie i serwerze,
- klucze API użytkowników: szyfrowanie w spoczynku, jednorazowe pokazanie, brak odczytu zwrotnego,
- audit log (logowanie, wylogowanie, zmiany zgód),
- skan sekretów gitleaks w CI,
- produkcja: jedynie Caddy wystawione na świat (80/443), brak domyślnych haseł w `docker-compose.prod.yml`, agent kodujący w osobnym kontenerze i sieci bez trasy do bazy.

**Planowane:** MFA, rate limiting, CSP, walidacja i skan uploadów, narzędzia moderacji.

---

## Plan działania

### Etap 0 — Audyt ✅
- Audyt 8 repozytoriów źródłowych (TIKTAK, TIKMUSIC, TIKMESS, TIKAL, TIKGIT, TIKCODING, TIKMIG, TIKMORS).
- Mapa migracji: co reużywamy, co przepisujemy, co wyrzucamy.

### Etap 1 — Fundament ✅ (poza R2)
- Monorepo, Docker Compose, CI/CD, autoryzacja, profile, PostgreSQL, Redis, WebSocket, design system, BENGOS Home.
- Otwarte: magazyn plików (Cloudflare R2) — blokuje avatary, załączniki i wideo.

### Etap 2 — Feed i Studio
- Migracja TIKTAK, upload wideo, transkodowanie, miniatury, napisy, publikacja.

### Etap 3 — Muzyka AI
- Migracja TIKMUSIC, kolejki zadań, worker AudioCraft/MusicGen (osobna maszyna z GPU), biblioteka utworów.

### Etap 4 — Czat i dostępność
- Migracja TIKMESS, czat 1:1 i grupy, napisy, TTS, STT, Morse, wibracje, integracja TIKMIG.

### Etap 5 — AI, GitHub i Coding
- Migracja TIKAL, TIKGIT, TIKCODING; asystent kontekstowy, RAG, tool calling, GitHub App, pull requesty, agent kodujący.

### Etap 6 — Dopracowanie
- Performance budget: LCP < 2,5 s, INP < 200 ms, CLS < 0,1,
- offline-first, push notifications, instalacja PWA,
- testy E2E, testy dostępności, load testing, security review,
- Release 1.0.

---

## Definition of Done

TIKBENGOS 1.0 jest gotowy, gdy:

- użytkownik może się zarejestrować i mieć jeden profil,
- może tworzyć, publikować i oglądać krótkie wideo,
- może generować muzykę z promptu i przypisać ją do wideo,
- może czatować w czasie rzeczywistym,
- może włączyć napisy, TTS, STT, Morse lub tryb dostępności,
- może połączyć GitHub i wygenerować pull request,
- może zainstalować aplikację jako PWA,
- wszystko działa na darmowym stacku startowym (poza workerem muzyki — GPU),
- istnieją testy, monitoring, CI/CD i dokumentacja.

---

## Contributing

1. Fork.
2. Branch: `feat/nazwa-funkcji`.
3. Commit zgodnie z Conventional Commits.
4. Testy + typecheck + build muszą przechodzić.
5. Pull request.

Zasady projektu: nie twórz atrap (żadnych martwych przycisków), nie usuwaj komentarzy (niosą decyzje „dlaczego"), nie dopisuj do dokumentacji niczego, czego nie ma w kodzie.

---

## License

[MIT](LICENSE) — szczegóły zależności zewnętrznych w [THIRD_PARTY.md](THIRD_PARTY.md).

---

## Kontakt

- Autor: **Axel G**
- Repo: https://github.com/axelgadomski420/TIKBENGOS
