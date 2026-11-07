# Logowanie przez Google — konfiguracja krok po kroku

Ten dokument opisuje **jedną rzecz**: jak podłączyć logowanie przez Google do
własnego wdrożenia BENGOS. Kod jest napisany i czeka na klucze — bez nich
przycisk na ekranie logowania jest widoczny, ale nieaktywny, z wyjaśnieniem.

---

## Zanim zaczniesz: adres musi być już ustalony

Adres zwrotny wpisuje się w **dwóch miejscach naraz** i oba muszą się zgadzać
co do znaku:

1. w panelu Google jako **Authorized redirect URI**,
2. w `.env` jako `OAUTH_REDIRECT_BASE`.

Jeśli używasz trybu szybkiego Cloudflare (`*.trycloudflare.com`), adres
**zmienia się przy każdym restarcie tunelu**. Wtedy trzeba go poprawić
w obu miejscach po każdym restarcie — inaczej Google zwróci
`redirect_uri_mismatch`.

Stały adres rozwiązuje to raz na zawsze: patrz `docs/cloudflare.md`.

---

## Krok 1 — projekt i ekran zgody

1. Wejdź na `console.cloud.google.com` i zaloguj się.
2. Utwórz nowy projekt (nazwa dowolna, np. `bengos`) albo wybierz istniejący.
3. **APIs & Services** → **OAuth consent screen**.
4. Typ: **External**. Nazwa aplikacji: `BENGOS`. Adres pomocy i kontakt:
   Twoje dane.
5. W sekcji **Scopes** nie musisz nic dodawać ręcznie — aplikacja prosi
   wyłącznie o `openid`, `email` i `profile`, czyli o tożsamość.
6. W sekcji **Test users** dodaj swój adres, dopóki aplikacja jest
   w trybie testowym. Bez tego Google odmówi logowania Tobie samemu.

---

## Krok 2 — dane dostępowe OAuth

1. **APIs & Services** → **Credentials** → **Create credentials** →
   **OAuth client ID**.
2. Typ aplikacji: **Web application**.
3. **Authorized redirect URIs** → **Add URI** i wpisz dokładnie:

   ```
   https://twoj-adres/api/auth/oauth/google/callback
   ```

4. **Authorized JavaScript origins** możesz zostawić puste — logowanie
   BENGOS nie używa przepływu po stronie przeglądarki.
5. Zapisz. Panel pokaże **Client ID** i **Client Secret**.

> **Sekret jest sekretem.** Nie wklejaj go na czacie, w zgłoszeniu ani
> w komentarzu w kodzie. Jeśli wyciekł, w tym samym panelu kliknij
> **Reset secret** i użyj nowej wartości.

---

## Krok 3 — wpisz wartości do `.env`

W katalogu repozytorium:

```shell
cd ~/TIKBENGOS
nano .env
```

Dopisz:

```
GOOGLE_CLIENT_ID=twoj-client-id
GOOGLE_CLIENT_SECRET=twoj-client-secret
OAUTH_REDIRECT_BASE=https://twoj-adres
```

`OAUTH_REDIRECT_BASE` jest bazą, z której kod buduje adres callbacku:

```
{OAUTH_REDIRECT_BASE}/api/auth/oauth/google/callback
```

Ta wartość musi być **identyczna** z tym, co wpisałeś w kroku 2.

---

## Krok 4 — przeładuj API

```shell
cd ~/TIKBENGOS
sudo docker compose --env-file .env -f infra/docker-compose.prod.yml up -d api
```

`up -d`, a nie `restart`: **`restart` nie wczytuje nowych zmiennych z `.env`**.
Kontener wstaje z tym, co miał w środowisku przy tworzeniu — dopiero
`up -d` odtwarza go z aktualnym plikiem. To najczęstsza przyczyna
„wpisałem klucze, a nadal `configured: false`”.

---

## Krok 5 — sprawdź

```shell
curl -s http://127.0.0.1/api/auth/oauth/providers
```

Oczekiwany wynik:

```json
[{"id":"google","label":"Google","configured":true},
 {"id":"github","label":"GitHub","configured":false}]
```

`configured: true` przy Google znaczy, że serwer widzi komplet kluczy.
Potem otwórz `https://twoj-adres/login` i kliknij **Kontynuuj z Google**.

---

## Jak to działa pod spodem

Droga, którą przechodzi logowanie:

```
przycisk  ->  POST /api/auth/oauth/google/start
serwer    ->  zwraca adres Google z parametrem `state` (w sesji)
przeglądarka -> przechodzi do Google, użytkownik wyraża zgodę
Google    ->  odsyła kod na /api/auth/oauth/google/callback
Next.js   ->  wymienia kod po wewnętrznej sieci Dockera
Django    ->  zakłada albo podpina konto, ustawia ciasteczko sesji
przeglądarka -> dostaje ciasteczko i wraca na pulpit
```

Trzy rzeczy, które są tu istotne:

**`state` pochodzi z sesji, nie z adresu.** Do sesji trafia losowy łańcuch
przy starcie logowania, a callback porównuje go z tym, co przyszło. Bez tego
dowolna strona mogłaby podstawić kod i wejść na cudze konto.

**Adresy dostawcy są stałe w kodzie.** `services/api/accounts/oauth.py` ma
zdefiniowane adresy autoryzacji i wymiany kodu. Adres nigdy nie przychodzi
z formularza — to ta sama zasada, którą `providers.py` stosuje do kluczy
użytkownika: obrona przed kazańiem serwerowi wysłać żądania pod adres wewnętrzny.

**Jedno konto, nie drugie.** Jeśli masz już konto na ten sam adres email,
logowanie Google **podpina się do istniejącego** zamiast zakładać drugie.
Konto założone przez Google nie ma hasła (`set_unusable_password()`), więc
nie da się go dopasować żadnym hasłem.

---

## Gdy coś nie działa

| Objaw | Co sprawdzić |
| --- | --- |
| `configured: false` | Czy `up -d api`, a nie `restart`. Czy klucz nie ma spacji na końcu. |
| `redirect_uri_mismatch` u Google | Czy adres w panelu jest identyczny z `OAUTH_REDIRECT_BASE` + ścieżka callbacku. |
| Google odmawia Tobie | Czy Twój adres jest w **Test users** na ekranie zgody. |
| „Sesja logowania wygasła” | `state` z sesji nie zgadza się z adresem. Ciasteczka nie dojechały — sprawdź, czy adres to HTTPS. |
| „Dostawca nie przekazał zweryfikowanego adresu email” | Konto Google bez potwierdzonego adresu. Potwierdź go w koncie Google. |
| Przycisk widoczny, ale nieaktywny | Przycisk jest widoczny celowo — ukrycie go nie powiedziałoby, że taka droga istnieje. |

Log API:

```shell
sudo docker compose --env-file .env -f infra/docker-compose.prod.yml logs --tail=40 api
```

Log przekierowania (błędy wymiany kodu wracają tędy):

```shell
sudo docker compose --env-file .env -f infra/docker-compose.prod.yml logs --tail=40 web
```

---

## Czego ten dokument nie obiecuje

Nie zakłada Ci projektu w Google i nie wpisuje kluczy za Ciebie — te dwie
rzeczy są poza repozytorium. Konfiguracja po stronie kodu jest gotowa,
włącznie z trasą adresu zwrotnego i ekranem dokończenia logowania.

**Kod OAuth nie został uruchomiony ani razu.** Został napisany z odczytanego
kodu projektu i jest spójny z resztą — ale pierwszy build i pierwsza próba
logowania zweryfikują go dopiero u Ciebie.
