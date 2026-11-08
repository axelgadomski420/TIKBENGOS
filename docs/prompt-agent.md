# BENGOS — mega-prompt wdrożeniowy

Dokument do przekazania agentowi kodującemu. Opisuje **działanie każdej
funkcji** (endpointy, kontrakty, reguły, kody błędów), wygląd ekranów i pełną
kolejność prac od logowania do ostatniego etapu.

Wszystko, co tu napisane o kodzie, pochodzi z odczytu plików na `main`
(commit `4228fac`). Czego nie odczytano — jest oznaczone jako nieodczytane.

---

## 0. Kontekst

TIKBENGOS to **jeden społecznościowy system operacyjny**: siedem dawnych
aplikacji jest modułami, ale użytkownik nie widzi granicy — jedno konto,
jeden system uprawnień, jedna tożsamość.

| Warstwa | Technologia | Ścieżka |
| --- | --- | --- |
| Interfejs | Next.js 15, React, Tailwind | `apps/web` |
| API | Django 5 + django-ninja | `services/api` |
| Czas rzeczywisty | Channels + Redis | `services/api/accounts/routing.py` |
| Design system | tokeny `--bengos-*` | `packages/ui` |
| Kontrakty typów | TypeScript | `packages/core` |
| Baza | PostgreSQL 16 | `infra/docker-compose.prod.yml` |

**Wersje ustalone, nie do zmiany:** Python **3.12** (nie 3.13 — MediaPipe,
TensorFlow i Aider), Node **20**, PostgreSQL 16, Redis 7.

---

## 1. Zasady nadrzędne

1. **Nie kasuj i nie nadpisuj.** Nowa rzecz = nowy plik.
2. **Nie usuwaj komentarzy.** Niosą decyzje „dlaczego tak”.
3. **Nie zgaduj zawartości plików.** Czego nie odczytasz — napisz to.
4. **Nie twórz atrap.** Żadnych przycisków, które nic nie robią.
5. **Nie zmieniaj** tokenów, palet, modeli kluczy, wersji języka.
6. **Nie uruchamiaj** `makemigrations` — migracje są pisane ręcznie i tylko **dodające**.
7. **Nie ogłaszaj sukcesu bez dowodu.** Dowód to `✔ Image tikbengos-web Built`
   i `{"status":"ok"}` z `/v1/health`.

---

## 2. Jak działa system — pełny opis funkcji

### 2.1. Przepływ żądania (interfejs → API)

```
przeglądarka → /api/<ścieżka>  (Next.js)
             → apps/web/src/app/api/[...path]/route.ts   (proxy)
             → API_INTERNAL_URL + /v1/<ścieżka>          (Django)
```

**Funkcja proxy (`route.ts`) — co robi dokładnie:**

1. Czyta `API_INTERNAL_URL`. Brak → `503` z `{code:"internal"}`.
2. **Filtr prefiksów** — dozwolone: `csrf, auth, users, feed, music, chat,
   ai, git, access, settings, jobs`. Ścieżka spoza listy → `404`. Bez tego
   proxy byłoby otwartym przekierowaniem na dowolny adres.
3. Usuwa `host`, `connection`, `content-length` — opisują połączenie
   z proxy, nie z API.
4. `redirect: "manual"`, `cache: "no-store"`.
5. **Przepisuje `set-cookie` jawnie** przez `getSetCookie()`, po wcześniejszym
   `delete("set-cookie")`. Bez tego ciasteczko sesji ginęło i użytkownik był
   wylogowany po każdym żądaniu.
6. Błąd sieci → `503` `{code:"unavailable"}`.
7. Eksportuje `GET`, a `POST`, `PATCH`, `PUT`, `DELETE` są tym samym handlerem.

**Po co to proxy:** żeby ciasteczko sesji było w tej samej domenie, co
interfejs. Bez tego trzeba by CORS, `SameSite=None` i listy dozwolonych
źródeł w każdym środowisku.

### 2.2. Klient API (`lib/api-client.ts`) — co robi dokładnie

- `apiFetch(path, {method, body, signal, csrf})`:
  - limit **20 000 ms** (`AbortController`); przerwanie → `ApiRequestError`
    `{code:"unavailable", message:"Żądanie zostało przerwane."}`,
  - **bez automatycznych powtórzeń** — cicha ponowna próba ukrywa awarię,
  - dla metod innych niż `GET/HEAD/OPTIONS` dokłada nagłówek
    **`x-csrf-token`** (stała `CSRF_HEADER_NAME`),
  - `credentials: "same-origin"`,
  - status `204` → `undefined`,
  - `!res.ok` → `toApiError(status, payload)`; **`403` czyści bufor tokenu**
    (Django rotuje token przy logowaniu i wylogowaniu),
  - nagłówek `content-type: application/json` tylko przy ciele.
- `csrfToken()`: **ciasteczko ma pierwszeństwo**; brak → `GET /api/csrf`;
  token trzymany w zmiennej modułu, `resetCsrfToken()` go czyści.
- `toApiError` czyta **trzy kształty** błędu, bo django-ninja daje różne:
  `detail: string`, `detail` jako tablica walidacji (`msg` + ostatni `loc`
  jako `field`) oraz `{code, message, field}` z `HttpError`.
- `codeForStatus`: 400/401/403/404/409/429/503 → `bad_request`/`unauthorized`/
  `forbidden`/`not_found`/`conflict`/`rate_limited`/`unavailable`, reszta →
  `internal`.
- `useAsync(loader, deps, enabled)`: zwraca `{data, loading, error, reload}`,
  anuluje żądanie przy odmontowaniu, nie ustawia stanu po `abort`.
  `enabled: false` (np. brak sesji) → **żądanie nie leci wcale**.

### 2.3. Tożsamość, sesja, uprawnienia

**Model `User`** (`accounts/models.py`): `id` = **UUID** (identyfikator jest
publiczny — numer sekwencyjny zdradzałby kolejność rejestracji), `email`
unikalny, `display_name`, `avatar_url`, `bio`, `website`, `roles` (JSON),
`perception` (`both` | `audio-only` | `text-only`), cztery zgody
(`consent_camera`, `consent_microphone`, `consent_github`,
`consent_push_notifications`) + `consents_updated_at`.

**`effective_roles()`** zawsze dokłada `user` na początek, nawet gdy w bazie
zapisano tylko rolę wyższą. Brak tego odebrałby podstawę.

**Uprawnienia liczone z ról, nie z roli** (`accounts/permissions.py`, kopia
z `packages/core/src/identity.ts`):

| Rola | Uprawnienia |
| --- | --- |
| `user` | `post.create`, `music.generate`, `settings.manage` |
| `creator` | + `repo.connect` |
| `moderator` | `post.create`, `post.delete.any`, `comment.moderate`, `user.suspend`, `settings.manage` |
| `developer` | `post.create`, `music.generate`, `code.contribute`, `repo.connect`, `settings.manage` |
| `admin` | wszystkie osiem |

**Endpointy tożsamości** (`accounts/api.py`; zamontowane pod `/v1/auth`
i `/v1/users` — ten sam router, dwa `url_name_prefix`):

| Metoda | Ścieżka | Działanie |
| --- | --- | --- |
| `POST` | `/auth/register` | tworzy konto, zwraca `201 SessionOut`, wpisuje `identity_id` do sesji, **`cycle_key()`** (bez fiksacji sesji) |
| `POST` | `/auth/login` | jedno pole `identifier` — nazwa **albo** email; `401` przy złych danych, `cycle_key()` |
| `POST` | `/auth/logout` | wpis w dzienniku audytu, `session.flush()`, `204` |
| `GET` | `/users/me` | `200 IdentityOut` albo `401` |
| `PATCH` | `/users/me` | `displayName` (80), `bio` (500), `website` (200); tylko przekazane pola |
| `PATCH` | `/users/me/consents` | cztery zgody + `consents_updated_at`; dziennik zapisuje, **które** pola zmieniono |
| `GET` | `/users/me/permissions` | `{roles, permissions}` — interfejs i serwer muszą liczyć tak samo |

**Walidacja po stronie serwera:** `USERNAME_PATTERN = ^[a-z0-9_]{3,30}$`,
hasło min. **12 znaków**, email musi zawierać `@` i nie zaczynać się ani
kończyć `@`. Rejestracja: `409` przy kolizji nazwy lub adresu.
Kody: `400 bad_request` / `401 unauthorized` / `409 conflict`.

**Błąd `EPOCH` — historia, która nie może się powtórzyć:** `_consents()`
używa `datetime(1970,1,1,tzinfo=dt_timezone.utc)` z modułu `datetime`.
`django.utils.timezone` **nie ma** atrybutu `datetime`, a błąd wychodził
wyłącznie dla **świeżego konta** (puste `consents_updated_at`) — więc
`POST /register` dawał `500`, gdy `GET /csrf` dawał `200`. Nie wracaj do
`timezone.datetime`.

**Sesja i CSRF** (`tikbengos/settings.py`): `SESSION_ENGINE = cached_db`,
`SESSION_COOKIE_HTTPONLY = True`, `SAMESITE = "Lax"`, `SECURE = not DEBUG`,
`SESSION_COOKIE_AGE = 30 dni`, `CSRF_COOKIE_HTTPONLY = False` (interfejs musi
token odczytać) i — krytyczne — `CSRF_HEADER_NAME = "HTTP_X_CSRF_TOKEN"`.
Zmiana tej stałej bez zmiany klienta odrzuca **każde** żądanie zapisujące
kodem `403`, a GET-y działają dalej, więc objaw wygląda jak brak funkcji.

**Punkty infrastruktury** (`tikbengos/urls.py`):

| Ścieżka | Działanie |
| --- | --- |
| `GET /v1/health` | `{"status":"ok"}` — nic nie ujawnia, nie sprawdza bazy |
| `GET /v1/csrf` | `ensure_csrf_cookie` + `get_token()`; **nie** odczyt z `META`, bo przy pierwszym wejściu tokenu jeszcze nie ma |
| `GET /v1/config` | `realtimePath`, `csrfPath`, `healthPath`, `apiPrefix`, `oauthPaths` — jedno źródło prawdy dla klienta |
| `handler(Exception)` | zawsze `{code:"internal"}` — bez stosu wywołań w odpowiedzi |

Dwa montaże tego samego routera **wymagają** różnych `url_name_prefix`;
bez nich django-ninja rzuca `ConfigError` i padają nawet `migrate`.

### 2.4. Logowanie przez dostawcę (Google, GitHub)

`accounts/oauth.py`. To **nie** `django-allauth` — paczka przyniosłaby drugi
model użytkownika, czyli drugi system tożsamości. Trzy zasady:

1. **`state` z sesji, nie z adresu.** `secrets.token_urlsafe(32)` ląduje
   w sesji przy starcie; callback porównuje przez **`secrets.compare_digest`**
   (zwykłe `==` kończy na pierwszym różnym znaku i mierzy czas — to
   informacja zwrotna dla zgadującego). Niezgodność → `400 bad_request`
   (to sfałszowane żądanie, nie złe poświadczenie). `state` jest
   **jednorazowy** — po użyciu znika z sesji.
2. **Adresy z katalogu, nie z formularza** (`_oauth_config`): Google
   `accounts.google.com/o/oauth2/v2/auth` → `oauth2.googleapis.com/token` →
   `openidconnect.googleapis.com/v1/userinfo`, zakres `openid email profile`,
   dodatkowo `prompt=select_account` (bez tego Google wchodzi od razu na
   ostatnie konto). GitHub: `github.com/login/oauth/authorize` →
   `.../access_token` → `api.github.com/user`, zakres `read:user user:email`.
3. **Rejestracja przez dostawcę daje hasło nieużywane** —
   `set_unusable_password()`. Nikt nie zgadnie hasła, bo żadnego nie ma.

**Endpointy:**

| Metoda | Ścieżka | Działanie |
| --- | --- | --- |
| `GET` | `/auth/oauth/providers` | `[{id,label,configured}]` — interfejs rysuje przyciski **z tej listy**, nigdy ze stałej |
| `POST` | `/auth/oauth/{provider}/start` | zapisuje `state`, zwraca `{authorizeUrl}`; brak kluczy → `503`, nieznany dostawca → `404` |
| `POST` | `/auth/oauth/{provider}/callback?code=&state=` | wymienia kod, czyta profil, zakłada lub podpina konto, ustawia sesję |

**Reguły wiązania konta:** jeśli para `(provider, subject)` już istnieje →
loguje na to konto. Jeśli nie, ale **ten sam email już ma konto z hasłem** →
dostawca zostaje **podpięty do istniejącego konta**, a nie zakłada drugiego.
Drugie konto na ten sam adres jest dokładnie tym, czego brief zabrania.
Uchwyt dla nowego konta powstaje z `_unique_username()` (3–30 znaków,
`[a-z0-9_]`, doklejany licznik).

**Wymagany zweryfikowany email:** brak albo `email_verified: false` → `400`
z wyjaśnieniem (adres jest potrzebny do odzyskania dostępu). GitHub bez adresu
w profilu → osobne `GET /user/emails`, brane wyłącznie `primary && verified`.

**Adresy callbacku — muszą być identyczne co do znaku w panelu i w `.env`,**
inaczej Google zwraca `redirect_uri_mismatch`:

```
{OAUTH_REDIRECT_BASE}/api/auth/oauth/google/callback
{OAUTH_REDIRECT_BASE}/api/auth/oauth/github/callback
```

Kod jest kompletny, ale **ani razu nie zbudowany ani wywołany**.

### 2.5. Klucze i katalog dostawców

**Dwa różne modele, celowo:** `ApiKey` = klucz, którym ktoś loguje się
**do nas**; `ProviderCredential` = klucz, którym **my** logujemy się gdzieś.
Odwrócenie kierunku zmienia sposób wyszukiwania i znaczenie wycieku.

**Zasada jednorazowego pokazania:** schematy `ApiKeyOut` i
`ProviderCredentialOut` **nie mają** pola `secret`; mają je tylko
`ApiKeyCreatedOut` i `ProviderCredentialCreatedOut`, używane przy tworzeniu.
Typ, który nie może zwrócić sekretu, jest lepszy niż typ, który obiecuje,
że tego nie zrobi. `reveal()` istnieje wyłącznie dla wywołań wychodzących.

**Endpointy `ApiKey`** (`accounts/keys_api.py`, prefiks `/v1/settings`):

| Metoda | Ścieżka | Działanie |
| --- | --- | --- |
| `GET` | `/settings/keys` | lista bez wartości — tylko `prefix` i `lastFour` |
| `POST` | `/settings/keys` | `201` + `secret` **tylko tutaj**; nazwa wymagana; limit **20** aktywnych |
| `DELETE` | `/settings/keys/{id}` | `revoked_at`, nie kasowanie; `404` gdy nie ma lub już odwołany |

Klucz: `bk_` + `secrets.token_urlsafe(32)`. `lookup_hash` = SHA-256
(niesolony wystarcza — 32 bajty losowości), `secret_encrypted` = szyfrogram.

**Endpointy dostawców** (`accounts/providers_api.py`):

| Metoda | Ścieżka | Działanie |
| --- | --- | --- |
| `GET` | `/settings/providers` | `[{id, kind, hasBaseUrl}]` — `hasBaseUrl: false` znaczy „zapisać można, wywołania nie będzie” |
| `GET` | `/settings/providers/credentials` | zapisane klucze, bez wartości |
| `POST` | `/settings/providers/credentials` | `201` + `secret` tylko tutaj; limit **30**; kolizja nazwy → `409` |
| `DELETE` | `/settings/providers/credentials/{id}` | odwołanie klucza |

`lookup_hash` dla kluczy dostawców liczy się z pary `(provider_id, klucz)` —
ten sam klucz wklejony dla dwóch dostawców dałby inaczej identyczny skrót,
a kolumna jest unikalna.

**Obrona przed SSRF** (`accounts/providers.py`) — kolejność sprawdzeń jest
istotna: (1) schemat musi być `https`; (2) nazwa nie może być zastrzeżona
(`localhost`, `metadata`, sufiksy `.internal`, `.local`, `.localhost`);
(3) nazwa musi się rozwiązać; (4) **rozwiązany adres** nie może należeć do
sieci wewnętrznych (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`,
`169.254/16` — metadane chmury, `::1/128`, `fc00::/7`, `fe80::/10`).

Punkt (4) łapie **DNS rebinding**: publiczna nazwa wskazująca na `127.0.0.1`.
`gethostbyname_ex` zwraca **wszystkie** adresy — pierwszy publiczny nie może
przesłonić wewnętrznego.

Dodatkowo `validate_credential()` odrzuca klucz krótszy niż 8 znaków
i zawierający białe znaki. Dostawcy bez potwierdzonego adresu (m.in.
`assemblyai`, `speechmatics`, `playht`, `suno`, `udio`, `cloudflare`,
`azure-openai`, `aws-bedrock`) są w `PROVIDERS_WITHOUT_URL` — klucz czeka,
wywołanie zgłasza błąd, nie łączy się po cichu z niczym.
`base_url_for()` jest **jedynym** miejscem, w którym powstaje adres
wychodzącego żądania.

### 2.6. Feed — wpisy, polubienia, komentarze

`feed/api.py`. **Stronicowanie kursorem, nie numerem strony** — feed rośnie
od góry, a numeracja dawałaby powtórzenia i ubytki. Kursor jest
nieprzezroczysty (base64 `ISO8601|uuid`) i koduje **moment oraz identyfikator**
ostatniego wpisu, bo dwóch wpisów z tej samej sekundy czas sam nie rozstrzyga.
Kolejność: `-created_at`, `-id`. Uszkodzony kursor → `400`, nie `500`.

| Metoda | Ścieżka | Działanie |
| --- | --- | --- |
| `GET` | `/feed/posts?limit=&cursor=&filter=&tag=` | `limit` 20 domyślnie, max 50; `filter` ∈ `following`\|`explore` (inna wartość → `400`, nie cichy fallback); `tag` osobno i łącząco; czyta **jedno żądanie więcej** niż trzeba, żeby wiedzieć, czy jest następna strona; dosyła **mapę autorów** tej strony w polu `authors` — bez tego interfejs pokazywałby surowy UUID |
| `POST` | `/feed/posts` | `201`; wymaga `post.create` (`403`); puste `body` → `400`; limit `BODY_MAX_LENGTH`; tagi czyszczone (małe litery, bez duplikatów, max 32 znaki, max 5) |
| `POST` | `/feed/posts/{id}/like` | **idempotentne**: istniejące polubienie nie jest błędem, wraca aktualny stan; licznik i rekord w **jednej transakcji** |
| `DELETE` | `/feed/posts/{id}/like` | cofa; `like_count` **nie schodzi pod zero** |
| `GET` | `/feed/posts/{id}/comments` | lista **od najstarszego**, limit 100; czytanie bez sesji |
| `POST` | `/feed/posts/{id}/comments` | `201`; treść max `COMMENT_MAX_LENGTH`; **dwa poziomy i ani jednego więcej** — `parentCommentId` wskazujący odpowiedź → `400`; `comment_count` rośnie w tej samej transakcji |
| `DELETE` | `/feed/posts/{id}` | autor zawsze, moderator przez `post.delete.any`; **twarde** — kontrakt nie zna kosza |

**Publiczne czytanie:** `_viewer_id()` czyta `identity_id` z sesji **bez**
`current_user()` (który rzuca `401`) — gość ma prawo czytać. `filter=following`
bez sesji zwraca **pustą listę**, a nie `401`.
**Prywatność:** autor serializowany jako `{id, username, displayName, avatarUrl}`
— **nigdy** adres email. Puste `body` idzie jako `null`, nie `""`.

### 2.7. Kanał czasu rzeczywistego

`accounts/consumers.py`. Tożsamość pochodzi **wyłącznie z ciasteczka sesji**
— nic z payloadu nie może jej zmienić, inaczej dowolny klient podałby cudze
`userId`. Brak sesji → zamknięcie kodem **4401** (własny kod: „brak sesji”,
nie „błąd serwera” — klient nie ponawia). Po połączeniu serwer wysyła
`{"type":"ready","userId":…}`.

`ping` → `pong`. **Nieznany typ nie zamyka połączenia**, ale nie milczy —
 odpowiada `{type:"error", code:"unknown_type"}`. Dzięki temu nowszy klient
nie wywali starszego serwera. `ChatConsumer` i `PresenceConsumer` są
zarejestrowane, ale bez logiki — świadomie, bo „na razie prosto” dałoby drugi
protokół obok docelowego z `packages/core/src/chat.ts`.

**Kontrakty zadań (`packages/core/src/api.ts`):** każda długa operacja ma
trójstopniowy kształt — zlecenie zwraca `{jobId, channel}`, odczyt zwraca
`JobStatus` (`queued`/`running`/`succeeded`/`failed`/`cancelled`), a kanał
przysyła `job.progress` i `job.finished`. **Interfejs nie odpytuje w pętli.**

### 2.8. Autoryzacja wywołań do dostawców

`auth_headers_for()` buduje nagłówek wg schematu dostawcy: `anthropic` →
`x-api-key`, `google-ai` → `x-goog-api-key`, `elevenlabs` → `xi-api-key`,
`deepgram` → `Authorization: Token` (nie Bearer), `gitlab` → `PRIVATE-TOKEN`,
reszta → `Authorization: Bearer`. Klucz powstaje w jednym miejscu i nie
trafia nigdzie indziej.

---

## 3. Jak aplikacja ma wyglądać

### 3.1. Motyw

| Token | Wartość | Rola |
| --- | --- | --- |
| `surface` | `#05070D` | granatowa czerń, tło |
| `surfaceRaised` | `#0C1018` | karty |
| `surfaceSunken` | `#03050A` | pola, listy |
| `accent` | `#22D3EE` | cyjan — akcja, stan aktywny |
| `accentMuted` | `#0B2A33` | tło pod akcentem |
| `glow` | `#38E8FF` | poświata — **raz na ekran** |
| `warning` | `#FB923C` | pomarańcz |

Ruch: `fast` 140 ms, `smooth` 320 ms, `enter` 420 ms. Przy
`prefers-reduced-motion: reduce` schodzą do **1 ms** — animacja zostaje
funkcją, przestaje być widoczna. Geometria: `radius-card` 20 px,
`radius-control` 12 px, `touch-target-min` **44 px** (poniżej nie schodzimy).
Kontrast: 4,5:1 dla tekstu zwykłego, 3:1 dla dużego — bramką jest
`packages/ui/src/contrast.test.ts`, a nie raport. Zmiany w komponentach
używają **wyłącznie** `var(--bengos-*)`.

### 3.2. Logowanie i rejestracja — `/login`

Kolejność od góry: grafika `BRAND.login` → karta z **88 px znakiem w kole**
i poświatą → `h1` „LOGOWANIE”/„REJESTRACJA” (rozstrzelenie `0.14em`) →
**przyciski dostawców NAD formularzem** → separator „albo emailem” →
zakładki trybu (`role="tablist"`) → pola → przycisk główny → stopka.

**Działanie formularza (`login-form.tsx`):** walidacja **przed** wysłaniem,
regułami z `@bengos/core` (jedna kopia reguł, nie dwie); zakładki czyszczą
formularz i błędy; pole hasła ma przycisk **Pokaż/Ukryj** z `aria-pressed`.
Po sukcesie **`window.location.assign("/")`** — pełne przejście, bo tożsamość
czyta się przy pierwszym renderze i tylko przeładowanie daje widok bez
migotania „nie zalogowany”.

Błąd pola trafia do `role="alert"` **i** `aria-invalid` na polu; błąd ogólny
do osobnego `role="alert"`. Pole dostawcy: przycisk **widoczny, ale
nieaktywny** z wyjaśnieniem, gdy `configured: false` — ukrycie go nie
powiedziałoby, że taka droga istnieje. Znak dostawcy rysowany `currentColor`
(Google — cztery pola, GitHub — sylwetka; nieznany → kropka, nigdy pustka).

Powód odmowy z adresu (`?oauth=…`) zamieniany na zdanie i **usuwany
z adresu** (`replaceState`) — komunikat jest jednorazowy.

### 3.3. Pulpit — `/`

Grafika `BRAND.home` → wyszukiwarka (jedyna powierzchnia z poświatą) →
pasek tożsamości → „Stwórz teraz” → „Kontynuuj” → „Dla Ciebie” →
Dostępność → **siedem okrągłych kafli** modułów (Feed 2, Studio 2, Chat 4,
Create 5, Dev 5, Access 4, Profile „Dostępny”), siatka 2 → 3 kolumny.

**Karta Dostępność:** cztery przełączniki, **cały wiersz jest `label`**
(palec trafia w wiersz, nie w literę), a zaznaczenie widać przez podświetloną
powierzchnię, nie tylko kolor ptaszka. Zmiana ogłaszana przez `Announcement`.

### 3.4. Profil — `/profile`

`ProfileIdentity` pokazuje `displayName`/`username`, `@uchwyt`, role
(z `ROLE_LABELS`) i tryb odbioru. `EditIdentity` edytuje **trzy** pola
(`PATCH /users/me`), po zapisie **nie przeładowuje** strony (te pola nie
zmieniają tożsamości w sesji), komunikat idzie w `role="status"` przy sukcesie
i `role="alert"` przy błędzie. **Adres email nie jest tu pokazywany ani
zmieniany** — wymaga ponownej weryfikacji, to inny proces.

---

## 4. Linki i zasoby

| Rzecz | Adres / ścieżka |
| --- | --- |
| Repozytorium | `github.com/axelgadomski420/TIKBENGOS` (gałąź `main`) |
| Wdrożenie | `infra/docker-compose.prod.yml` |
| Tunel szybki / nazwany | `infra/docker-compose.tunnel.yml` / `-tunnel-named.yml` |
| Instrukcje | `docs/cloudflare.md`, `docs/logowanie-google.md`, `docs/stage-1.md` |
| Znak prosty | `https://i.ibb.co/bMZh3YJs/C57-AC4-F4-7-D83-4-F5-D-890-F-00-BB1-F79-D6-F3.jpg` |
| Kompozycja logowania | `https://i.ibb.co/7dmxK4qt/C894714-D-AE6-F-4-BC6-8-B09-373-B4-EF5-D811.jpg` |
| Kompozycja pulpitu | `https://i.ibb.co/TxDg2pFH/44747202-085-E-42B8-BE50-EF91CAF448-F1.jpg` |

Wszystkie trzy grafiki są w **jednym miejscu**: `apps/web/src/lib/brand.ts`.
`i.ibb.co/...` to adres **pliku**; `ibb.co/...` to strona podglądu (HTML),
a `<img src>` wskazujący na HTML nie wyświetli niczego.

Zmienne dla logowania przez dostawcę (`infra/.env.example` to wzór; `.env`
leży tylko na maszynie): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `OAUTH_REDIRECT_BASE`.

---

## 5. Kolejność prac

### KROK 0 — doprowadź build do zielonego (blokuje wszystko)

```shell
cd ~/TIKBENGOS && sudo docker compose --env-file .env \
  -f infra/docker-compose.prod.yml build web 2>&1 \
  | grep -B2 -A 14 -E "Type error|Failed to compile|⨯|Error:" | head -70
```

Ostatni potwierdzony błąd (`login-form.tsx:145`, `string | undefined`) został
naprawiony commitem `da9d661` — **build pada teraz gdzie indziej** i trzeba to
zobaczyć. Sprawdź `apps/web/package.json`, zanim zmienisz
`React.JSX.Element` w `module-branches.tsx` (React 18 wymaga `JSX.Element`
z importu, React 19 akceptuje `React.JSX.Element`). Popraw **jedno** miejsce
i powtarzaj, aż zobaczysz `✔ Image tikbengos-web Built`. Nie dokładaj nowych
zmian, dopóki build nie przejdzie.

### KROK 1 — zacommituj to, co leży niezacommitowane

Ikony PWA w `apps/web/public/icons` i grafiki w `apps/web/public/brand`.

### KROK 2 — stały adres HTTPS (odblokowuje Google)

Wg `docs/cloudflare.md`: domena w Cloudflare → tunel nazwany → Public Hostname
typu `HTTP` na `proxy:80` → token do `.env` → podniesienie
`docker-compose.tunnel-named.yml`. **`api`, `api:8000`, `web`, `web:3000`,
`127.0.0.1`, `localhost` muszą zostać w `ALLOWED_HOSTS` obok domeny** —
interfejs woła API wewnętrznymi nazwami Dockera, a Django odrzuca obcy host.

### KROK 3 — logowanie Google

Wg `docs/logowanie-google.md`. Sprawdzenie:
`curl -s http://127.0.0.1/api/auth/oauth/providers` → `configured: true`.
Jeśli `false` — **`up -d api`, nie `restart`** (restart nie wczytuje nowych
zmiennych z `.env`).

### KROK 4 — interfejs komentarzy (ostatni brak Etapu 2)

Endpointy **już są** (§2.6). Do zrobienia **nowy plik**
`apps/web/src/components/feed/post-comments.tsx`: rozwijane pod wpisem
(przycisk „Komentarze (N)” z `aria-expanded`), lista od najstarszego,
odpowiedzi wcięte o **jeden** poziom, pole z licznikiem 500 znaków, stany:
`role="status"` / pusty / błąd z ponowieniem, `aria-invalid` przy błędzie,
zero kolorów wprost.

### KROK 5 — Etap 3: muzyka AI (wymaga decyzji właściciela)

**Nie zaczynaj bez potwierdzenia.** MusicGen średni potrzebuje **16 GB VRAM**
— osobny worker, nie część maszyny aplikacyjnej. Do ustalenia: gdzie stoi
i kto płaci za GPU.

### KROK 6 — Etap 4: czat i dostępność

Czat: model jest w kontrakcie, consumer działa — brakuje ekranu listy rozmów,
ekranu rozmowy, obecności i licznika nieprzeczytanych. Dostępność: TTS, STT,
napisy, Morse przez wibracje z `packages/accessibility`. Migi: model rozpoznaje
**250 znaków ASL, nie PJM** i nie ma segmentacji ciągłego migania — **interfejs
musi to mówić wprost**, bez obiecywania pełnego tłumaczenia.

### KROK 7 — Etap 5: asystent i GitHub

Create: `django-ai-assistant` z TIKAL jako **zależność**, nie kopiowany kod;
kontekst z projektów użytkownika, nie z wiedzy ogólnej. Dev: GitHub App
z tokenem o najmniejszych potrzebnych uprawnieniach, przeglądanie repozytoriów
i issue, agent kodujący w **piaskownicy** — nigdy jako proces serwerowy
z tokenem użytkownika; **zatwierdzenie człowieka przed każdą gałęzią, commitem
i pull requestem**; trwały dziennik operacji.

### KROK 8 — Etap 6: wydanie 1.0

Transkodowanie wideo (magazyn obiektowy + kolejka), decyzja o powiadomieniach
push (VAPID czy usługa), **licencje `TIKMIG` (brak pliku) i `TIKMESS`
(niepotwierdzona)** — bez tego nie ma publicznego wydania, migracja danych
z TIKTAK, audyt WCAG na każdym nowym ekranie.

---

## 6. Czego nie da się zrobić kodem

- **Wideo bez magazynu i workera** — potrzebny S3/R2 i proces transkodowania.
- **Muzyka AI bez GPU** — 16 GB VRAM, osobna maszyna.
- **HTTPS bez domeny** — Let's Encrypt nie wydaje certyfikatów na adresy IP.
- **Logowanie Google po HTTP** — Google dopuszcza `http://` tylko dla
  `localhost`.
- **Stały adres bez domeny** — tryb szybki Cloudflare zawsze losuje adres.
- **Push bez decyzji o kanale** — zgoda na coś, czego nie ma, to obietnica
  bez pokrycia.
- **`packages/i18n`** to w tej chwili `.gitkeep`, nie moduł lokalizacji.

---

## 7. Weryfikacja po każdej zmianie

```shell
cd ~/TIKBENGOS && git pull && sudo docker compose --env-file .env \
  -f infra/docker-compose.prod.yml up -d --build api web 2>&1 | tail -20
```

```shell
curl -s http://127.0.0.1/v1/health && echo && \
  curl -s http://127.0.0.1/api/auth/oauth/providers && echo
```

Nie raportuj sukcesu bez tych dwóch wyników. „Kod jest gotowy” nie znaczy
„build przechodzi”.

---

## 8. Czego nie odczytano

Nie odczytano pełnych treści: pozostałych komponentów `home/*` poza
`module-branches.tsx` i `accessibility-card.tsx`, stron `create`, `dev`,
`access`, `chat` (poza potwierdzeniem istnienia), `login/page.tsx`,
`docs/accessibility.md`, `docs/licensing.md`, `infra/*`, `scripts/*`, ani
stanu builda. Nie zgaduj ich treści — odczytaj przed zmianą.

---

## 9. Styl pracy

Odpowiadaj po polsku, konkretnie. Cytuj plik i linię, gdy twierdzisz coś
o kodzie. Nie zgaduj. Jeden krok na raz: mała zmiana → build → zielony wynik
→ następna zmiana. Nie usuwaj niczego, nawet gdy wydaje się niepotrzebne —
zapytaj. **Nie usuwaj tego dokumentu** — ma zostać jako instrukcja dla
kolejnych osób.
