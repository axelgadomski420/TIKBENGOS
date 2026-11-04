#!/usr/bin/env bash
#
# Sprawdzenie gotowości instalacji na własnym serwerze.
#
# Skrypt czyta wyłącznie zmienne środowiskowe i pyta o wersje narzędzi. Nie
# modyfikuje niczego, niczego nie instaluje i nie wysyła żadnych danych na
# zewnątrz — dlatego można go uruchomić przed migracjami, na maszynie, która
# jeszcze nic nie ma.
#
# Kod wyjścia: 0 — wszystkie pozycje krytyczne przeszły; 1 — co najmniej jedna
# nie przeszła. Pozycje oznaczone jako „uwaga” nie zmieniają kodu wyjścia.

set -u

if [ -t 1 ]; then
  RED=$'\033[31m'
  YELLOW=$'\033[33m'
  GREEN=$'\033[32m'
  RESET=$'\033[0m'
else
  RED=""
  YELLOW=""
  GREEN=""
  RESET=""
fi

FAILURES=0
WARNINGS=0

fail() {
  printf '%s[BŁĄD]%s %s\n' "$RED" "$RESET" "$1"
  FAILURES=$((FAILURES + 1))
}

warn() {
  printf '%s[UWAGA]%s %s\n' "$YELLOW" "$RESET" "$1"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  printf '%s[OK]%s %s\n' "$GREEN" "$RESET" "$1"
}

read_env() {
  # Wartość zmiennej o podanej nazwie albo pusty napis. `grep` po pliku nie
  # wystarcza, bo linia może być zakomentowana — a zakomentowana wartość to
  # brak wartości, nie wartość.
  local name="$1" file="$2"
  if [ -f "$file" ]; then
    sed -n "s/^${name}=//p" "$file" | tail -n 1
  fi
}

need() {
  # Pierwszy argument to nazwa zmiennej, drugi to opis, trzeci opcjonalnie
  # plik, z którego wolno ją doczytać.
  local name="$1" description="$2" file="${3:-}"
  local value="${!name:-}"
  if [ -z "$value" ] && [ -n "$file" ]; then
    value="$(read_env "$name" "$file")"
  fi
  if [ -z "$value" ]; then
    fail "$name nieustawiona — $description"
  else
    ok "$name ustawiona ($description)"
  fi
}

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
  ok "Znaleziono $ENV_FILE"
else
  warn "Brak $ENV_FILE — skrypt czyta wtedy zmienne środowiskowe procesu. Wzór: infra/.env.example"
fi

# ── Wersje narzędzi ─────────────────────────────────────────────────
# Python musi być 3.12: MediaPipe i TensorFlow nie mają wydania dla 3.13,
# a Aider wymaga wersji poniżej 3.13. To jedyna wersja spełniająca wszystkie
# trzy warunki — dlatego sprawdzamy ją dokładnie, a nie „3.x”.
if command -v python3.12 >/dev/null 2>&1; then
  ok "python3.12 dostępny"
else
  fail "brak python3.12 — MediaPipe, TensorFlow i Aider nie zadziałają na innej wersji"
fi

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$NODE_MAJOR" -ge 20 ] 2>/dev/null; then
    ok "Node $NODE_MAJOR"
  else
    fail "Node $NODE_MAJOR — CI używa Node 20"
  fi
else
  fail "brak node"
fi

if command -v psql >/dev/null 2>&1; then
  ok "klient psql dostępny"
else
  warn "brak klienta psql — nie da się sprawdzić wersji PostgreSQL z tej maszyny"
fi

if command -v redis-cli >/dev/null 2>&1; then
  ok "klient redis-cli dostępny"
else
  warn "brak klienta redis-cli — nie da się sprawdzić wersji Redis z tej maszyny"
fi

# ── Sekrety i adresy ────────────────────────────────────────────────
need SECRET_KEY "podpisuje ciasteczka sesji i CSRF" "$ENV_FILE"
need FIELD_ENCRYPTION_KEY "szyfruje klucze dostawców; zmiana czyni zapisane klucze nieczytelnymi" "$ENV_FILE"
need DATABASE_URL "połączenie z PostgreSQL" "$ENV_FILE"
need REDIS_URL "kolejka zadań i kanał czasu rzeczywistego" "$ENV_FILE"

ENV_VALUE="${ENVIRONMENT:-$(read_env ENVIRONMENT "$ENV_FILE")}"
if [ -z "$ENV_VALUE" ]; then
  warn "ENVIRONMENT nieustawiona — przyjmuję, że to nie produkcja"
elif [ "$ENV_VALUE" = "development" ]; then
  warn "ENVIRONMENT=development — nie uruchamiaj tak publicznie"
else
  ok "ENVIRONMENT=$ENV_VALUE"
fi

if [ "$ENV_VALUE" != "development" ]; then
  HOSTS="${ALLOWED_HOSTS:-$(read_env ALLOWED_HOSTS "$ENV_FILE")}"
  if [ -z "$HOSTS" ]; then
    fail "ALLOWED_HOSTS pusta przy ENVIRONMENT=$ENV_VALUE — Django odrzuci żądania"
  else
    ok "ALLOWED_HOSTS ustawiona"
  fi

  ORIGINS="${CSRF_TRUSTED_ORIGINS:-$(read_env CSRF_TRUSTED_ORIGINS "$ENV_FILE")}"
  if [ -z "$ORIGINS" ]; then
    fail "CSRF_TRUSTED_ORIGINS pusta — żądania zapisujące z interfejsu dostaną 403"
  else
    ok "CSRF_TRUSTED_ORIGINS ustawiona"
  fi

  # Bez HTTPS ciasteczka sesji muszą mieć flagę Secure, a przeglądarka ich nie
  # przyjmie. To nie jest „uwaga” — to jest przyczyna, dla której logowanie
  # nie działa na produkcji bez certyfikatu.
  case "$ORIGINS" in
    https://*) ok "CSRF_TRUSTED_ORIGINS używa HTTPS" ;;
    *) warn "CSRF_TRUSTED_ORIGINS bez HTTPS — przy ENVIRONMENT=$ENV_VALUE dodaj certyfikat i adres https://" ;;
  esac
fi

# ── Interfejs ───────────────────────────────────────────────────────
if [ -f "apps/web/.env.local" ]; then
  ok "Znaleziono apps/web/.env.local"
  API_URL="$(read_env NEXT_PUBLIC_API_URL "apps/web/.env.local")"
  REALTIME_URL="$(read_env NEXT_PUBLIC_REALTIME_URL "apps/web/.env.local")"
  if [ -z "$API_URL" ]; then
    fail "NEXT_PUBLIC_API_URL pusta — interfejs nie ma z czym gadać"
  else
    ok "NEXT_PUBLIC_API_URL ustawiona"
  fi
  if [ -z "$REALTIME_URL" ]; then
    warn "NEXT_PUBLIC_REALTIME_URL pusta — wskaźnik kanału pokaże stan „nieskonfigurowany”, a to jest stan uczciwy, nie błąd"
  else
    ok "NEXT_PUBLIC_REALTIME_URL ustawiona"
  fi
else
  warn "Brak apps/web/.env.local — ustaw NEXT_PUBLIC_API_URL i NEXT_PUBLIC_REALTIME_URL przed uruchomieniem interfejsu"
fi

# ── Podsumowanie ────────────────────────────────────────────────────
printf '\n'
printf 'Pozycje krytyczne bez zastrzeżeń: %s\n' "$((FAILURES == 0 ? 1 : 0))"
printf 'Błędy: %s, uwagi: %s\n' "$FAILURES" "$WARNINGS"

if [ "$FAILURES" -gt 0 ]; then
  printf '\nNie uruchamiaj migracji, dopóki powyższe błędy nie znikną.\n'
  exit 1
fi

printf '\nKolejny krok: migracje i konto administratora w usłudze API.\n'
exit 0
