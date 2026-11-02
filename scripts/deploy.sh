#!/usr/bin/env bash
#
# TIKBENGOS — wdrożenie na Oracle Cloud jedną komendą.
#
# Uruchomienie na świeżej maszynie Ubuntu:
#   curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/scripts/deploy.sh | bash
#
# Albo, gdy kod jest już sklonowany:
#   bash scripts/deploy.sh
#
# Skrypt jest interaktywny i pyta o to, czego nie da się wymyślić:
# domenę (albo publiczny IP), adres e-mail do certyfikatu i hasła.
# Wszystko inne — Docker, klucze, hasła, migracje, certyfikat — robi sam.
#
# Uruchomienie drugi raz jest bezpieczne: nie nadpisuje `.env`, nie usuwa
# wolumenów i nie rusza tego, co już działa.

set -Eeuo pipefail

# ── Wygląd ─────────────────────────────────────────────────────────
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

# ── Wymagania ──────────────────────────────────────────────────────
step "Sprawdzam, czy to właściwa maszyna"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
  note "Architektura: ARM (Ampere) — zgodna z obrazami"
else
  note "Architektura: $ARCH"
fi

if ! command -v apt-get >/dev/null 2>&1; then
  fail "Ten skrypt obsługuje Ubuntu (apt-get). Na Oracle Linux użyj obrazu Ubuntu LTS."
fi

# Pytania idą na stderr, żeby przy `curl | bash` użytkownik widział je na
# ekranie, a skrypt mógł jednocześnie przechwycić odpowiedź.
pytaj() {
  local prompt="$1" default="$2" answer
  printf '%s%s%s ' "$BOLD" "$prompt" "$OFF" >&2
  if [ -n "$default" ]; then printf '%s[%s]%s ' "$DIM" "$default" "$OFF" >&2; fi
  read -r answer </dev/tty || answer=""
  printf '%s' "${answer:-$default}"
}

pytaj_tak() {
  local prompt="$1" answer
  printf '%s%s [t/N]%s ' "$BOLD" "$prompt" "$OFF" >&2
  read -r answer </dev/tty || answer=""
  case "$answer" in [tT][aA][kK]|[tT]) return 0 ;; *) return 1 ;; esac
}

# ── Krok 1: Docker ─────────────────────────────────────────────────
step "Docker"
if command -v docker >/dev/null 2>&1; then
  note "Docker już jest: $(docker --version)"
else
  note "Instaluję Docker…"
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq ca-certificates curl
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  $SUDO sh /tmp/get-docker.sh >/dev/null
  rm -f /tmp/get-docker.sh
  note "Docker zainstalowany."
fi

# Grupa docker bez przelogowania: skrypt działa dalej jako root albo przez sudo.
DOCKER="$SUDO docker"
if ! $DOCKER compose version >/dev/null 2>&1; then
  fail "Brak `docker compose` (wtyczki v2). Zainstaluj: sudo apt-get install docker-compose-plugin"
fi

# ── Krok 2: Kod ────────────────────────────────────────────────────
step "Kod źródłowy"
REPO_URL="https://github.com/axelgadomski420/TIKBENGOS.git"
TARGET_DIR="${TIKBENGOS_DIR:-$HOME/TIKBENGOS}"

if [ -f "$PWD/scripts/deploy.sh" ] && [ -d "$PWD/infra" ]; then
  TARGET_DIR="$PWD"
  note "Uruchomione z repozytorium: $TARGET_DIR"
elif [ -d "$TARGET_DIR/.git" ]; then
  note "Repozytorium już jest: $TARGET_DIR"
  git -C "$TARGET_DIR" pull --ff-only || warn "Nie udało się odświeżyć kodu — używam tego, co jest."
else
  if ! command -v git >/dev/null 2>&1; then
    $SUDO apt-get install -y -qq git
  fi
  note "Klonuję do $TARGET_DIR…"
  git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR"
[ -f infra/docker-compose.prod.yml ] || fail "Brak infra/docker-compose.prod.yml — to nie jest repozytorium TIKBENGOS."

# ── Krok 3: Sekrety ────────────────────────────────────────────────
step "Sekrety i konfiguracja"
ENV_FILE=".env"

# Generowanie bez zależności: Python jest na każdej maszynie Ubuntu.
losowy()  { python3 -c "import secrets; print(secrets.token_urlsafe(${1:-40}))"; }
klucz_fernet() {
  python3 - <<'PY'
import base64, os
print(base64.urlsafe_b64encode(os.urandom(32)).decode())
PY
}

if [ -f "$ENV_FILE" ]; then
  note ".env już istnieje — zostawiam bez zmian."
  # shellcheck disable=SC1091
  . ./.env
  DOMAIN="${DOMAIN:-}"
else
  printf '\n' >&2
  printf '%sPodaj dane wdrożenia.%s Enter zostawia wartość w nawiasie.\n' "$BOLD" "$OFF" >&2

  # Publiczne IP wykrywamy same — to jedna rzecz mniej do przepisania.
  WYKRYTE_IP=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "")

  DOMAIN=$(pytaj "Domena (albo publiczne IP):" "$WYKRYTE_IP")
  [ -n "$DOMAIN" ] || fail "Nie podano domeny ani adresu."

  if printf '%s' "$DOMAIN" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    SCHEME="http"
    ACME_EMAIL=""
    warn "Adres IP: certyfikatu nie będzie, więc HTTPS nie wstanie."
    warn "Logowanie wymaga HTTPS — bez domeny działanie kont nie jest możliwe."
  else
    SCHEME="https"
    ACME_EMAIL=$(pytaj "E-mail do certyfikatu Let's Encrypt:" "")
    [ -n "$ACME_EMAIL" ] || fail "Bez adresu e-mail Let's Encrypt nie wyda certyfikatu."
  fi

  DB_HASLO=$(losowy 24)
  REDIS_HASLO=$(losowy 24)

  cat > "$ENV_FILE" <<EOF
# Wygenerowane przez scripts/deploy.sh — nie commituj tego pliku.
# Klucze zmieniaj tylko świadomie: FIELD_ENCRYPTION_KEY po zmianie
# uniemożliwia odczyt wszystkich zapisanych kluczy dostawców.
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
SECRET_KEY=$(losowy 50)
FIELD_ENCRYPTION_KEY=$(klucz_fernet)
ALLOWED_HOSTS=$DOMAIN
CSRF_TRUSTED_ORIGINS=$SCHEME://$DOMAIN
POSTGRES_DB=tikbengos
POSTGRES_USER=tikbengos
POSTGRES_PASSWORD=$DB_HASLO
REDIS_PASSWORD=$REDIS_HASLO
NEXT_PUBLIC_REALTIME_URL=$(if [ "$SCHEME" = "https" ]; then echo "wss://$DOMAIN/ws"; else echo "ws://$DOMAIN/ws"; fi)
EOF
  chmod 600 "$ENV_FILE"
  note ".env utworzony, uprawnienia 600 (czyta tylko właściciel)."
fi

if [ -z "${NEXT_PUBLIC_REALTIME_URL:-}" ]; then
  note "Uzupełniam brakujący adres czasu rzeczywistego…"
  if printf '%s' "$DOMAIN" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    printf 'NEXT_PUBLIC_REALTIME_URL=ws://%s/ws\n' "$DOMAIN" >> "$ENV_FILE"
  else
    printf 'NEXT_PUBLIC_REALTIME_URL=wss://%s/ws\n' "$DOMAIN" >> "$ENV_FILE"
  fi
fi

# ── Krok 4: Zapora ─────────────────────────────────────────────────
step "Zapora na maszynie"
# Obrazy Oracle mają `iptables`, który blokuje ruch przychodzący nawet gdy
# w panelu otworzysz porty. To jest przyczyna większości „otworzyłem i nie działa”.
if command -v iptables >/dev/null 2>&1; then
  for port in 80 443; do
    if ! $SUDO iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      $SUDO iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null || \
        warn "Nie udało się dodać reguły dla portu $port — sprawdź `sudo iptables -L INPUT -n`."
      note "Otwarty port $port."
    else
      note "Port $port już otwarty."
    fi
  done
  if command -v netfilter-persistent >/dev/null 2>&1; then
    $SUDO netfilter-persistent save >/dev/null 2>&1 || true
  else
    note "Brak `netfilter-persistent` — reguły przetrwają do restartu maszyny."
    note "Utwardzenie: sudo apt-get install -y iptables-persistent"
  fi
else
  warn "Nie ma iptables — pomijam ten krok."
fi

# ── Krok 5: Ikony PWA ──────────────────────────────────────────────
step "Ikony PWA"
if [ -f apps/web/public/icons/icon-192.png ]; then
  note "Ikony już są."
elif python3 -c 'import PIL' 2>/dev/null; then
  python3 scripts/generate-icons.py || warn "Generator zawiódł — aplikacja wstanie bez ikon."
else
  # Pillow jest potrzebny tylko temu jednemu skryptowi, więc nie wchodzi
  # do zależności usługi — instalujemy go w izolowanym środowisku Pythona.
  note "Instaluję Pillow w środowisku tymczasowym…"
  if python3 -m venv /tmp/ikony-venv >/dev/null 2>&1 && \
     /tmp/ikony-venv/bin/pip install -q pillow >/dev/null 2>&1; then
    /tmp/ikony-venv/bin/python scripts/generate-icons.py || warn "Generator zawiódł."
  else
    warn "Nie udało się przygotować Pillow. Aplikacja wstanie, ale bez ikon PWA."
  fi
fi

# ── Krok 6: Uruchomienie ───────────────────────────────────────────
step "Budowanie i uruchomienie"
note "To trwa kilka minut przy pierwszym uruchomieniu — budują się obrazy."
$DOCKER compose -f infra/docker-compose.prod.yml up -d --build

# ── Krok 7: Migracje ───────────────────────────────────────────────
step "Migracje bazy"
# Migracja `api` zawiera `migrate --noinput`, ale zależy od zdrowej bazy.
# Czekamy jawnie, żeby komunikat o błędzie był konkretny, a nie „connection refused”.
for i in $(seq 1 30); do
  if $DOCKER compose -f infra/docker-compose.prod.yml exec -T api python manage.py migrate --noinput >/dev/null 2>&1; then
    note "Migracje wykonane."
    break
  fi
  if [ "$i" -eq 30 ]; then
    warn "Migracje nie przeszły. Sprawdź logi:"
    warn "  $DOCKER compose -f infra/docker-compose.prod.yml logs api --tail=50"
  fi
  sleep 4
done

# ── Krok 8: Sprawdzenie ────────────────────────────────────────────
step "Sprawdzenie"
sleep 5
$DOCKER compose -f infra/docker-compose.prod.yml ps

if curl -fsS --max-time 10 "$SCHEME://$DOMAIN" -o /dev/null; then
  printf '\n%s✓ Działa: %s://%s%s\n' "$GREEN" "$SCHEME" "$DOMAIN" "$OFF"
else
  warn "Adres $SCHEME://$DOMAIN jeszcze nie odpowiada."
  note "Przy domenie certyfikat powstaje około minuty — spróbuj ponownie."
  note "Jeśli nie działa po minucie: $DOCKER compose -f infra/docker-compose.prod.yml logs proxy --tail=30"
fi

# ── Podsumowanie ───────────────────────────────────────────────────
printf '\n%s%sGotowe.%s\n' "$BOLD" "$GREEN" "$OFF"
printf 'Adres:      %s://%s\n' "$SCHEME" "$DOMAIN"
printf 'Kod:        %s\n' "$TARGET_DIR"
printf 'Sekrety:    %s/.env (uprawnienia 600)\n' "$TARGET_DIR"
printf '\nKolejne przydatne komendy:\n'
printf '  logi:        %s compose -f infra/docker-compose.prod.yml logs -f\n' "$DOCKER"
printf '  restart:     %s compose -f infra/docker-compose.prod.yml restart\n' "$DOCKER"
printf '  aktualizacja: git pull && %s compose -f infra/docker-compose.prod.yml up -d --build\n' "$DOCKER"
printf '  kopia bazy:  %s compose -f infra/docker-compose.prod.yml exec -T db pg_dump -U tikbengos tikbengos > kopia.sql\n' "$DOCKER"
printf '\n%sCzego ten skrypt nie zrobi:%s kopii zapasowej według harmonogramu,\n' "$YELLOW" "$OFF"
printf 'monitoringu ani aktualizacji systemu. To osobne zadania.\n'
printf '\n%sFIELD_ENCRYPTION_KEY w .env zmieniaj tylko świadomie — po zmianie\n' "$YELLOW" "$OFF"
printf 'zapisane klucze dostawców staną się nieczytelne.\n\n'
