#!/usr/bin/env bash
#
# Poprawki i utwardzenie po wdrożeniu — uruchamiane RĘCZNIE na maszynie.
#
# Po co osobny skrypt: `deploy.sh` stawia aplikację po raz pierwszy. Ten plik
# rozwiązuje problemy, które pojawiają się PÓŹNIEJ i których nie da się
# rozwiązać jednym poleceniem — zły klucz szyfrowania, niezastosowane
# migracje, zawalony dysk, wolumeny bez kopii. Każda z tych rzeczy jest
# osobnym przypadkiem, więc każda ma tu swoje polecenie.
#
# Użycie:
#   bash scripts/napraw.sh                # pokaż stan, nic nie zmieniaj
#   bash scripts/napraw.sh migracje       # zastosuj brakujące migracje
#   bash scripts/napraw.sh klucz          # sprawdź FIELD_ENCRYPTION_KEY
#   bash scripts/napraw.sh restart        # przebuduj i podnieś od nowa
#   bash scripts/napraw.sh kopia          # zrzut bazy do pliku
#   bash scripts/napraw.sh dysk           # ile miejsca zajmują obrazy i wolumeny

set -Eeuo pipefail

BOLD='\033[1m'; DIM='\033[2m'; OFF='\033[0m'
GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'

step() { printf '\n%s==>%s %s%s%s\n' "$GREEN" "$OFF" "$BOLD" "$1" "$OFF"; }
note() { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
warn() { printf '%s[!]%s %s\n' "$YELLOW" "$OFF" "$1"; }
fail() { printf '%s[x]%s %s\n' "$RED" "$OFF" "$1" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -f infra/docker-compose.prod.yml ] || fail "To nie repozytorium TIKBENGOS."
[ -f .env ] || fail "Brak .env. Najpierw uruchom scripts/deploy.sh."

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi
DOCKER="$SUDO docker"
COMPOSE="$DOCKER compose -f infra/docker-compose.prod.yml"

AKCJA="${1:-stan}"

case "$AKCJA" in
  stan)
    step "Stan usług"
    $COMPOSE ps

    step "Pamięć i miejsce"
    free -h | head -2
    df -h / | tail -1

    step "Test dymny w kontenerze API"
    # Najważniejsza pojedyncza komenda w tym pliku: sprawdza klucz
    # szyfrowania, bazę, migracje i odpowiedź Django — bez sieci.
    $COMPOSE exec -T api python manage.py sprawdz || warn "Test dymny zgłosił błędy (patrz powyżej)."

    step "Adres kanału w konfiguracji"
    if grep -q '^NEXT_PUBLIC_REALTIME_URL=' .env; then
      note "$(grep '^NEXT_PUBLIC_REALTIME_URL=' .env)"
    else
      warn "Brak NEXT_PUBLIC_REALTIME_URL w .env — klient pokaże stan „nieskonfigurowany”."
      note "Dopisz: NEXT_PUBLIC_REALTIME_URL=wss://\$DOMAIN/ws"
    fi
    ;;

  migracje)
    step "Brakujące migracje"
    $COMPOSE exec -T api python manage.py showmigrations accounts | tail -20 || true
    step "Zastosowanie"
    $COMPOSE exec -T api python manage.py migrate --noinput
    note "Gotowe."
    ;;

  klucz)
    step "Sprawdzenie klucza szyfrowania"
    # Komenda `sprawdz` buduje szyfrator i wykonuje próbny cykl. Jeśli klucz
    # ma zły format, dowiesz się TU — a nie przy pierwszym zapisie klucza
    # dostawcy, gdzie błąd byłoby dużo trudniej zdiagnozować.
    $COMPOSE exec -T api python manage.py sprawdz || true
    warn "Gdy klucz jest zły: WSZYSTKIE zapisane klucze dostawców są nieczytelne."
    warn "Nie da się ich odzyskać — trzeba je wpisać ponownie po ustawieniu nowego klucza."
    ;;

  restart)
    step "Przebudowanie i restart"
    $COMPOSE down
    $COMPOSE up -d --build
    step "Stan po restarcie"
    sleep 6
    $COMPOSE ps
    $COMPOSE exec -T api python manage.py sprawdz || warn "Test dymny zgłosił błędy."
    ;;

  kopia)
    step "Zrzut bazy"
    ZRZUT="kopia-$(date +%Y%m%d-%H%M).sql"
    # Hasło i nazwa bazy z .env, żeby nie wpisywać ich ręcznie — pomyłka
    # w nazwie bazy dałaby pusty plik, a to gorsze niź błąd.
    # shellcheck disable=SC1091
    . ./.env
    $COMPOSE exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$ZRZUT"
    note "Zapisane: $ZRZUT ($(du -h "$ZRZUT" | cut -f1))"
    warn "To plik na tej samej maszynie. Skopiuj go gdzieś indziej — inaczej"
    warn "utrata maszyny to utrata danych razem z kopią."
    ;;

  dysk)
    step "Miejsce"
    df -h / | tail -1
    step "Obrazy Dockera"
    $DOCKER system df
    step "Wolumeny"
    $DOCKER volume ls --filter name=tikbengos
    note "Czyszczenie nieużywanych obrazów: $DOCKER image prune -f"
    warn "NIE usuwaj wolumenów: db-data to baza, caddy-data to certyfikaty."
    ;;

  *)
    fail "Nieznana akcja: $AKCJA. Dostępne: stan, migracje, klucz, restart, kopia, dysk."
    ;;
esac

printf '\n%sGotowe.%s\n\n' "$BOLD" "$OFF"
