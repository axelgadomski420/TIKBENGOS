#!/usr/bin/env bash
#
# Wdrożenie TIKBENGOS na Oracle Cloud — jedna komenda.
#
# Użycie na maszynie (Ubuntu, świeżej albo z już postawioną aplikacją):
#   bash scripts/deploy.sh
#
# Skrypt pyta o domenę (albo publiczne IP) i e-mail do certyfikatu, a resztę
# robi sam: Docker, kod, sekrety, ikony, zaporę, migracje, certyfikat.
#
# Drugie uruchomienie jest bezpieczne: nie nadpisze `.env`, nie ruszy
# wolumenów i nie skasuje danych.
#
# Tryb bez pytań (używany przez workflow z GitHuba):
#   TIKBENGOS_NONINTERACTIVE=1 TIKBENGOS_DOMAIN=domena.pl \
#     TIKBENGOS_ACME_EMAIL=ty@domena.pl bash scripts/deploy.sh

set -Eeuo pipefail

if [ -t 1 ]; then
  BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m'); OFF=$(printf '\033[0m')
  GREEN=$(printf '\033[32m'); YELLOW=$(printf '\033[33m'); RED=$(printf '\033[31m')
else
  BOLD=; DIM=; OFF=; GREEN=; YELLOW=; RED=
fi

step()  { printf '\n%s==>%s %s%s%s\n' "$GREEN" "$OFF" "$BOLD" "$1" "$OFF"; }
note()  { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
warn()  { printf '%s[!]%s %s\n' "$YELLOW" "$OFF" "$1"; }
fail()  { printf '%s[x]%s %s\n' "$RED" "$OFF" "$1" >&2; exit 1; }

# ── Sprawdzenie maszyny ────────────────────────────────────────────
step "Sprawdzam maszynę"
command -v apt-get >/dev/null 2>&1 || fail "Wymagane Ubuntu. Na Oracle Linux użyj obrazu Ubuntu LTS."
note "Architektura: $(uname -m) (oczekiwana aarch64 dla Ampere)"
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

pytaj() {
  local prompt="$1" default="$2" answer
  printf '%s%s%s ' "$BOLD" "$prompt" "$OFF" >&2
  if [ -n "$default" ]; then printf '%s[%s]%s ' "$DIM" "$default" "$OFF" >&2; fi
  read -r answer </dev/tty || answer=""
  printf '%s' "${answer:-$default}"
}

# ── Docker ─────────────────────────────────────────────────────────
step "Docker"
if command -v docker >/dev/null 2>&1; then
  note "Już zainstalowany: $(docker --version)"
else
  note "Instaluję — to może potrwać minutę."
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq ca-certificates curl git python3-venv
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  $SUDO sh /tmp/get-docker.sh >/dev/null
  rm -f /tmp/get-docker.sh
  note "Zainstalowany."
fi
DOCKER="$SUDO docker"
$DOCKER compose version >/dev/null 2>&1 || fail "Brak wtyczki docker compose v2."

# ── Kod ────────────────────────────────────────────────────────────
step "Kod źródłowy"
REPO_URL="https://github.com/axelgadomski420/TIKBENGOS.git"
TARGET_DIR="${TIKBENGOS_DIR:-$HOME/TIKBENGOS}"

if [ -f "$PWD/scripts/deploy.sh" ] && [ -d "$PWD/infra" ]; then
  TARGET_DIR="$PWD"
  note "Uruchomione z repozytorium: $TARGET_DIR"
elif [ -d "$TARGET_DIR/.git" ]; then
  note "Repozytorium już jest: $TARGET_DIR"
  git -C "$TARGET_DIR" pull --ff-only >/dev/null 2>&1 || warn "Nie udało się odświeżyć kodu — używam tego, co jest."
else
  command -v git >/dev/null 2>&1 || $SUDO apt-get install -y -qq git
  note "Klonuję do $TARGET_DIR…"
  git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
fi
cd "$TARGET_DIR"
[ -f infra/docker-compose.prod.yml ] || fail "Brak infra/docker-compose.prod.yml — to nie repozytorium TIKBENGOS."

# Audyt przed dotknięciem czegokolwiek. Twarde braki zatrzymują wdrożenie,
# miękkie tylko ostrzegają — inaczej brak ikon blokowałby cały deploy.
if command -v python3 >/dev/null 2>&1 && [ -f scripts/audyt.py ]; then
  step "Audyt kompletu plików"
  python3 scripts/audyt.py || fail "Audyt wykrył braki blokujące uruchomienie (patrz wyżej)."
fi

# ── Sekrety ────────────────────────────────────────────────────────
step "Sekrety i konfiguracja"
ENV_FILE=".env"
NONINTERACTIVE="${TIKBENGOS_NONINTERACTIVE:-0}"

losowy() { python3 -c "import secrets; print(secrets.token_urlsafe(${1:-40}))"; }
klucz_fernet() { python3 -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"; }

if [ -f "$ENV_FILE" ]; then
  note ".env już istnieje — zostawiam bez zmian."
  # shellcheck disable=SC1091
  . ./.env
  DOMAIN="${DOMAIN:-${TIKBENGOS_DOMAIN:-}}"
  ACME_EMAIL="${ACME_EMAIL:-${TIKBENGOS_ACME_EMAIL:-}}"
else
  if [ "$NONINTERACTIVE" = "1" ]; then
    DOMAIN="${TIKBENGOS_DOMAIN:-}"
    ACME_EMAIL="${TIKBENGOS_ACME_EMAIL:-}"
    [ -n "$DOMAIN" ] || fail "TIKBENGOS_NONINTERACTIVE=1: brak TIKBENGOS_DOMAIN."
  else
    printf '\n' >&2
    printf '%sPodaj dane wdrożenia.%s Enter zostawia wartość w nawiasie.\n' "$BOLD" "$OFF" >&2
    WYKRYTE_IP=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "")
    DOMAIN=$(pytaj "Domena (albo publiczne IP):" "$WYKRYTE_IP")
    [ -n "$DOMAIN" ] || fail "Nie podano domeny ani adresu."
  fi

  if printf '%s' "$DOMAIN" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    SCHEME="http"; ACME_EMAIL=""
    warn "Adres IP: certyfikatu nie będzie, więc HTTPS nie wstanie."
    warn "Logowanie wymaga HTTPS — bez domeny działanie kont nie jest możliwe."
  else
    SCHEME="https"
    if [ -z "$ACME_EMAIL" ]; then
      [ "$NONINTERACTIVE" = "1" ] && fail "TIKBENGOS_NONINTERACTIVE=1: brak TIKBENGOS_ACME_EMAIL dla domeny $DOMAIN."
      ACME_EMAIL=$(pytaj "E-mail do certyfikatu Let's Encrypt:" "")
      [ -n "$ACME_EMAIL" ] || fail "Bez adresu e-mail certyfikat nie zostanie wydany."
    fi
  fi

  # Klucze generowane raz i zapisywane. `umask` przed utworzeniem pliku, żeby
  # nie było okna, w którym plik istnieje z domyślnymi uprawnieniami.
  OLD_UMASK=$(umask)
  umask 077
  cat > "$ENV_FILE" <<EOF
# Wygenerowane przez scripts/deploy.sh — nie commituj tego pliku.
# FIELD_ENCRYPTION_KEY zmieniaj tylko świadomie: po zmianie wszystkie
# zapisane klucze dostawców staną się nieczytelne.
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
SECRET_KEY=$(losowy 50)
FIELD_ENCRYPTION_KEY=$(klucz_fernet)
ALLOWED_HOSTS=$DOMAIN
CSRF_TRUSTED_ORIGINS=$SCHEME://$DOMAIN
POSTGRES_DB=tikbengos
POSTGRES_USER=tikbengos
POSTGRES_PASSWORD=$(losowy 24)
REDIS_PASSWORD=$(losowy 24)
NEXT_PUBLIC_REALTIME_URL=$(if [ "$SCHEME" = "https" ]; then echo "wss://$DOMAIN/ws"; else echo "ws://$DOMAIN/ws"; fi)
EOF
  umask "$OLD_UMASK"
  chmod 600 "$ENV_FILE"
  note ".env utworzony (uprawnienia 600 — czyta tylko właściciel)."
fi

# ── Zapora ─────────────────────────────────────────────────────────
step "Zapora na maszynie"
# Obrazy Oracle mają `iptables`, który blokuje ruch przychodzący nawet gdy
# w panelu otworzysz porty. To jest przyczyna większości „otworzyłem i nie działa”.
if command -v iptables >/dev/null 2>&1; then
  for port in 80 443; do
    if ! $SUDO iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      if $SUDO iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
        note "Otwarty port $port."
      else
        warn "Nie udało się dodać reguły dla portu $port — sprawdź: sudo iptables -L INPUT -n"
      fi
    else
      note "Port $port już otwarty."
    fi
  done
  if command -v netfilter-persistent >/dev/null 2>&1; then
    $SUDO netfilter-persistent save >/dev/null 2>&1 || true
  else
    note "Brak netfilter-persistent — reguły przetrwają do restartu maszyny."
  fi
fi
warn "Pamiętaj też otworzyć porty 80 i 443 w panelu Oracle (Subnet → Security List)."

# ── Ikony PWA ──────────────────────────────────────────────────────
step "Ikony PWA"
if [ -f apps/web/public/icons/icon-192.png ]; then
  note "Ikony już są."
elif [ -f scripts/generate-icons.py ]; then
  # Generator sam przygotowuje Pillow w /tmp, jeżeli go nie ma — więc nie
  # wymaga niczego oprócz Pythona.
  if python3 scripts/generate-icons.py; then
    note "Wygenerowane."
  else
    warn "Ikony nie powstały — aplikacja wstanie, ale PWA nie zainstaluje się w pełni."
  fi
fi

# ── Start ──────────────────────────────────────────────────────────
step "Budowanie i uruchomienie"
note "Pierwsze uruchomienie trwa kilka minut — buduje się pięć obrazów."
$DOCKER compose -f infra/docker-compose.prod.yml up -d --build

# ── Migracje ───────────────────────────────────────────────────────
step "Baza danych"
MIGRACJE_OK=0
for i in $(seq 1 40); do
  if $DOCKER compose -f infra/docker-compose.prod.yml exec -T api \
       python manage.py migrate --noinput >/dev/null 2>&1; then
    note "Migracje wykonane."
    MIGRACJE_OK=1
    break
  fi
  sleep 4
done
if [ "$MIGRACJE_OK" -eq 0 ]; then
  warn "Migracje nie przeszły po 160 sekundach."
  warn "Sprawdź: $DOCKER compose -f infra/docker-compose.prod.yml logs api --tail=60"
  warn "Pełna diagnoza: bash scripts/napraw.sh"
fi

# ── Test dymny ─────────────────────────────────────────────────────
step "Test dymny (w kontenerze)"
# Ta komenda sprawdza klucz szyfrowania, bazę, komplet migracji i odpowiedź
# Django — bez sieci. Gorszy od niej jest tylko brak takiego sprawdzenia.
$DOCKER compose -f infra/docker-compose.prod.yml exec -T api \
  python manage.py sprawdz || warn "Test dymny zgłosił błędy — patrz komunikat wyżej."

# ── Sprawdzenie z zewnątrz ─────────────────────────────────────────
step "Sprawdzenie z zewnątrz"
note "Adres: $SCHEME://$DOMAIN"
OK=0
for i in $(seq 1 12); do
  if curl -fsS --max-time 10 "$SCHEME://$DOMAIN/api/health" -o /dev/null 2>/dev/null; then
    OK=1
    break
  fi
  sleep 5
done

printf '\n'
if [ "$OK" -eq 1 ]; then
  printf '%s%s✓ API odpowiada.%s\n' "$BOLD" "$GREEN" "$OFF"
  printf 'Otwórz w przeglądarce: %s%s://%s%s\n' "$BOLD" "$SCHEME" "$DOMAIN" "$OFF"
else
  warn "Adres jeszcze nie odpowiada."
  if [ "$SCHEME" = "https" ]; then
    note "Przy domenie certyfikat powstaje do minuty — odczekaj i odśwież."
  fi
  note "Logi: $DOCKER compose -f infra/docker-compose.prod.yml logs proxy --tail=40"
  note "Diagnoza: bash scripts/napraw.sh"
fi

printf '\n%sKod:%s %s\n' "$BOLD" "$OFF" "$TARGET_DIR"
printf '%sSekrety:%s %s/.env (600)\n' "$BOLD" "$OFF" "$TARGET_DIR"
printf '\n%sCo dalej:%s\n' "$BOLD" "$OFF"
printf '  Pełne sprawdzenie:  python3 scripts/sprawdz.py %s://%s\n' "$SCHEME" "$DOMAIN"
printf '  Stan i diagnoza:    bash scripts/napraw.sh\n'
printf '  Kopia bazy:         bash scripts/napraw.sh kopia\n'
printf '  Logi:               %s compose -f infra/docker-compose.prod.yml logs -f\n' "$DOCKER"
printf '\n%sUwaga:%s nie zmieniaj FIELD_ENCRYPTION_KEY w .env. Po zmianie\n' "$YELLOW" "$OFF"
printf 'wszystkie zapisane klucze dostawców staną się nieczytelne.\n'
printf '\n%sCzego ten skrypt nie zrobi:%s kopii zapasowej według harmonogramu,\n' "$YELLOW" "$OFF"
printf 'monitoringu ani aktualizacji systemu. To osobne zadania.\n\n'
