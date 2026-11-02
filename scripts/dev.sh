#!/usr/bin/env bash
#
# TIKBENGOS — start środowiska lokalnego, bez Dockera.
#
# Po co to istnieje: żeby dało się zobaczyć aplikację i sprawdzić, że API
# odpowiada, bez budowania pięciu obrazów. Do pierwszego uruchomienia na
# Oracle służy `scripts/deploy.sh` — ten skrypt jest do sprawdzenia wcześniej.
#
# Użycie:
#   bash scripts/dev.sh
#
# Skrypt sam tworzy środowisko Pythona i instaluje zależności Node, jeżeli
# ich nie ma. Drugie uruchomienie jest szybsze, bo nic nie instaluje.
#
# Czego NIE robi: nie stawia PostgreSQL ani Redisa. Zamiast tego używa SQLite
# w pamięci — konfiguracja w `settings.py` rozpoznaje schemat `sqlite:///`
# i przełącza warstwę kanałów na pamięć procesu. To wystarcza, żeby zobaczyć
# interfejs i sprawdzić endpointy; nie wystarcza do pracy z czatem na żywo.

set -Eeuo pipefail

BOLD='\033[1m'; DIM='\033[2m'; OFF='\033[0m'
GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'

step() { printf '\n%s==>%s %s%s%s\n' "$GREEN" "$OFF" "$BOLD" "$1" "$OFF"; }
note() { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
warn() { printf '%s[!]%s %s\n' "$YELLOW" "$OFF" "$1"; }
fail() { printf '%s[x]%s %s\n' "$RED" "$OFF" "$1" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── Wymagania ───────────────────────────────────────────────────────
step "Sprawdzam narzędzia"
command -v python3 >/dev/null 2>&1 || fail "Brak python3. Zainstaluj Python 3.12."
command -v npm >/dev/null 2>&1 || fail "Brak npm. Zainstaluj Node 20 lub nowszy."

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
note "Python: $PY_VERSION"
note "Node: $(node --version 2>/dev/null || echo 'brak')"

case "$PY_VERSION" in
  3.12) note "Wersja zgodna z ustaleniem projektu." ;;
  3.13) warn "Python 3.13 — ustalenie projektu mówi 3.12. MediaPipe i TensorFlow nie mają wydania dla 3.13, a Aider wymaga poniżej 3.13. Ten skrypt nie używa żadnego z nich, więc powinno zadziałać, ale docelowo trzymaj 3.12." ;;
  *) warn "Nietypowa wersja Pythona ($PY_VERSION). Docelowo 3.12." ;;

esac

# ── Zależności Pythona ───────────────────────────────────────────────
step "Zależności API"
VENV="$ROOT/services/api/.venv"
if [ -x "$VENV/bin/python" ]; then
  note "Środowisko już jest: $VENV"
else
  note "Tworzę środowisko…"
  python3 -m venv "$VENV"
fi

# `--upgrade` tylko przy pierwszym ustawianiu, żeby drugie uruchomienie
# nie ściągało nic przez sieć.
if [ ! -f "$VENV/.zainstalowane" ]; then
  note "Instaluję zależności — to trwa przy pierwszym uruchomieniu."
  "$VENV/bin/pip" install --upgrade pip >/dev/null
  "$VENV/bin/pip" install -r services/api/requirements.txt >/dev/null
  touch "$VENV/.zainstalowane"
  note "Gotowe."
else
  note "Zależności już zainstalowane."
fi

# ── Zależności Node ──────────────────────────────────────────────────
step "Zależności interfejsu"
if [ -d "node_modules" ]; then
  note "node_modules już jest."
else
  note "Instaluję — to trwa przy pierwszym uruchomieniu."
  npm install --no-audit --no-fund
fi

# ── Sekrety dla trybu lokalnego ──────────────────────────────────────
step "Konfiguracja lokalna"
# W trybie developerskim `SECRET_KEY` ma wartość domyślną, ale
# `FIELD_ENCRYPTION_KEY` NIE MA — szyfrowanie kluczy dostawców musi mieć
# prawdziwy klucz Fernet. Generujemy go raz i trzymamy w `scratch`.
DEV_ENV="$ROOT/scratch/dev-env.sh"
mkdir -p "$ROOT/scratch"
if [ -f "$DEV_ENV" ]; then
  note "Używam zapisanej konfiguracji: scratch/dev-env.sh"
else
  FERNET=$("$VENV/bin/python" -c 'import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())')
  cat > "$DEV_ENV" <<EOF
# Wygenerowane przez scripts/dev.sh. Nie commituj.
export ENVIRONMENT=development
export SECRET_KEY=dev-only-not-for-any-deployment
export FIELD_ENCRYPTION_KEY=$FERNET
export DATABASE_URL=sqlite:///$ROOT/scratch/dev.sqlite3
export ALLOWED_HOSTS=127.0.0.1,localhost
export CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
export API_INTERNAL_URL=http://127.0.0.1:8000
export NEXT_PUBLIC_REALTIME_URL=ws://127.0.0.1:8001
EOF
  note "Zapisano w scratch/dev-env.sh (nie wchodzi do repozytorium)."
fi

# shellcheck disable=SC1090
. "$DEV_ENV"

# ── Migracje ─────────────────────────────────────────────────────────
step "Migracje"
# Migracje są pisane ręcznie i to jest ich pierwsze prawdziwe uruchomienie.
# Jeśli coś się rozjedzie z modelami, błąd wyjdzie tutaj, a nie na Oracle.
cd "$ROOT/services/api"
if "$VENV/bin/python" manage.py migrate --noinput; then
  note "Migracje wykonane."
else
  warn "Migracje NIE przeszły. To jest realny błąd do naprawy — wklej powyższy komunikat."
  exit 1
fi

# ── Testy ────────────────────────────────────────────────────────────
step "Testy API"
if "$VENV/bin/python" manage.py test --verbosity=1; then
  note "Testy przeszły."
else
  warn "Testy nie przeszły — szczegóły powyżej."
fi

# ── Start ────────────────────────────────────────────────────────────
step "Uruchamiam"
note "API: http://127.0.0.1:8000"
note "Interfejs: http://localhost:3000"
note "Zatrzymanie: Ctrl+C"
printf '\n'

cd "$ROOT"
# API w tle, interfejs na pierwszym planie — tak łatwiej zatrzymać jedno
# i widzieć logi tego, co się właśnie zmienia.
(
  cd "$ROOT/services/api"
  "$VENV/bin/python" manage.py runserver 127.0.0.1:8000
) &
API_PID=$!

trap 'kill $API_PID 2>/dev/null || true' EXIT INT TERM

npm run dev --workspace @bengos/web
