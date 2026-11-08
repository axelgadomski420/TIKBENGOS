# BENGOS — prompt wdrożeniowy dla agenta kodującego

Ten dokument jest **jednym zadaniem do przekazania innemu agentowi**. Zawiera
stan faktyczny repozytorium (odczytany, nie zgadywany), kolejność prac, linki
i granice, których nie wolno przekroczyć.

---

## 0. Kontekst w jednym akapicie

TIKBENGOS to monorepo: **jedna aplikacja społecznościowa złożona z siedmiu
modułów**. Użytkownik nie widzi granicy między nimi — jedno konto, jedna
tożsamość, jeden system uprawnień. Repozytorium: `github.com/axelgadomski420/TIKBENGOS`,
gałąź `main`. Wdrożenie działa na Oracle ARM (Ubuntu 24.04) w kontenerach,
publicznie wystawione przez Cloudflare Tunnel.

Stos: **Next.js 15** (`apps/web`), **Django 5 + django-ninja** (`services/api`),
**PostgreSQL 16**, **Redis 7**, design system w `packages/ui`, kontrakty
typów w `packages/core`.

---

## 1. Zasady nadrzędne — nie łam ich nigdy

1. **NIE usuwaj i nie nadpisuj istniejących plików.** Nową rzecz dodawaj jako
   nowy plik. Jeśli musisz dotknąć istniejącego — zmień **tylko ten fragment**,
   który wymaga zmiany, i zostaw cały komentarz wokół.
2. **NIE usuwaj komentarzy.** Komentarze w tym projekcie niosą decyzje
   („dlaczego tak, a nie inaczej”). Skasowanie komentarza to skasowanie wiedzy.
3. **NIE zgaduj zawartości plików.** Każde twierdzenie o kodzie musi pochodzić
   z odczytu. Czego nie odczytałeś — napisz, że nie odczytałeś.
4. **NIE twórz atrap.** Żadnych przycisków, które nic nie robią, żadnych danych
   wymyślonych na sztywno, żadnych „TODO: podłączyć API”.
5. **NIE zmieniaj** tokenów, palet ani modeli kluczy bez pytania właściciela.
6. **NIE uruchamiaj** `makemigrations` — migracje w tym projekcie są pisane
   ręcznie, po jednej, i każda jest **dodająca**.
7. **NIE zmieniaj** wersji Pythona (3.12, nie 3.13) ani Node (20).
8. **Nie ogłaszaj sukcesu bez dowodu.** „Build przechodzi” wolno napisać tylko
   po zobaczeniu `✔ Image tikbengos-web Built`.

---

## 2. Stan faktyczny repozytorium (odczytany, nie zgadywany)

### 2.1. Co DZIAŁA i ma potwierdzenie na produkcji

| Element | Stan |
| --- | --- |
| Rejestracja i logowanie **hasłem** | działa |
| `GET /v1/health`, `GET /v1/csrf`, `GET /v1/config` | działa |
| Profil: podgląd i edycja (`PATCH /users/me`) | kod gotowy |
| Ustawienia: motyw, język, dostępność | kod gotowy |
| Zgody (`PATCH /users/me/consents`) | kod gotowy |
| Klucze dostawców: zapis, jednorazowe pokazanie | kod gotowy |
| Feed: wpisy, polubienia, filtry, kursor | kod gotowy |
| Komentarze: `POST`/`GET /feed/posts/{id}/comments` | kod gotowy |
| Kanał WebSocket (`/ws/chat/`, kod 4401 bez sesji) | wdrożony |
| Motyw granat–cyjan–pomarańcz | wypchnięty, kontrasty policzone |
| Ekran startowy (`BootSplash`, raz na sesję) | wypchnięty |

### 2.2. Co jest NAPISANE, ale NIEURUCHOMIONE

- **Logowanie Google i GitHub** (`services/api/accounts/oauth.py`, model
  `LinkedAccount`, migracja `0002_linked_accounts`). Kod jest kompletny
  i spójny. **Ani razu nie został zbudowany ani wywołany.**
- **Migracja `0002_comments`** w feedzie — nie została zastosowana.
- **Dwanaście ostatnich commitów UI** — żaden nie przeszedł `next build`.

### 2.3. Znany błąd do naprawienia PIERWSZY

`next build` pada. Ostatni potwierdzony komunikat:

```
Failed to compile.
./src/components/auth/login-form.tsx:145:42
Type error: Type 'string | undefined' is not assignable to type 'string'.
```

Ten konkretny błąd został naprawiony commitem `da9d661` (funkcja
`messageForReason` zwraca teraz zawsze `string`). **Build pada teraz gdzie
indziej** — trzeba to zobaczyć.

**Komenda diagnostyczna (ta działa, poprzednio pokazała błąd):**

```shell
cd ~/TIKBENGOS && sudo docker compose --env-file .env \
  -f infra/docker-compose.prod.yml build web 2>&1 \
  | grep -B2 -A 14 -E "Type error|Failed to compile|⨯|Error:" | head -70
```

**Podejrzenie nr 1:** `apps/web/src/components/home/module-branches.tsx`
(linia ~119) używa `React.JSX.Element` w typie funkcji. W React 18 to trzeba
`JSX.Element` z importu; w React 19 `React.JSX.Element` jest poprawne.
**Sprawdź `apps/web/package.json` przed poprawką.**

**Podejrzenie nr 2:** `apps/web/src/components/home/continue-card.tsx` —
komponent lokalny `Trap` przyjmuje `children` i ikonę; brak użycia `children`
może wywołać błąd ESLinta (aczkolwiek `eslint.ignoreDuringBuilds: true`
jest włączone, więc raczej nie to).

**Podejrzenie nr 3:** `apps/web/src/components/topbar.tsx` — nowy plik,
którego nikt nie importuje; mógł zawierać literówkę w typach.

### 2.4. Czego NIE MA i dlaczego

| Brak | Dlaczego nie da się zrobić kodem |
| --- | --- |
| Wideo: upload, transkodowanie, napisy | brak magazynu obiektowego i workera |
| Muzyka AI | MusicGen wymaga GPU 16 GB — brief mówi „nie na Oracle” |
| Media w postach | `media: null` w schemacie, brak gdzie trzymać pliki |
| Powiadomienia push | decyzja niezamknięta: VAPID czy usługa zewnętrzna |
| `packages/i18n` | tylko `.gitkeep`, brak katalogów tłumaczeń |
| Agent kodujący (Aider), migi (MediaPipe) | Etapy 4–5, brak workerów |
| Ikony PWA w PNG | pliki są na maszynie, ale **niezacommitowane** |

---

## 3. Jak aplikacja ma wyglądać — pełna specyfikacja ekranów

### 3.1. Motyw i wizualny język

**Paleta** (z `packages/ui/src/themes.ts`, kontrasty policzone, wszystkie
pary ≥ 7,28:1 przy progu 4,5:1):

| Token | Wartość | Rola |
| --- | --- | --- |
| `surface` | `#05070D` | granatowa czerń, tło aplikacji |
| `surfaceRaised` | `#0C1018` | karty |
| `surfaceSunken` | `#03050A` | pola, listy |
| `accent` | `#22D3EE` | cyjan — akcja, aktywny stan |
| `accentMuted` | `#0B2A33` | tło pod akcentem |
| `glow` | `#38E8FF` | poświata — **raz na ekran** |
| `warning` | `#FB923C` | pomarańcz — ostrzeżenie |

**Kanon wizualny:**

1. **Okrągła tarcza ze znakiem + podpis** — wspólny kształt dla wszystkich
   wejść. Używany w: menu głównym, obu nawigacjach, kartach pulpitu.
2. **Poświata raz na ekran.** Na pulpicie ma ją tylko wyszukiwarka.
3. **Głębokość przez światło, nie przez kolor.** Cień dwuwarstwowy; granice
   przez `border` / `border-strong`.
4. **Zero wartości kolorów w komponentach.** Wszystko z `var(--bengos-*)`.
5. **Ruch z tokenów**, przy `prefers-reduced-motion` schodzi do 1 ms —
   animacja zostaje funkcją, przestaje być widoczna.

### 3.2. Ekran 1: logowanie i rejestracja — `/login`

**Kolejność elementów od góry:**

1. **Grafika kompozycji logowania** — u góry, pełna szerokość karty.
   Źródło: `BRAND.login` =
   `https://i.ibb.co/7dmxK4qt/C894714-D-AE6-F-4-BC6-8-B09-373-B4-EF5-D811.jpg`
   `alt=""` — napisy „logowanie” i „rejestracja” są wypalone w grafice.
2. **Karta formularza** (`bengos-surface-card`, wyrównanie do środka):
   - **znak prosty** 88 px w kole, z poświatą `--bengos-glow`,
     źródło `BRAND.logo`,
   - `h1` = „LOGOWANIE” albo „REJESTRACJA” (rozstrzelenie `0.14em`),
   - podpis: „Jedno konto dla wszystkich modułów”.
3. **Przyciski dostawców** (jeśli serwer ma klucze) — **PRZED** formularzem
   hasła:
   - każdy przycisk: **tarcza ze znakiem dostawcy + nazwa**,
   - znak rysowany `currentColor` (Google — cztery pola, GitHub — sylwetka kota),
   - gdy brak kluczy: przycisk **widoczny, nieaktywny**, z wyjaśnieniem.
4. **Separator** „albo emailem”.
5. **Przełącznik trybu**: dwie zakładki — „Logowanie” / „Rejestracja”
   (`role="tablist"`, aktywna ma tło `accentMuted` **i** obramowanie akcentu).
6. **Pola formularza** — etykieta nad polem, podpowiedź pod etykietą,
   błąd pod polem (`role="alert"` + `aria-invalid` na polu):

   | Pole | Etykieta | Podpowiedź |
   | --- | --- | --- |
   | `username` (rejestracja) | Nazwa użytkownika | 3–30 znaków: małe litery, cyfry, podkreślenie |
   | `email` (rejestracja) | Adres email | Nigdy nie pokazuje się w profilu publicznym |
   | `identifier` (logowanie) | Nazwa użytkownika albo email | Oba działają |
   | `password` | Hasło | Co najmniej 12 znaków (rejestracja) |

   Pole hasła ma przycisk **Pokaż / Ukryj** (`aria-pressed`).
7. **Przycisk główny** — pełna szerokość, tło `accent`.
8. **Stopka karty** — jedno zdanie o hashowaniu hasła i szyfrowaniu kluczy.
9. **Odnośnik** „Wróć do BENGOS Home” pod kartą.

**Tło ekranu:** gradient radialny z tokenów + dwie rozmyte plamy
(cyjan lewo-góra, pomarańcz prawo-dół), `aria-hidden`, `pointer-events: none`.

### 3.3. Ekran 2: pulpit — `/`

**Kolejność elementów od góry:**

1. **Grafika pulpitu** z podpisami modułów, wyśrodkowana, `max-w-md`,
   źródło `BRAND.home` =
   `https://i.ibb.co/TxDg2pFH/44747202-085-E-42B8-BE50-EF91CAF448-F1.jpg`,
   `alt=""` — nazwy modułów są też prawdziwymi odnośnikami pod nią.
2. **Wyszukiwarka uniwersalna** — jedyna powierzchnia z poświatą
   (`bengos-surface-hero` + `bengos-glow-ring`):
   - podpis „WYSZUKIWARKA UNIWERSALNA”,
   - `h2` = „Co chcesz zrobić?”,
   - zdanie o zakresie,
   - cztery intencje jako kafle: Zapytaj / Stwórz / Znajdź / Zakoduj.
3. **Pasek tożsamości** (`IdentityBar`):
   - **awatar** — 44 px kółko z pierwszą literą nazwy albo z `avatarUrl`,
   - nazwa (ucięte `truncate` + `title`), `@uchwyt` i role,
   - dwie akcje z tarczami: **Twórz** → `/studio`, **Profil** → `/profile`,
   - bez sesji: podpis „NIE ZALOGOWANO” + jedno wyjście do `/login`.
4. **Karta „Stwórz teraz”** — cztery wejścia, każde **z tarczą i znakiem**:
   Wideo `/studio/video`, Muzyka `/studio/music`, Post `/studio/post`,
   Projekt kodu `/studio/project`.
5. **Karta „Kontynuuj”** — trzy stany z tarczami (Wymaga konta / Pusto /
   błąd) i lista wpisów z tarczą rodzaju pracy.
6. **Karta „Dla Ciebie”** — trzy kryteria jako pigułki + odnośnik do feedu.
7. **Karta „Dostępność”** — cztery przełączniki, cały wiersz klikalny.
8. **„Gdzie chcesz wejść”** — **siedem okrągłych kafli** modułów:

   | Tarcza | Podpis | Znacznik | Trasa |
   | --- | --- | --- | --- |
   | Feed | Feed | Etap 2 | `/feed` |
   | Studio | Studio | Etap 2 | `/studio` |
   | Chat | Chat | Etap 4 | `/chat` |
   | Create | Create | Etap 5 | `/create` |
   | Dev | Dev | Etap 5 | `/dev` |
   | Access | Access | Etap 4 | `/access` |
   | Profile | Profile | **Dostępny** | `/profile` |

   Każdy kafel: okrągła tarcza 56 px ze znakiem SVG, pod nią nazwa, pod nią
   jedno zdanie, na dole znacznik etapu. Siatka: 2 kolumny do `lg`,
   3 kolumny od `lg`.

### 3.4. Powłoka (`AppShell`)

- **Pasek górny** (przyklejony, `backdrop-blur`): znak 36 px w kole +
  „BENGOS” + **nawigacja modułów z tarczami i znakami** (tylko `md+`) +
  „Ustawienia”. Aktywna pozycja: tło `accentMuted` + tekst akcentu.
- **Dolna nawigacja** (tylko telefon, `md:hidden`): pięć miejsc, każde
  **tarcza 36 px ze znakiem + podpis**, aktywna ma obramowanie akcentu
  i kreskę `bengos-nav-mark`.
- **Skip-link** jako pierwszy element w tabulacji.

---

## 4. Linki i zasoby

### 4.1. Grafiki marki (linki bezpośrednie, `i.ibb.co`)

| Zastosowanie | Adres |
| --- | --- |
| Znak prosty (nagłówek, ekran startowy, ikona PWA) | `https://i.ibb.co/bMZh3YJs/C57-AC4-F4-7-D83-4-F5-D-890-F-00-BB1-F79-D6-F3.jpg` |
| Kompozycja logowania | `https://i.ibb.co/7dmxK4qt/C894714-D-AE6-F-4-BC6-8-B09-373-B4-EF5-D811.jpg` |
| Kompozycja pulpitu | `https://i.ibb.co/TxDg2pFH/44747202-085-E-42B8-BE50-EF91CAF448-F1.jpg` |

**Wszystkie trzy są wpisane w JEDNYM miejscu:** `apps/web/src/lib/brand.ts`.
Przeprowadzka na pliki lokalne = zmiana trzech wartości, nie szukanie
adresów po kodzie.

**Uwaga o formie adresu:** `i.ibb.co/...` to adres **pliku**;
`ibb.co/...` to **strona podglądu** (HTML), a `<img src>` wskazujący na HTML
nie wyświetli niczego. Ta pomyłka kosztowała już jedną rundę.

### 4.2. Repozytorium i wdrożenie

| Rzecz | Adres / ścieżka |
| --- | --- |
| Repozytorium | `github.com/axelgadomski420/TIKBENGOS` |
| Wdrożenie produkcyjne | `infra/docker-compose.prod.yml` |
| Tunel Cloudflare (tryb szybki) | `infra/docker-compose.tunnel.yml` |
| **Tunel nazwany (stały adres)** | `infra/docker-compose.tunnel-named.yml` |
| Instrukcja Cloudflare | `docs/cloudflare.md` |
| Instrukcja logowania Google | `docs/logowanie-google.md` |
| Stan Etapu 1 | `docs/stage-1.md` |
| Adres publiczny (HTTP) | `http://92.5.154.243` |

### 4.3. Zmienne środowiskowe

Wzór: `infra/.env.example`. Plik `.env` leży **tylko na maszynie**, nigdy
w repozytorium (jest w `.gitignore` — trzyma `SECRET_KEY`,
`FIELD_ENCRYPTION_KEY` i hasła).

Klucze dodane dla logowania przez dostawcę:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
OAUTH_REDIRECT_BASE=https://twoj-adres
```

**Adres callbacku do wpisania w panelu Google:**

```
{OAUTH_REDIRECT_BASE}/api/auth/oauth/google/callback
```

Musi być **identyczny co do znaku** w panelu i w `.env` — rozjazd daje
`redirect_uri_mismatch` u Google.

---

## 5. Kolejność prac — od pierwszego kliknięcia do ostatniego etapu

### KROK 0 — doprowadź build do zielonego (BLOKUJE WSZYSTKO)

1. Uruchom komendę diagnostyczną z §2.3.
2. Przeczytaj **pełny** komunikat — plik, linię, treść.
3. Popraw **tylko to jedno miejsce**.
4. Ponów build. Powtarzaj aż do `✔ Image tikbengos-web Built`.
5. **Nie dokładaj żadnych nowych zmian**, dopóki build nie przejdzie.

```shell
cd ~/TIKBENGOS && git pull && sudo docker compose --env-file .env \
  -f infra/docker-compose.prod.yml up -d --build api web 2>&1 | tail -30 && \
  curl -s http://127.0.0.1/v1/health && echo
```

### KROK 1 — zacommituj to, co leży na dysku niezacommitowane

```shell
cd ~/TIKBENGOS && rm -f nano.25594.save && \
  git add apps/web/public/icons apps/web/public/brand && \
  git commit -m "feat(brand): ikony PWA i grafiki marki" && git push
```

### KROK 2 — stały adres HTTPS (odblokowuje logowanie Google)

Postępuj według `docs/cloudflare.md`. Skrót:

1. Domena w Cloudflare (plan Free), serwery nazw zmienione u rejestratora.
2. **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**,
   nazwa `bengos`.
3. **Public Hostname**: subdomena `bengos`, typ `HTTP`, URL **`proxy:80`**.
4. Token i nazwa do `.env` (komendy w §4 instrukcji).
5. Zatrzymaj stary tunel, podnieś nazwany:

   ```shell
   cd ~/TIKBENGOS && sudo docker compose -f infra/docker-compose.tunnel.yml down && \
     sudo docker compose --env-file .env -f infra/docker-compose.prod.yml up -d api && \
     sudo docker compose --env-file .env -f infra/docker-compose.tunnel-named.yml up -d
   ```

**Uwaga:** `api`, `api:8000`, `web`, `web:3000`, `127.0.0.1`, `localhost`
MUSZĄ zostać w `ALLOWED_HOSTS` obok domeny. Interfejs woła API przez
wewnętrzne nazwy Dockera, a Django odrzuca żądanie z hostem spoza listy.

### KROK 3 — logowanie Google

Postępuj według `docs/logowanie-google.md`. Kod jest gotowy:
`services/api/accounts/oauth.py` + migracja `0002_linked_accounts` +
trasa `/api/auth/oauth/[...path]` w interfejsie.

Sprawdzenie:

```shell
curl -s http://127.0.0.1/api/auth/oauth/providers
```

Oczekiwane: `[{"id":"google","label":"Google","configured":true}, …]`.
Jeśli `configured: false` — użyj `up -d api`, a nie `restart` (restart nie
wczytuje nowych zmiennych z `.env`).

### KROK 4 — interfejs komentarzy (ostatni brak Etapu 2)

Endpointy **już istnieją** i są gotowe:

- `GET  /api/feed/posts/{post_id}/comments` — lista, od najstarszego,
- `POST /api/feed/posts/{post_id}/comments` — dodanie, z `parentCommentId`
  dla odpowiedzi,
- reguła: **dwa poziomy i ani jednego więcej** (odpowiedź na odpowiedź
  jest odrzucana kodem 400),
- limit treści: 500 znaków,
- licznik `comment_count` rośnie w tej samej transakcji co rekord.

Do zrobienia: **nowy plik** `apps/web/src/components/feed/post-comments.tsx`.
Wymagania:

- rozwijane pod wpisem (przycisk „Komentarze (N)” z `aria-expanded`),
- lista od najstarszego, odpowiedzi wcięte o jeden poziom,
- pole dodawania z licznikiem znaków (limit 500, jak na serwerze),
- stany: ładowanie (`role="status"`), puste, błąd z ponowieniem,
- **cała ścieżka dostępna z klawiatury**, etykiety nad polami,
  `aria-invalid` przy błędzie,
- zero kolorów wprost — tylko `var(--bengos-*)`.

### KROK 5 — Etap 3: muzyka AI (wymaga decyzji właściciela)

**Nie zaczynaj bez potwierdzenia.** MusicGen średni potrzebuje **GPU 16 GB**
pamięci. Brief mówi wprost: „osobny worker, nie część maszyny aplikacyjnej”.
Do ustalenia: gdzie stoi worker i kto płaci za GPU.

### KROK 6 — Etap 4: czat i dostępność

W kolejności:

1. **Czat**: model (`Conversation`, `Participant`, `Message`) jest w kontrakcie,
   konsument WebSocket działa. Brakuje: ekranu listy rozmów, ekranu rozmowy,
   obecności, licznika nieprzeczytanych.
2. **Dostępność**: TTS, STT, napisy, Morse przez wibracje — warstwy
   `packages/accessibility` do przeniesienia z TIKMORS/TIKMIG.
3. **Migi**: model z TIKMIG rozpoznaje **250 znaków ASL, nie PJM** i nie ma
   segmentacji ciągłego migania. **Interfejs musi to mówić wprost**, bez
   obiecywania pełnego tłumaczenia.

### KROK 7 — Etap 5: asystent i GitHub

1. **Create**: `django-ai-assistant` z TIKAL jako **zależność**, nie kopiowany
   kod. Kontekst z projektów użytkownika, nie z wiedzy ogólnej.
2. **Dev**: GitHub App z tokenem o najmniejszych potrzebnych uprawnieniach,
   przeglądanie repozytoriów i issue, agent kodujący w **piaskownicy**
   (nigdy jako proces serwerowy z tokenem użytkownika), **zatwierdzenie
   człowieka przed każdą gałęzią, commitem i pull requestem**,
   trwały dziennik operacji na kodzie.

### KROK 8 — Etap 6: wydanie 1.0

1. **Transkodowanie wideo** — magazyn obiektowy + kolejka zadań.
2. **Powiadomienia push** — decyzja: VAPID czy usługa zewnętrzna.
3. **Licencje**: `TIKMIG` (brak pliku) i `TIKMESS` (niepotwierdzona) —
   patrz `docs/licensing.md`. **Bez tego nie ma publicznego wydania.**
4. **Migracja danych z TIKTAK** — zakres mediów z Cloudinary nieznany
   bez dostępu do konta.
5. **Domena i tunel nazwany** — stały adres w produkcji.
6. Audyt WCAG 2.2 AA na każdym nowym ekranie — `contrast.test.ts` musi
   przechodzić.

---

## 6. Czego NIE da się zrobić kodem — nie obiecuj tego

- **Wideo bez magazynu i workera** — potrzebne S3/R2 + proces transkodowania.
- **Muzyka AI bez GPU** — 16 GB VRAM, osobna maszyna.
- **HTTPS bez domeny** — Let's Encrypt nie wydaje certyfikatów na adresy IP.
- **Logowanie Google po HTTP** — Google dopuszcza `http://` wyłącznie dla
  `localhost`; dla `92.5.154.243` odrzuci adres zwrotny.
- **Stały adres bez domeny** — tryb szybki Cloudflare zawsze losuje adres.
- **Push bez decyzji o kanale** — zgoda na coś, czego nie ma, to obietnica
  bez pokrycia.

---

## 7. Weryfikacja po każdym kroku

```shell
cd ~/TIKBENGOS && git pull && sudo docker compose --env-file .env \
  -f infra/docker-compose.prod.yml up -d --build api web 2>&1 | tail -20
```

```shell
curl -s http://127.0.0.1/v1/health && echo && \
  curl -s http://127.0.0.1/api/auth/oauth/providers && echo
```

**Nie raportuj sukcesu bez tych dwóch wyników.** „Kod jest gotowy” nie
znaczy „build przechodzi”.

---

## 8. Styl pracy

- **Odpowiadaj po polsku**, konkretnie, bez lania wody.
- **Zacytuj plik i linię**, gdy coś twierdzisz o kodzie.
- **Nie zgaduj.** Czego nie odczytałeś — napisz wprost, że nie odczytałeś.
- **Jeden krok na raz.** Mała zmiana → build → zielony wynik → następna
  zmiana. Dwanaście zmian bez builda to dwanaście miejsc, w których może
  siedzieć błąd.
- **Nie usuwaj niczego**, nawet jeśli wydaje się niepotrzebne — zapytaj.
- **Nie usuwaj tego dokumentu.** Ma zostać jako instrukcja dla kolejnych osób.
