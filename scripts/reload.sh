#!/usr/bin/env bash
#
# TIKBENGOS — przeładowanie z czyszczeniem cache. Wersja w repozytorium.
#
# Użycie:
#   bash scripts/reload.sh          # tylko web
#   bash scripts/reload.sh api      # api i web
#
# ── PO CO OSOBNY SKRYPT ──────────────────────────────────────────────────
# `up -d --build web` przebudowuje obraz, ale NIE czyści dwóch rzeczy,
# które siedzą poza nim i poza repozytorium:
#
#   1. `.next/cache` — katalog w obrazie, w którym Next.js trzyma skompilowane
#      strony. `COPY . .` w Dockerfile przenosi go do obrazu, jeśli leży na
#      maszynie. Wtedy build „przechodzi”, a w przeglądarce widać starą
#      wersję — bo cache był ważniejszy od kodu.
#
#   2. Cache przeglądarki i ciasteczka. Service worker PWA i `csrftoken`
#      przeżywają deploy. Bez ich wyczyszczenia widzisz stary ekran mimo
#      nowego obrazu.
#
# ── CZEGO NIE ROBI ──────────────────────────────────────────────────────
# Nie usuwa wolumenów (`down -v`) — to skasowałoby bazę razem z kontami.
# Nie dotyka `.env`. Nie rusza `uploads/`.

set -uo pipefail

BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m'); OFF=$(printf '\033[0m')
GREEN=$(printf '\033[32m'); YELLOW=$(printf '\033[33m'); RED=$(printf '\033[31m')

step() { printf '\n%s==> %s%s\n' "$GREEN$BOLD" "$1" "$OFF"; }
note() { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
warn() { printf '%s[!]%s %s\n' "$YELLOW" "$OFF" "$1"; }
bad()  { printf '%s[x]%s %s\n' "$RED" "$OFF" "$1"; }
die()  { bad "$1"; exit 1; }

# Skrypt leży w `scripts/`, a projekt jest o katalog wyżej.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="infra/docker-compose.prod.yml"
ENV_FILE=".env"

[ -f "$COMPOSE_FILE" ] || die "Brak $COMPOSE_FILE — to nie repozytorium TIKBENGOS."
[ -f "$ENV_FILE" ] || die "Brak $ENV_FILE — najpierw uruchom scripts/uruchom.sh."

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

USLUGI=("web")
[ "${1:-}" = "api" ] && USLUGI=("api" "web")

# ── 1. Kod ───────────────────────────────────────────────────────────────
step "Kod źródłowy"
if [ -d "$ROOT/.git" ]; then
  git pull --ff-only 2>&1 | tail -6 || warn "Nie udało się odświeżyć — używam tego, co jest."
  printf '\n'
  note "Ostatnie commity:"
  git log --oneline -4 | sed 's/^/    /'
else
  warn "To nie jest klon gita."
fi

# ── 2. Cache Next.js na maszynie ─────────────────────────────────────────
step "Cache budowania na maszynie"
USUNIETO=0
for katalog in "apps/web/.next" "apps/web/node_modules/.cache"; do
  if [ -d "$katalog" ]; then
    rm -rf "$katalog" 2>/dev/null && { note "Usunięte: $katalog"; USUNIETO=1; }
  fi
done
[ "$USUNIETO" = "0" ] && note "Nie ma czego usuwać (budowanie i tak robi się w obrazie)."

# ── 3. Przebudowa bez cache ──────────────────────────────────────────────
# `--no-cache` jest tu istotne, a nie ostrożnościowe. Docker pamięta warstwę
# `RUN npm run build`, a klucz tej warstwy to zawartość skopiowanych plików.
# Przy zmianie, której nie widać w `COPY`, Docker poda STARĄ warstwę i powie,
# że gotowe. `--no-cache` wymusza pełne przeliczenie.
step "Przebudowa obrazów (bez cache)"
note "Usługi: ${USLUGI[*]} — to trwa kilka minut na maszynie ARM."
compose build --no-cache "${USLUGI[@]}" || die "Budowanie nie powiodło się."

# ── 4. Restart ───────────────────────────────────────────────────────────
step "Restart kontenerów"
compose up -d --force-recreate "${USLUGI[@]}" || die "Restart nie powiódł się."

# ── 5. Czekanie na odpowiedź ─────────────────────────────────────────────
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
[ "$API_UP" = "1" ] && printf '%s[ok]%s API odpowiada.\n' "$GREEN" "$OFF" || warn "API nie odpowiada lokalnie."
[ "$WEB_UP" = "1" ] && printf '%s[ok]%s Interfejs odpowiada.\n' "$GREEN" "$OFF" || warn "Interfejs nie odpowiada lokalnie."

# ── 6. Dowód, że zmiany są w obrazie ─────────────────────────────────────
# Ten krok istnieje, bo „nic nie zmieniłeś” to najczęstszy objaw starego
# cache. Zamiast zgadywać, sprawdzamy, czy plik z commita NAPRAWDĘ leży
# w zbudowanym obrazie.
step "Dowód: czy zmiany są w obrazie"
if compose exec -T web sh -c "grep -q 'brand/logo.jpg' /app/apps/web/src/lib/brand.ts" 2>/dev/null; then
  printf '%s[ok]%s brand.ts w obrazie wskazuje na /brand/logo.jpg\n' "$GREEN" "$OFF"
else
  bad "W obrazie NIE MA zmiany w brand.ts — git pull nie dojechał."
  note "Sprawdź: git log --oneline -3"
fi

# ── 7. Instrukcja dla przeglądarki ───────────────────────────────────────
step "Wyczyść przeglądarkę"
printf '%sAplikacja jest PWA, więc ma service workera — on trzyma stary%s\n' "$BOLD" "$OFF"
printf '%swidok najdłużej ze wszystkiego. Zwykłe odświeżenie go nie rusza.%s\n\n' "$BOLD" "$OFF"

printf '%sNajpierw sprawdź w trybie prywatnym.%s Jeśli tam widać zmiany —\n' "$BOLD" "$OFF"
printf 'problem jest w cache, nie w aplikacji.\n\n'
printf '%sTelefon, Chrome:%s Ustawienia → Prywatność → Wyczyść dane przeglądania\n' "$BOLD" "$OFF"
printf '  → zaznacz „Pliki cookie” i „Obrazy i pliki w pamięci podręcznej”.\n'
printf '%sTelefon, Safari:%s Ustawienia → Safari → Zaawansowane → Dane witryn → Usuń.\n' "$BOLD" "$OFF"
printf '%sKomputer:%s F12 → Application → Storage → Clear site data\n' "$BOLD" "$OFF"
printf '  (zaznacz też „Service workers” i „Cache storage”).\n\n'

ADRES="$(sed -n 's/^DOMAIN=//p' "$ENV_FILE" | tail -n 1)"
printf '%sAdresy do sprawdzenia:%s\n' "$BOLD" "$OFF"
printf '  https://%s\n' "${ADRES:-bengos.pl}"
printf '  https://%s/login\n' "${ADRES:-bengos.pl}"
printf '\n'
