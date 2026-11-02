#!/usr/bin/env bash
#
# TIKBENGOS — jeden plik, ktory robi wszystko.
#
# UZYCIE (w Cloud Shell Oracle):
#   1. Wgraj ten plik przez menu Cloud Shell -> Upload.
#   2. Wpisz palcami:  bash deploy-tikbengos.sh
#   3. Odpowiedz na jedno pytanie (albo nacisnij Enter).
#
# Reszta dzieje sie sama: Docker, kod, sekrety, ikony, zapora, baza,
# migracje, certyfikat, uruchomienie i sprawdzenie.
#
# Uruchomienie drugi raz jest bezpieczne — nie nadpisuje .env, nie rusza
# danych, nie kasuje niczego.

set -Eeuo pipefail

BOLD='\033[1m'; DIM='\033[2m'; OFF='\033[0m'
GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'

step() { printf '\n%s==>%s %s%s%s\n' "$GREEN" "$OFF" "$BOLD" "$1" "$OFF"; }
note() { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
warn() { printf '%s[!]%s %s\n' "$YELLOW" "$OFF" "$1"; }
fail() { printf '%s[x]%s %s\n' "$RED" "$OFF" "$1" >&2; exit 1; }

# ── 0. Sprawdzenie ─────────────────────────────────────────────────
step "Sprawdzam maszyne"
[ "$(uname -s)" = "Linux" ] || fail "Ten skrypt dziala na Linuksie (maszyna Oracle)."
command -v apt-get >/dev/null 2>&1 || fail "Wymagane Ubuntu. Obraz Oracle Linux nie ma apt-get."
note "Architektura: $(uname -m)"

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

# ── 1. Pytanie ─────────────────────────────────────────────────────
step "Adres aplikacji"
WYKRYTE_IP=$(curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null || echo "")

printf '\n%sPodaj domene albo nacisnij Enter, zeby uzyc publicznego IP.%s\n' "$BOLD" "$OFF" >&2
if [ -n "$WYKRYTE_IP" ]; then
  printf '%sWykryty adres: %s%s\n' "$DIM" "$WYKRYTE_IP" "$OFF" >&2
fi
printf 'Adres: ' >&2
read -r ODPOWIEDZ </dev/tty || ODPOWIEDZ=""
DOMAIN="${ODPOWIEDZ:-$WYKRYTE_IP}"
[ -n "$DOMAIN" ] || fail "Nie podano adresu. Uruchom skrypt ponownie."

if printf '%s' "$DOMAIN" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  SCHEME="http"; ACME_EMAIL=""
  printf '\n' >&2
  warn "Adres IP — bez certyfikatu, wiec bez HTTPS."
  warn "Aplikacja wstanie i bedzie widoczna, ale logowanie wymaga HTTPS."
else
  SCHEME="https"
  printf '\n' >&2
  printf '%sE-mail do certyfikatu Lets Encrypt:%s\n' "$BOLD" "$OFF" >&2
  printf 'E-mail: ' >&2
  read -r ACME_EMAIL </dev/tty || ACME_EMAIL=""
  [ -n "$ACME_EMAIL" ] || fail "Bez adresu e-mail certyfikat nie zostanie wydany."
fi

printf '\n%sPodsumowanie:%s %s://%s\n' "$BOLD" "$OFF" "$SCHEME" "$DOMAIN" >&2
printf 'Kontynuowac? [t/N] ' >&2
read -r POTWIERDZENIE </dev/tty || POTWIERDZENIE=""
case "$POTWIERDZENIE" in [tT][aA][kK]|[tT]|[yY]) ;; *) fail "Przerwane na Twoje zyczenie." ;; esac

# ── 2. Docker ──────────────────────────────────────────────────────
step "Docker"
if command -v docker >/dev/null 2>&1; then
  note "Juz zainstalowany: $(docker --version)"
else
  note "Instaluje — to moze potrwac minute."
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq ca-certificates curl git python3-venv
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  $SUDO sh /tmp/get-docker.sh >/dev/null 2>&1
  rm -f /tmp/get-docker.sh
  note "Zainstalowany."
fi
DOCKER="$SUDO docker"
$DOCKER compose version >/dev/null 2>&1 || fail "Brak wtyczki docker compose. Zainstaluj: sudo apt-get install docker-compose-plugin"
command -v git >/dev/null 2>&1 || $SUDO apt-get install -y -qq git

# ── 3. Kod ─────────────────────────────────────────────────────────
step "Pobieram kod"
TARGET_DIR="$HOME/TIKBENGOS"
if [ -d "$TARGET_DIR/.git" ]; then
  note "Kod juz jest — odswiezam."
  git -C "$TARGET_DIR" pull --ff-only >/dev/null 2>&1 || warn "Nie udalo sie odswiezyc, uzywam istniejacego."
else
  git clone --depth 1 https://github.com/axelgadomski420/TIKBENGOS.git "$TARGET_DIR" >/dev/null 2>&1 || \
    fail "Nie moge pobrac kodu. Sprawdz, czy repozytorium jest publiczne."
  note "Pobrane do $TARGET_DIR"
fi
cd "$TARGET_DIR"
[ -f infra/docker-compose.prod.yml ] || fail "Kod niekompletny — brak pliku compose produkcyjnego."

# ── 4. Sekrety ─────────────────────────────────────────────────────
step "Generuje sekrety"
losowy() { python3 -c "import secrets; print(secrets.token_urlsafe(${1:-40}))"; }
klucz_fernet() { python3 -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"; }

if [ -f .env ]; then
  note "Plik .env juz istnieje — zostawiam bez zmian."
  # shellcheck disable=SC1091
  . ./.env || true
else
  {
    echo "# Wygenerowane automatycznie przy wdrozeniu. Nie commituj."
    echo "DOMAIN=$DOMAIN"
    echo "ACME_EMAIL=$ACME_EMAIL"
    echo "SECRET_KEY=$(losowy 50)"
    echo "FIELD_ENCRYPTION_KEY=$(klucz_fernet)"
    echo "ALLOWED_HOSTS=$DOMAIN"
    echo "CSRF_TRUSTED_ORIGINS=$SCHEME://$DOMAIN"
    echo "POSTGRES_DB=tikbengos"
    echo "POSTGRES_USER=tikbengos"
    echo "POSTGRES_PASSWORD=$(losowy 24)"
    echo "REDIS_PASSWORD=$(losowy 24)"
    if [ "$SCHEME" = "https" ]; then
      echo "NEXT_PUBLIC_REALTIME_URL=wss://$DOMAIN/ws"
    else
      echo "NEXT_PUBLIC_REALTIME_URL=ws://$DOMAIN/ws"
    fi
  } > .env
  chmod 600 .env
  note "Gotowe. Plik .env ma uprawnienia 600 — czyta tylko wlasciciel."
fi

# ── 5. Zapora ──────────────────────────────────────────────────────
step "Otwieram porty 80 i 443"
if command -v iptables >/dev/null 2>&1; then
  for port in 80 443; do
    if ! $SUDO iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      if $SUDO iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
        note "Port $port otwarty."
      else
        warn "Nie udalo sie dodac reguly dla portu $port."
      fi
    else
      note "Port $port juz byl otwarty."
    fi
  done
  $SUDO netfilter-persistent save >/dev/null 2>&1 || note "Reguly przetrwaja do restartu maszyny."
fi
warn "Pamietaj tez otworzyc te porty w panelu Oracle (Subnet -> Security List)."

# ── 6. Ikony ───────────────────────────────────────────────────────
step "Ikony PWA"
if [ -f apps/web/public/icons/icon-192.png ]; then
  note "Juz sa."
elif [ -f scripts/generate-icons.py ]; then
  if python3 -m venv /tmp/ikony-venv >/dev/null 2>&1 && \
     /tmp/ikony-venv/bin/pip install -q pillow >/dev/null 2>&1; then
    if /tmp/ikony-venv/bin/python scripts/generate-icons.py >/dev/null 2>&1; then
      note "Wygenerowane."
    else
      warn "Generator zawiodl — aplikacja wstanie bez ikon."
    fi
  else
    warn "Nie udalo sie przygotowac Pillow — aplikacja wstanie bez ikon."
  fi
fi

# ── 7. Start ───────────────────────────────────────────────────────
step "Buduje i uruchamiam"
note "Pierwsze uruchomienie trwa kilka minut — buduje sie piec obrazow."
note "Mozesz spokojnie zamknac telefon; proces toczy sie na serwerze."
$DOCKER compose -f infra/docker-compose.prod.yml up -d --build

# ── 8. Migracje ────────────────────────────────────────────────────
step "Baza danych"
MIGRACJE_OK=0
for i in $(seq 1 40); do
  if $DOCKER compose -f infra/docker-compose.prod.yml exec -T api python manage.py migrate --noinput >/dev/null 2>&1; then
    note "Migracje wykonane."
    MIGRACJE_OK=1
    break
  fi
  sleep 4
done
if [ "$MIGRACJE_OK" -eq 0 ]; then
  warn "Migracje nie przeszly po 160 sekundach."
  warn "Sprawdz: $DOCKER compose -f infra/docker-compose.prod.yml logs api --tail=60"
fi

# ── 9. Sprawdzenie ─────────────────────────────────────────────────
step "Sprawdzam, czy dziala"
$DOCKER compose -f infra/docker-compose.prod.yml ps

OK=0
for i in $(seq 1 12); do
  if curl -fsS --max-time 10 "$SCHEME://$DOMAIN" -o /dev/null 2>/dev/null; then
    OK=1
    break
  fi
  sleep 5
done

printf '\n'
if [ "$OK" -eq 1 ]; then
  printf '%s%s OK — aplikacja dziala.%s\n' "$BOLD" "$GREEN" "$OFF"
  printf '\nOtworz w Safari: %s%s://%s%s\n' "$BOLD" "$SCHEME" "$DOMAIN" "$OFF"
else
  warn "Adres jeszcze nie odpowiada."
  note "Przy domenie certyfikat powstaje do minuty — odczekaj i odswiez."
  note "Logi: $DOCKER compose -f infra/docker-compose.prod.yml logs proxy --tail=40"
fi

printf '\n%sKod:%s %s\n' "$BOLD" "$OFF" "$TARGET_DIR"
printf '%sSekrety:%s %s/.env\n' "$BOLD" "$OFF" "$TARGET_DIR"
printf '\n%sZapisz to sobie — przyda sie pozniej:%s\n' "$BOLD" "$OFF"
printf '  Kopia bazy:   %s compose -f infra/docker-compose.prod.yml exec -T db pg_dump -U tikbengos tikbengos > kopia.sql\n' "$DOCKER"
printf '  Restart:      %s compose -f infra/docker-compose.prod.yml restart\n' "$DOCKER"
printf '  Logi:         %s compose -f infra/docker-compose.prod.yml logs -f\n' "$DOCKER"
printf '\n%sUwaga:%s nie zmieniaj FIELD_ENCRYPTION_KEY w .env. Po zmianie\n' "$YELLOW" "$OFF"
printf 'wszystkie zapisane klucze dostawcow stana sie nieczytelne.\n\n'
