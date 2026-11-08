#!/usr/bin/env bash
#
# TIKBENGOS — jeden skrypt, który doprowadza aplikację produkcyjną do działania.
#
# Użycie:
#   bash scripts/uruchom.sh
#
# ── CO ROBI ─────────────────────────────────────────────────────────────
# 1. Sprawdza Dockera i dostęp do demona.
# 2. Odświeża kod z GitHuba.
# 3. Tworzy `.env`, gdy go nie ma, i UZUPEŁNIA tylko puste pola.
# 4. Dopisuje brakujące zmienne LOGOWANIA PRZEZ DOSTAWCĘ (Google, GitHub).
# 5. Otwiera porty 80/443 na maszynie i przypomina o panelu Oracle.
# 6. Buduje i podnosi kontenery produkcyjne.
# 7. Czeka na odpowiedź — na poprawnej ścieżce `/v1/health`.
# 8. Podnosi tunel Cloudflare, jeśli jest token; w przeciwnym razie podpowiada.
#
# ── CZEGO NIE ROBI ──────────────────────────────────────────────────────
# Nie wystawia portów w panelu Oracle (Security List). Nie zakłada konta
# Cloudflare, nie kupuje domeny i nie zmienia serwerów nazw.

set -uo pipefail

BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m'); OFF=$(printf '\033[0m')
GREEN=$(printf '\033[32m'); YELLOW=$(printf '\033[33m'); RED=$(printf '\033[31m')
CYAN=$(printf '\033[36m')

step() { printf '\n%s==> %s%s\n' "$GREEN$BOLD" "$1" "$OFF"; }
note() { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
link() { printf '    %s%s%s\n' "$CYAN" "$1" "$OFF"; }
warn() { printf '%s[!]%s %s\n' "$YELLOW" "$OFF" "$1"; }
bad()  { printf '%s[x]%s %s\n' "$RED" "$OFF" "$1"; }
good() { printf '%s[ok]%s %s\n' "$GREEN" "$OFF" "$1"; }
die()  { bad "$1"; printf '\n%sSkrypt zatrzymany.%s\n' "$BOLD" "$OFF"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="infra/docker-compose.prod.yml"
TUNNEL_NAMED="infra/docker-compose.tunnel-named.yml"
ENV_FILE=".env"

[ -f "$COMPOSE_FILE" ] || die "Brak $COMPOSE_FILE — to nie repozytorium TIKBENGOS."

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
env_val() { sed -n "s/^$1=//p" "$ENV_FILE" 2>/dev/null | tail -n 1; }

step "Docker"
command -v docker >/dev/null 2>&1 || die "Brak Dockera."
good "$(docker --version)"

SUDO=0
if ! docker info >/dev/null 2>&1; then
  warn "Nie mogę połączyć się z demonem jako $(whoami)."
  sudo usermod -aG docker "$(whoami)" || true
  SUDO=1
else
  good "Połączenie z demonem działa."
fi
[ "$SUDO" = "1" ] && compose() { sudo docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

step "Kod źródłowy"
if [ -d "$ROOT/.git" ]; then
  git pull --ff-only >/dev/null 2>&1 && good "Kod odświeżony." || warn "Nie udało się odświeżyć."
else
  warn "To nie jest klon gita."
fi

step "Konfiguracja (.env)"
generuj()      { python3 -c "import secrets; print(secrets.token_urlsafe(${1:-40}))"; }
klucz_fernet() { python3 -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"; }
zapytaj()      { printf '%s' "$1" >&2; read -r "$2" </dev/tty || true; }

if [ ! -f "$ENV_FILE" ]; then
  ADRES="$(curl -fsS --max-time 6 https://api.ipify.org 2>/dev/null || true)"
  [ -n "$ADRES" ] || zapytaj "Podaj adres maszyny albo domenę: " ADRES
  [ -n "$ADRES" ] || die "Bez adresu nie da się uruchomić aplikacji."
  case "$ADRES" in
    *[a-zA-Z]*) SCHEME="https"; zapytaj "E-mail do certyfikatu Let's Encrypt: " ACME ;;
    *)          SCHEME="http";  ACME=""; warn "To adres IP — HTTPS nie wstanie." ;;
  esac
  OLD_UMASK=$(umask); umask 077
  cat > "$ENV_FILE" <<EOF
# Wygenerowane przez scripts/uruchom.sh — nie commituj tego pliku.
DOMAIN=$ADRES
ACME_EMAIL=${ACME:-certyfikat-nieaktywny@localhost}
SECRET_KEY=$(generuj 50)
FIELD_ENCRYPTION_KEY=$(klucz_fernet)
ALLOWED_HOSTS=127.0.0.1,localhost,api,api:8000,web,web:3000,$ADRES
CSRF_TRUSTED_ORIGINS=$SCHEME://$ADRES
POSTGRES_DB=tikbengos
POSTGRES_USER=tikbengos
POSTGRES_PASSWORD=$(generuj 24)
REDIS_PASSWORD=$(generuj 24)
NEXT_PUBLIC_REALTIME_URL=$(if [ "$SCHEME" = "https" ]; then echo "wss://$ADRES/ws"; else echo "ws://$ADRES/ws"; fi)
EOF
  umask "$OLD_UMASK"; chmod 600 "$ENV_FILE"
  good "Zapisany $ENV_FILE (uprawnienia 600)."
else
  good "$ENV_FILE istnieje — uzupełniam braki."
fi

ustaw_if_puste() {
  local klucz="$1" wartosc="$2" obecna
  obecna=$(env_val "$klucz")
  [ -n "$obecna" ] && return 0
  if grep -q "^${klucz}=" "$ENV_FILE"; then
    sed -i "s|^${klucz}=.*|${klucz}=${wartosc}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$klucz" "$wartosc" >> "$ENV_FILE"
  fi
  warn "Uzupełnione puste ${klucz}."
}

ustaw_if_puste ACME_EMAIL "certyfikat-nieaktywny@localhost"
ustaw_if_puste SECRET_KEY "$(generuj 50)"
ustaw_if_puste FIELD_ENCRYPTION_KEY "$(klucz_fernet)"
ustaw_if_puste POSTGRES_DB tikbengos
ustaw_if_puste POSTGRES_USER tikbengos
ustaw_if_puste POSTGRES_PASSWORD "$(generuj 24)"
ustaw_if_puste REDIS_PASSWORD "$(generuj 24)"

step "Adresy w Django"
ADRES="$(env_val DOMAIN)"
if [ -n "$ADRES" ]; then
  for para in "ALLOWED_HOSTS:127.0.0.1,localhost,api,api:8000,web,web:3000" \
              "CSRF_TRUSTED_ORIGINS:https://${ADRES}"; do
    klucz="${para%%:*}"; bazowe="${para#*:}"; obecna="$(env_val "$klucz")"
    case "$obecna" in
      *"$ADRES"*) : ;;
      "")   sed -i "s|^${klucz}=.*|${klucz}=${bazowe},${ADRES}|" "$ENV_FILE"; warn "Uzupełnione ${klucz}." ;;
      *)    sed -i "s|^${klucz}=.*|${klucz}=${obecna},${ADRES}|" "$ENV_FILE"; warn "Dopisany adres do ${klucz}." ;;
    esac
  done
fi

step "Logowanie przez dostawcę"
ustaw_if_puste GOOGLE_CLIENT_ID ""
ustaw_if_puste GOOGLE_CLIENT_SECRET ""
ustaw_if_puste GITHUB_OAUTH_CLIENT_ID ""
ustaw_if_puste GITHUB_OAUTH_CLIENT_SECRET ""
if [ -z "$(env_val OAUTH_REDIRECT_BASE)" ] && [ -n "$ADRES" ]; then
  ustaw_if_puste OAUTH_REDIRECT_BASE "https://${ADRES}"
fi

CALLBACK_BASE="$(env_val OAUTH_REDIRECT_BASE)"
if [ -n "$(env_val GOOGLE_CLIENT_ID)" ] && [ -n "$(env_val GOOGLE_CLIENT_SECRET)" ]; then
  good "Google: klucze są w .env."
else
  warn "Google: brakuje kluczy — przycisk będzie nieaktywny."
  note "console.cloud.google.com → APIs & Services → Credentials"
  note "Authorized redirect URI musi być dokładnie ten:"
  link "  ${CALLBACK_BASE:-https://twoja-domena}/api/auth/oauth/google/callback"
fi

chmod 600 "$ENV_FILE"
compose config -q 2>/tmp/tikbengos-config.log || {
  bad "Konfiguracja nie przechodzi sprawdzenia compose:"
  sed 's/^/    /' /tmp/tikbengos-config.log
  die "Najczęstsza przyczyna: końce linii CRLF albo BOM w $ENV_FILE."
}
good "Konfiguracja czytelna."

step "Zapora na maszynie"
if command -v iptables >/dev/null 2>&1; then
  for port in 80 443; do
    if sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      good "Port $port już otwarty."
    elif sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      good "Otwarty port $port."
    else
      warn "Nie udało się dodać reguły dla portu $port."
    fi
  done
  sudo netfilter-persistent save >/dev/null 2>&1 || true
fi
warn "Porty 80/443 trzeba jeszcze otworzyć w panelu Oracle (Security List)."

step "Budowanie i uruchomienie"
note "Pierwsze budowanie trwa kilka minut na maszynie ARM."
compose up -d --build || die "Budowanie albo start nie powiodły się."

step "Czekam, aż aplikacja odpowie"
API_UP=0; WEB_UP=0
for _ in $(seq 1 30); do
  curl -fsS --max-time 4 "http://127.0.0.1/v1/health" -o /dev/null 2>/dev/null && API_UP=1 && break
  sleep 3
done
for _ in $(seq 1 30); do
  curl -fsS --max-time 4 "http://127.0.0.1/api/csrf" -o /dev/null 2>/dev/null && WEB_UP=1 && break
  sleep 3
done
[ "$API_UP" = "1" ] && good "API odpowiada: /v1/health" || warn "API nie odpowiada lokalnie."
[ "$WEB_UP" = "1" ] && good "Interfejs odpowiada i proxy działa." || warn "Interfejs nie odpowiada lokalnie."

if [ -n "$(env_val CLOUDFLARE_TUNNEL_TOKEN)" ] && [ -f "$TUNNEL_NAMED" ]; then
  step "Tunel Cloudflare (nazwany)"
  docker compose --env-file "$ENV_FILE" -f "$TUNNEL_NAMED" up -d || warn "Tunel nazwany nie wstał."
fi

step "Gotowe"
printf '%sAdres: %shttps://%s%s\n' "$BOLD" "$CYAN" "${ADRES:-brak}" "$OFF"
printf '\n%sCo dalej:%s\n' "$BOLD" "$OFF"
printf '  Stan:      sudo docker compose --env-file .env -f %s ps\n' "$COMPOSE_FILE"
printf '  Logi:      sudo docker compose --env-file .env -f %s logs -f\n' "$COMPOSE_FILE"
printf '  Ponownie:  bash scripts/reload.sh\n'
printf '\n%sCzego ten skrypt nie zrobił:%s portów 80/443 w panelu Oracle.\n' "$YELLOW" "$OFF"
printf '\n'
