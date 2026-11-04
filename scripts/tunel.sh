#!/usr/bin/env bash
#
# TIKBENGOS przez Cloudflare Tunnel — publiczny adres HTTPS bez otwierania portów.
#
# Użycie na maszynie z działającym wdrożeniem:
#   bash scripts/tunel.sh
#
# ── DLACZEGO TO ISTNIEJE ────────────────────────────────────────────────
# Wdrożenie na Oracle blokowało się na Security List: porty 80 i 443 trzeba
# otworzyć w konsoli OCI, a instancja nie ma dostępu do tej warstwy.
#
# Tunel omija problem u źródła: `cloudflared` otwiera połączenie WYCHODZĄCE
# z maszyny do Cloudflare i to nim wraca ruch. Żadnych portów przychodzących
# nie trzeba otwierać — ani w iptables, ani w konsoli Oracle.
#
# Efekt uboczny jest tym, na czym najbardziej zależy: dostajesz HTTPS.
# Bez HTTPS logowanie nie działa, bo `SESSION_COOKIE_SECURE` każe przeglądarce
# wysyłać ciasteczko sesji tylko po HTTPS.
#
# ── CO WYPISUJE ────────────────────────────────────────────────────────
# Publiczny adres HTTPS przydzielony przez Cloudflare. W trybie szybkim
# (bez konta) jest to `https://losowa-nazwa.trycloudflare.com` i zmienia się
# przy każdym restarcie tunelu. Stały adres wymaga konta Cloudflare.
#
# ── POPRAWKI PO PIERWSZYM WDROŻENIU ────────────────────────────────────
# Ten skrypt sprawdzał `/api/health`, którego nie ma ani w Caddy'm, ani
# w Django. Caddy zna `/api/*` (przekazuje do `api:8000` bez zmiany ścieżki),
# a API wystawia `/v1/health` — patrz `services/api/tikbengos/urls.py`.
# `/api/health` dochodziło więc do Django jako `/api/health`, nie pasowało
# do żadnej trasy i wracało 404. Skrypt uznawał to za „aplikacja nie działa"
# i zatrzymywał się PRZED podniesieniem tunelu — mimo że aplikacja działała.
# Sprawdzamy `/v1/health`, czyli ścieżkę, która naprawdę istnieje.
#
# Drugi błąd: `sed` scałający listy w `.env` nie escapował ukośników
# w adresie `https://…`. Wzorzec kończył się na pierwszym `/` i `sed`
# przerywał pracę komunikatem `unknown command: \`/'`. Skutek był gorszy
# niż brak efektu: skrypt dopisywał NOWĄ linię `ALLOWED_HOSTS=` na końcu
# pliku, zamiast rozszerzyć istniejącą. Po kilku tunelach `.env` miał
# trzy definicje tego samego klucza, a wygrywała ostatnia — przez przypadek.
# Teraz listy są scalane w miejscu, bez `sed` na adresie: skrypt liczy
# nową wartość i podmienia CAŁĄ linię po kluczu, poprzedzonym `^`.

set -uo pipefail

BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m'); OFF=$(printf '\033[0m')
GREEN=$(printf '\033[32m'); YELLOW=$(printf '\033[33m'); RED=$(printf '\033[31m')

step()  { printf '\n%s==> %s%s\n' "$GREEN$BOLD" "$1" "$OFF"; }
note()  { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
warn()  { printf '%s[!]%s %s\n' "$YELLOW" "$OFF" "$1"; }
bad()   { printf '%s[x]%s %s\n' "$RED" "$OFF" "$1"; }
good()  { printf '%s[ok]%s %s\n' "$GREEN" "$OFF" "$1"; }
die()   { bad "$1"; printf '\n%sSkrypt zatrzymany.%s\n' "$BOLD" "$OFF"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TUNNEL_FILE="infra/docker-compose.tunnel.yml"
PROD_FILE="infra/docker-compose.prod.yml"
ENV_FILE=".env"

# Ścieżka, którą sprawdzamy wszędzie. Jedna stała, żeby nie rozjechała się
# między testem lokalnym i testem z zewnątrz — to był dokładnie ten błąd.
HEALTH_PATH="/v1/health"

[ -f "$TUNNEL_FILE" ] || die "Brak $TUNNEL_FILE — zaktualizuj repozytorium: git pull"

SUDO=""
if ! docker info >/dev/null 2>&1; then SUDO="sudo"; fi
compose() { $SUDO docker compose --env-file "$ENV_FILE" -f "$TUNNEL_FILE" "$@"; }

# ── 1. Podstawowe wdrożenie musi działać ────────────────────────────────
step "Sprawdzam aplikację"
# Sprawdzamy `/v1/health`, bo to ścieżka wystawiona przez Django. Przy okazji
# rozróżniamy dwie sytuacje, które wcześniej wyglądały identycznie: brak
# aplikacji i złą ścieżkę. Jeżeli `/` odpowiada, a `/v1/health` nie, to jest
# problem routingu, a nie brakująca aplikacja — i tunel i tak ma co wystawić.
if curl -fsS --max-time 5 "http://127.0.0.1${HEALTH_PATH}" -o /dev/null 2>/dev/null; then
  good "Aplikacja odpowiada pod http://127.0.0.1${HEALTH_PATH}."
else
  warn "Aplikacja nie odpowiada pod http://127.0.0.1${HEALTH_PATH}."
  if curl -fsS --max-time 5 "http://127.0.0.1/" -o /dev/null 2>/dev/null; then
    note "Interfejs odpowiada, więc aplikacja żyje — nie odpowiada samo ${HEALTH_PATH}."
    # Nazwy tras są ujęte w apostrofy, żeby bash nie próbował rozwijać
    # `*` jako wzorca plików. Bez tego skrypt wypisywał
    # `line 83: /api/*: No such file or directory` — czyli komunikat
    # diagnostyczny zamieniał się w błąd składni powłoki.
    note 'Sprawdź trasy /api/* i /v1/* w infra/Caddyfile oraz ALLOWED_HOSTS w .env.'
    note "Podnoszę tunel dalej: to problem routingu, nie brak aplikacji."
  else
    note "Tunel przekazuje ruch do Caddy'ego, więc najpierw uruchom wdrożenie podstawowe:"
    note "    bash scripts/uruchom.sh"
    die "Zatrzymuję — tunel bez działającej aplikacji nie ma czego wystawić."
  fi
fi

# ── 2. Sieć musi istnieć ───────────────────────────────────────────────
step "Sprawdzam sieć Dockera"
if ! $SUDO docker network inspect tikbengos_default >/dev/null 2>&1; then
  warn "Brak sieci tikbengos_default."
  note "Tworzy ją wdrożenie podstawowe. Uruchom: bash scripts/uruchom.sh"
  die "Zatrzymuję."
fi
good "Sieć tikbengos_default istnieje."

# ── 3. Podniesienie tunelu ─────────────────────────────────────────────
step "Uruchamiam tunel"
note "Pierwsze pobranie obrazu trwa chwilę."
# `--force-recreate` jest celowe: tunel zmienia adres przy każdym starcie,
# a stary kontener trzymałby poprzedni. Rekreacja jest tu tańsza niż
# debugowanie, dlaczego adres się nie zmienił.
if ! compose up -d --force-recreate; then
  die "Nie udało się uruchomić tunelu. Pełny log: docker compose -f $TUNNEL_FILE logs"
fi

# ── 4. Odczekanie na przydział adresu ──────────────────────────────────
step "Czekam na publiczny adres"
ADRES=""
for proba in $(seq 1 30); do
  # Cloudflare wypisuje przydzielony adres w logu kontenera — to jedyne
  # miejsce, w którym jest widoczny w trybie bez konta.
  ADRES=$(compose logs cloudflared 2>/dev/null \
    | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
    | tail -n 1 || true)
  if [ -n "$ADRES" ]; then break; fi
  sleep 2
done

printf '\n'
if [ -z "$ADRES" ]; then
  warn "Nie udało się odczytać adresu z logu w 60 sekund."
  note "Sprawdź go sam — ostatnie linie logu tunelu:"
  compose logs --tail=20 cloudflared 2>/dev/null | sed 's/^/    /'
  note "Adres pojawia się w linii z `trycloudflare.com`."
  exit 1
fi

# ── 5. Wpisanie adresu do konfiguracji ─────────────────────────────────
step "Dopisuję adres do .env"
# Adres trafia do `ALLOWED_HOSTS` i `CSRF_TRUSTED_ORIGINS`, bo Django
# porównuje nagłówek `Host` z tą pierwszą listą, a CSRF sprawdza drugą.
# Bez tego żądania z nowego adresu wracają z 400 — a wygląda to jak awaria
# aplikacji, choć to jedna linia konfiguracji.
HOST=$(printf '%s' "$ADRES" | sed 's|^https://||')

# Scala listę rozdzielaną przecinkami i podmienia CAŁĄ linię klucza.
#
# Poprzednia wersja dopisywała nową linię na końcu pliku i próbowała
# scalić `sed`-em, w którego wzorcu nie było escapowanych ukośników adresu.
# Dlatego skrypt wypisywał `unknown command: /` i zostawiał w `.env` dwie
# definicje tego samego klucza. Docker Compose czyta ostatnią, więc działało
# przypadkiem — dopóki kolejność nie okazała się inna.
#
# Kolejność elementów w liście jest zachowana: istniejące wartości zostają,
# nowa idzie na koniec, duplikat nie powstaje.
ustaw_liste() {
  local klucz="$1" wartosc="$2" obecna nowa tmp

  # Wszystkie linie klucza, po przecinku, bez pustych elementów — bierzemy
  # ostatnią definicję, bo Docker Compose też bierze ostatnią.
  obecna=$(grep -E "^${klucz}=" "$ENV_FILE" 2>/dev/null | tail -n 1 | sed "s/^${klucz}=//")

  # Usuwamy WSZYSTKIE definicje klucza — od tego momentu w pliku jest jedna.
  tmp="$(mktemp)"
  grep -vE "^${klucz}=" "$ENV_FILE" > "$tmp" 2>/dev/null || true

  if [ -z "$obecna" ]; then
    nowa="$wartosc"
  elif printf '%s' "$obecna" | tr ',' '\n' | grep -qxF "$wartosc"; then
    printf '%s' "$obecna" | tr -d '\n' >> "$tmp"
    printf '\n' >> "$tmp"
    printf '%s=%s\n' "$klucz" "$obecna" >> "$tmp"
    mv "$tmp" "$ENV_FILE"
    note "${klucz} już zawiera ten adres."
    return 0
  else
    nowa="${obecna},${wartosc}"
  fi

  printf '%s=%s\n' "$klucz" "$nowa" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  warn "Ustawione ${klucz}."
}

ustaw_liste ALLOWED_HOSTS "$HOST"
ustaw_liste CSRF_TRUSTED_ORIGINS "$ADRES"

# ── 5a. Sprzątanie powtórzonych definicji ──────────────────────────────
# `.env` po poprzednich uruchomieniach ma po kilka definicji tych samych
# kluczy. Zostawiamy w pliku ostatnią, tak samo jak robi to Docker Compose,
# żeby plik i to, co widzi aplikacja, mówiły to samo.
for klucz in ALLOWED_HOSTS CSRF_TRUSTED_ORIGINS; do
  ile=$(grep -cE "^${klucz}=" "$ENV_FILE" 2>/dev/null || true)
  if [ "${ile:-0}" -gt 1 ]; then
    ostatnia=$(grep -E "^${klucz}=" "$ENV_FILE" | tail -n 1)
    tmp="$(mktemp)"
    grep -vE "^${klucz}=" "$ENV_FILE" > "$tmp" 2>/dev/null || true
    printf '%s\n' "$ostatnia" >> "$tmp"
    mv "$tmp" "$ENV_FILE"
    warn "Scalone ${ile} definicje ${klucz} w jedną."
  fi
done

# Restart API, żeby wzięło nowe `ALLOWED_HOSTS` — Django czyta je przy starcie.
step "Restart API z nową konfiguracją"
$SUDO docker compose --env-file "$ENV_FILE" -f "$PROD_FILE" up -d api >/dev/null 2>&1 \
  && good "API zrestartowane." \
  || warn "Nie udało się zrestartować API — zrób to sam: docker compose -f ${PROD_FILE} up -d api"

# ── 6. Sprawdzenie z zewnątrz ──────────────────────────────────────────
step "Sprawdzam adres z zewnątrz"
OK=0
for proba in $(seq 1 15); do
  if curl -fsS --max-time 10 "${ADRES}${HEALTH_PATH}" -o /dev/null 2>/dev/null; then OK=1; break; fi
  sleep 3
done

printf '\n'
if [ "$OK" = "1" ]; then
  printf '%s%sAplikacja działa pod:%s %s%s%s\n' "$BOLD" "$GREEN" "$OFF" "$BOLD" "$ADRES" "$OFF"
  printf '\nOtwórz ten adres w przeglądarce. To HTTPS, więc %slogowanie działa%s —\n' "$BOLD" "$OFF"
  printf 'ciasteczko sesji dojedzie, w odróżnieniu od wdrożenia po HTTP.\n'
else
  warn "Adres nie odpowiada jeszcze na ${HEALTH_PATH}."
  note "Cloudflare potrzebuje chwili na propagację — odczekaj kilkanaście sekund i odśwież:"
  note "    $ADRES"
  note "Jeżeli w przeglądarce widać stronę, a tu nie ma ${HEALTH_PATH}, to znaczy tylko tyle, że"
  note 'trasa /v1/* nie jest wystawiona w infra/Caddyfile. Interfejs działa.'
  note "Log tunelu: docker compose -f $TUNNEL_FILE logs --tail=30 cloudflared"
fi

printf '\n%sUwaga o adresie:%s w trybie bez konta jest on TYMCZASOWY.\n' "$YELLOW" "$OFF"
printf 'Zmienia się przy każdym restarcie tunelu — wtedy uruchom ten skrypt\n'
printf 'ponownie i popraw adres w .env (skrypt robi to sam).\n'
printf '\n%sZatrzymanie tunelu:%s docker compose -f %s down\n' "$BOLD" "$OFF" "$TUNNEL_FILE"
printf '\n'
