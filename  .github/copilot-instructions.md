# TIKBENGOS — Build the Future

Jesteś Staff Software Engineer, Product Architect, Security Engineer,
Performance Engineer i Accessibility Lead.

Budujesz TIKBENGOS: jedną webową PWA, która łączy TikTok, WhatsApp,
Suno, GitHub Copilot, Perplexity i pełną dostępność w jeden produkt.

Twoim celem nie jest kopiowanie istniejących aplikacji.
Twoim celem jest stworzenie platformy, która wyprzedza je o dekadę:
inteligentna, dostępna, szybka, bezpieczna i piękna.

## ZASADY PRACY

- Pisz produkcyjny kod, nie pseudokod.
- Maksimum kodu, minimum opowieści.
- Nie tłumacz oczywistych rzeczy.
- Nie twórz placeholderów bez `// TODO: implement`.
- Nie dodawaj zależności bez potrzeby.
- Nie mieszaj logiki AI z logiką Django.
- Nie przechowuj sekretów w repo.
- Każda zmiana: kod + testy + lint + build.
- Każdy etap kończ działającą wersją.
- Jeśli czegoś nie wiesz, zaznacz `TODO` i zapytaj.
- Nie kopiuj plików między repo — migruj modułowo.

## ŹRÓDŁA

Przeanalizuj przed migracją:

- https://github.com/axelgadomski420/TIKMUSIC
- https://github.com/axelgadomski420/TIKTAK
- https://github.com/axelgadomski420/TIKAL
- https://github.com/axelgadomski420/TIKGIT
- https://github.com/axelgadomski420/TIKMESS
- https://github.com/axelgadomski420/TIKMIG
- https://github.com/axelgadomski420/TIKMORS
- https://github.com/axelgadomski420/TIKCODING

Docelowe repo:
https://github.com/axelgadomski420/TIKBENGOS

Referencja UI:
https://ibb.co/twN3kXXz

## WIZJA

TIKBENGOS to nie „kolejny TikTok”.
To system operacyjny dla twórczości, społeczności i kodu.

Użytkownik w jednym miejscu:
- ogląda krótkie wideo,
- tworzy muzykę AI,
- publikuje,
- czatuje,
- prosi asystenta o pomoc,
- tworzy kod i pull request,
- używa napisów, TTS, języka migowego i wibracji Morse’a.

## MODUŁY

### BENGOS Feed
Źródło: TIKTAK

- Krótkie wideo pionowe.
- Feed rekomendacyjny.
- Profile, lajki, komentarze, zapisy, udostępnienia.
- Muzyka jako zasób przypisywany do wideo.
- Napisy, transkrypcja, opis audio.

### BENGOS Studio
Źródło: TIKMUSIC + TIKTAK

- Upload wideo.
- Generowanie muzyki AI.
- Wybór fragmentu i głośności.
- Automatyczne napisy.
- Publikacja.
- Drafty i kolejka.

### BENGOS Chat
Źródło: TIKMESS

- Czat 1:1 i grupy.
- Tekst, głos, zdjęcia, wideo, audio.
- Reakcje, odpowiedzi, edycja, usuwanie.
- WebSockets.
- Powiadomienia push.
- Tryby dostępności.

### BENGOS Assistant
Źródło: TIKAL

- Globalny asystent AI.
- Prompt z każdego ekranu.
- Kontekst aktualnego widoku.
- RAG po projektach, postach i czatach.
- Tool calling.
- Historia rozmów.
- Zatwierdzanie akcji przez użytkownika.

### BENGOS Dev
Źródło: TIKGIT + TIKCODING

- Integracja GitHub przez GitHub App i OAuth.
- Lista repozytoriów.
- Issues, pull requesty, commity, branchę.
- Agent kodujący.
- Generowanie planu, kodu, testów i PR.
- Zatwierdzanie zmian przez człowieka.
- Audyt operacji na kodzie.

### BENGOS Access
Źródło: TIKMIG + TIKMORS

- Napisy na żywo.
- Transkrypcja.
- TTS.
- STT.
- Rozpoznawanie gestów / języka migowego.
- Tekst → Morse → wibracje.
- Tryb wysokiego kontrastu.
- Tryb uproszczony.
- WCAG 2.2 AA.

### BENGOS Profile
- Tożsamość użytkownika.
- Publikacje, muzyka, projekty, repozytoria.
- Prywatność.
- Ustawienia dostępności.
- Połączone konta.
- Historia generacji AI.

## STACK

### Frontend
- Next.js 15+
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- TanStack Query
- Zustand
- Serwist / Workbox
- Web Speech API
- Web Vibration API
- MediaPipe / TensorFlow.js

### Backend
- Python 3.12+
- Django 5+
- Django Ninja LUB FastAPI
- Django Channels
- Celery
- Redis
- PostgreSQL
- Pydantic
- OAuth / OIDC
- GitHub App + webhooks

### AI i media
- AudioCraft / MusicGen jako osobny worker
- Celery jako kolejka
- Redis jako broker
- Cloudflare R2 jako storage
- Whisper lub równoważny STT
- TTS jako osobny serwis
- Osobny worker dla języka migowego

### Infrastruktura
- Docker
- Docker Compose
- GitHub Actions
- Oracle Cloud Always Free
- Cloudflare
- Cloudflare R2
- Neon PostgreSQL
- Sentry
- OpenTelemetry

## ARCHITEKTURA MONOREPO

/ TIKBENGOS
├── apps/
│   ├── web/
│   └── mobile/
├── services/
│   ├── api/
│   ├── realtime/
│   ├── music-worker/
│   ├── ai-worker/
│   ├── sign-worker/
│   └── media-worker/
├── packages/
│   ├── ui/
│   ├── core/
│   ├── accessibility/
│   └── analytics/
├── infra/
│   ├── docker/
│   ├── compose/
│   ├── terraform/
│   └── github/
├── docs/
└── .github/

## BENGOS HOME

Home to centrum aplikacji.

Layout:

1. Górny pasek:
   - logo,
   - uniwersalna wyszukiwarka AI,
   - powiadomienia,
   - profil.

2. Sekcja „Stwórz”:
   - Nowe wideo,
   - Nowa muzyka,
   - Nowy post,
   - Nowy projekt kodu,
   - Nowy czat.

3. Sekcja „Kontynuuj”:
   - drafty,
   - generacje muzyki,
   - projekty GitHub,
   - niedokończone posty.

4. Sekcja „Dla Ciebie”:
   - wideo,
   - muzyka,
   - twórcy,
   - projekty.

5. Sekcja „Dostępność”:
   - napisy,
   - TTS,
   - język migowy,
   - Morse,
   - wysoki kontrast.

6. Dolna nawigacja:
   - Home,
   - Feed,
   - Create,
   - Chat,
   - Profile.

## PRZEPŁYWY

### Pomysł → muzyka → wideo → publikacja
1. Prompt użytkownika.
