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
ENV_FILE=".env"

[ -f "$TUNNEL_FILE" ] || die "Brak $TUNNEL_FILE — zaktualizuj repozytorium: git pull"

SUDO=""
if ! docker info >/dev/null 2>&1; then SUDO="sudo"; fi
compose() { $SUDO docker compose --env-file "$ENV_FILE" -f "$TUNNEL_FILE" "$@"; }

# ── 1. Podstawowe wdrożenie musi działać ────────────────────────────────
step "Sprawdzam aplikację"
if ! curl -fsS --max-time 5 "http://127.0.0.1/api/health" -o /dev/null 2>/dev/null; then
  warn "Aplikacja nie odpowiada lokalnie."
  note "Tunel przekazuje ruch do Caddy'ego, więc najpierw uruchom wdrożenie podstawowe:"
  note "    bash scripts/uruchom.sh"
  die "Zatrzymuję — tunel bez działającej aplikacji nie ma czego wystawić."
fi
good "Aplikacja odpowiada pod http://127.0.0.1."

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
# Bez tego każde żądanie wraca z 400 — a wygląda to jak awaria aplikacji,
# choć to jedna linia konfiguracji.
HOST=$(printf '%s' "$ADRES" | sed 's|https://||')

ustaw_hosta() {
  local klucz="$1" wartosc="$2" obecna
  obecna=$(sed -n "s/^${klucz}=//p" "$ENV_FILE" 2>/dev/null | tail -n 1)
  case "$obecna" in
    *"$wartosc"*) note "${klucz} już zawiera ten adres." ;;
    "") sed -i "s|^${klucz}=.*|${klucz}=${wartosc}|" "$ENV_FILE"; warn "Uzupełnione ${klucz}." ;;
    *) printf '%s=%s,%s\n' "$klucz" "$obecna" "$wartosc" >> "$ENV_FILE"
       # Nadpisujemy ostatnią linię, bo dopisanie drugiej definicji
       # tego samego klucza w `.env` zostawiłoby obie i wygrałaby pierwsza.
       sed -i "0,/^${klucz}=/{/^${klucz}=.*${obecna}.*,/{s|^${klucz}=.*|${klucz}=${obecna},${wartosc}|}}" "$ENV_FILE"
       warn "Dopisany adres do ${klucz}." ;;
  esac
}

ustaw_hosta ALLOWED_HOSTS "$HOST"
ustaw_hosta CSRF_TRUSTED_ORIGINS "$ADRES"

# Restart API, żeby wzięło nowe `ALLOWED_HOSTS` — Django czyta je przy starcie.
step "Restart API z nową konfiguracją"
$SUDO docker compose --env-file "$ENV_FILE" -f infra/docker-compose.prod.yml up -d api >/dev/null 2>&1 \
  && good "API zrestartowane." \
  || warn "Nie udało się zrestartować API — zrób to sam: docker compose -f infra/docker-compose.prod.yml up -d api"

# ── 6. Sprawdzenie z zewnątrz ──────────────────────────────────────────
step "Sprawdzam adres z zewnątrz"
OK=0
for proba in $(seq 1 15); do
  if curl -fsS --max-time 10 "${ADRES}/api/health" -o /dev/null 2>/dev/null; then OK=1; break; fi
  sleep 3
done

printf '\n'
if [ "$OK" = "1" ]; then
  printf '%s%sAplikacja działa pod:%s %s%s%s\n' "$BOLD" "$GREEN" "$OFF" "$BOLD" "$ADRES" "$OFF"
  printf '\nOtwórz ten adres w przeglądarce. To HTTPS, więc %slogowanie działa%s —\n' "$BOLD" "$OFF"
  printf 'ciasteczko sesji dojedzie, w odróżnieniu od wdrożenia po HTTP.\n'
else
  warn "Adres nie odpowiada jeszcze. Cloudflare potrzebuje chwili na propagację."
  note "Odczekaj kilkanaście sekund i odśwież: $ADRES"
  note "Log tunelu: docker compose -f $TUNNEL_FILE logs --tail=30 cloudflared"
fi

printf '\n%sUwaga o adresie:%s w trybie bez konta jest on TYMCZASOWY.\n' "$YELLOW" "$OFF"
printf 'Zmienia się przy każdym restarcie tunelu — wtedy uruchom ten skrypt\n'
printf 'ponownie i popraw adres w .env (skrypt robi to sam).\n'
printf '\n%sZatrzymanie tunelu:%s docker compose -f %s down\n' "$BOLD" "$OFF" "$TUNNEL_FILE"
printf '\n'
