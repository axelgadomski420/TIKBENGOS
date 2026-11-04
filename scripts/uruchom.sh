#!/usr/bin/env bash
#
# TIKBENGOS — jeden skrypt, ktory doprowadza aplikacje do dzialania.
#
# Uzycie na maszynie z klonem repozytorium:
#   bash scripts/uruchom.sh
#
# CZYM ROZNI SIE OD `deploy.sh`
#
# `deploy.sh` zaklada, ze wszystko pojdzie za pierwszym razem. Ten skrypt jest
# napisany na wypadek, gdy nie idzie: kazdy krok sprawdza wynik i przy bledzie
# wypisuje jego tresc oraz ostatnie linie logu tej uslugi, ktora padla.
#
# Trzy roznice wynikajace wprost z pierwszego wdrozenia:
#
# 1. NAPRAWIA PLIK `.env`, zamiast go zostawiac. Pierwsze podejscie zapisalo
#    `ACME_EMAIL=` puste, a compose wymaga wartosci przez `${ACME_EMAIL:?}` —
#    interpolacja przerywala start. Tu uzupelniamy brakujace pola same.
#
# 2. CZEKA NA ZDROWIE KONTENEROW. `up -d` konczy sie, zanim proces wstanie.
#    Skrypt czeka i mowi, ktory kontener nie wstal, a nie "gotowe".
#
# 3. SPRAWDZA APLIKACJE OD SRODKA, nie tylko stan kontenerow. Kontener
#    w stanie "Up" nic nie znaczy, jezeli Django odpowiada 400.
#
# CZEGO NIE ROBI
# Nie wystawia portow w panelu Oracle (Security List) — tego nie da sie zrobic
# z maszyny. Skrypt o tym przypomina na koncu.

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
COMPOSE_FILE="infra/docker-compose.prod.yml"
ENV_FILE=".env"

[ -f "$COMPOSE_FILE" ] || die "Brak $COMPOSE_FILE — to nie repozytorium TIKBENGOS."

# Compose z jawnym plikiem konfiguracji. Bez tego compose szuka `.env` sam,
# a przy nieudanym wyszukaniu zglasza kilkanascie brakujacych zmiennych,
# nie mowiac, ze chodzi o plik.
compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

# ── 1. Docker ───────────────────────────────────────────────────────────
step "Docker"
if ! command -v docker >/dev/null 2>&1; then
  die "Brak Dockera. Zainstaluj go i uruchom skrypt ponownie."
fi
good "$(docker --version)"

SUDO_DOCKER=0
if ! docker info >/dev/null 2>&1; then
  warn "Nie moge polaczyc sie z demonem Dockera jako $(whoami)."
  note "Dodaje konto do grupy docker i uzywam sudo w tej sesji."
  sudo usermod -aG docker "$(whoami)" || true
  SUDO_DOCKER=1
else
  good "Polaczenie z demonem dziala."
fi

if [ "$SUDO_DOCKER" = "1" ]; then
  compose() { sudo docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
fi

# ── 2. Kod ─────────────────────────────────────────────────────────────
step "Kod zrodlowy"
if [ -d "$ROOT/.git" ]; then
  if git pull --ff-only >/dev/null 2>&1; then
    good "Kod odswiezony z GitHuba."
  else
    warn "Nie udalo sie odswiezyc kodu — uzywam tego, co jest w katalogu."
  fi
else
  warn "To nie jest klon gita — uzywam tego, co jest w katalogu."
fi

# ── 3. Plik konfiguracji ────────────────────────────────────────────────
step "Konfiguracja (.env)"

adres_z_env() { sed -n 's/^DOMAIN=//p' "$ENV_FILE" 2>/dev/null | tail -n 1; }
adres_z_curl() { curl -fsS --max-time 6 https://api.ipify.org 2>/dev/null || true; }

generuj() { python3 -c "import secrets; print(secrets.token_urlsafe(${1:-40}))"; }
klucz_fernet() { python3 -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"; }

if [ ! -f "$ENV_FILE" ]; then
  ADRES="$(adres_z_curl)"
  if [ -z "$ADRES" ]; then
    printf 'Podaj publiczny adres tej maszyny (albo nazwe domeny): ' >&2
    read -r ADRES </dev/tty || ADRES=""
    [ -n "$ADRES" ] || die "Bez adresu nie da sie uruchomic aplikacji."
  fi
  note "Adres: $ADRES"

  ACME=""
  if printf '%s' "$ADRES" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    SCHEME="http"
    warn "To adres IP — certyfikatu nie bedzie, wiec HTTPS nie wstanie."
    warn "Logowanie wymaga HTTPS. Zobaczysz aplikacje, ale nie zalozysz konta."
  else
    SCHEME="https"
    printf 'E-mail do certyfikatu Let us Encrypt: ' >&2
    read -r ACME </dev/tty || ACME=""
    [ -n "$ACME" ] || die "Bez adresu e-mail certyfikat nie zostanie wydany."
  fi

  OLD_UMASK=$(umask); umask 077
  cat > "$ENV_FILE" <<EOF
# Wygenerowane przez scripts/uruchom.sh — nie commituj tego pliku.
# FIELD_ENCRYPTION_KEY zmieniaj tylko swiadomie: po zmianie wszystkie
# zapisane klucze dostawcow stana sie nieczytelne.
DOMAIN=$ADRES
ACME_EMAIL=${ACME:-certyfikat-nieaktywny@localhost}
SECRET_KEY=$(generuj 50)
FIELD_ENCRYPTION_KEY=$(klucz_fernet)
ALLOWED_HOSTS=$ADRES
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
  good "$ENV_FILE juz istnieje — poprawiam tylko to, czego brakuje."
  ADRES="$(adres_z_env)"

  # Ustawia pole, gdy jest puste. To jest ta roznica, przez ktora pierwsze
  # wdrozenie stanelo: `ACME_EMAIL` bylo puste, a compose wymaga wartosci
  # przez `${ACME_EMAIL:?}` i interpolacja przerywala start.
  ustaw_if_puste() {
    local klucz="$1" wartosc="$2" obecna
    obecna=$(sed -n "s/^${klucz}=//p" "$ENV_FILE" | tail -n 1)
    if [ -z "$obecna" ]; then
      if grep -q "^${klucz}=" "$ENV_FILE"; then
        sed -i "s|^${klucz}=.*|${klucz}=${wartosc}|" "$ENV_FILE"
      else
        printf '%s=%s\n' "$klucz" "$wartosc" >> "$ENV_FILE"
      fi
      warn "Uzupelnione puste ${klucz}."
    fi
  }

  ustaw_if_puste ACME_EMAIL "certyfikat-nieaktywny@localhost"
  ustaw_if_puste SECRET_KEY "$(generuj 50)"
  ustaw_if_puste FIELD_ENCRYPTION_KEY "$(klucz_fernet)"
  ustaw_if_puste POSTGRES_DB tikbengos
  ustaw_if_puste POSTGRES_USER tikbengos
  ustaw_if_puste POSTGRES_PASSWORD "$(generuj 24)"
  ustaw_if_puste REDIS_PASSWORD "$(generuj 24)"

  if [ -n "$ADRES" ]; then
    if [ -z "$(sed -n 's/^NEXT_PUBLIC_REALTIME_URL=//p' "$ENV_FILE" | tail -n 1)" ]; then
      sed -i "s|^NEXT_PUBLIC_REALTIME_URL=.*|NEXT_PUBLIC_REALTIME_URL=ws://${ADRES}/ws|" "$ENV_FILE"
      warn "Uzupelnione NEXT_PUBLIC_REALTIME_URL."
    fi

    # Adres musi sie zgadzac w obu miejscach po stronie Django. Rozjazd daje
    # 400 na kazde zadanie — to byla druga rzecz poprawiana recznie.
    for klucz in ALLOWED_HOSTS CSRF_TRUSTED_ORIGINS; do
      obecna=$(sed -n "s/^${klucz}=//p" "$ENV_FILE" | tail -n 1)
      case "$obecna" in
        *"$ADRES"*) : ;;
        "") sed -i "s|^${klucz}=.*|${klucz}=${ADRES}|" "$ENV_FILE"
            warn "Uzupelnione ${klucz}." ;;
        *) sed -i "s|^${klucz}=.*|${klucz}=${obecna},${ADRES}|" "$ENV_FILE"
           warn "Dopisany adres do ${klucz}." ;;
      esac
    done
    # CSRF wymaga pelnego origin ze schematem, nie samego hosta.
    obecny_origin=$(sed -n 's/^CSRF_TRUSTED_ORIGINS=//p' "$ENV_FILE" | tail -n 1)
    case "$obecny_origin" in
      *"://$ADRES"*) : ;;
      *) sed -i "s|^CSRF_TRUSTED_ORIGINS=.*|${obecny_origin},http://${ADRES}|" "$ENV_FILE"
         warn "Dopisany pelny origin do CSRF_TRUSTED_ORIGINS." ;;
    esac
  fi
  chmod 600 "$ENV_FILE"
fi

# Kontrola czytelnosci konfiguracji. Osobna komenda, zeby komunikat wskazywal
# przyczyne, a nie liste kilkunastu brakujacych zmiennych.
if ! compose config -q 2>/tmp/tikbengos-config.log; then
  bad "Konfiguracja nie przechodzi sprawdzenia compose:"
  sed 's/^/    /' /tmp/tikbengos-config.log
  warn "Najczestsza przyczyna: konce linii CRLF albo BOM w $ENV_FILE."
  die "Popraw $ENV_FILE i uruchom skrypt ponownie."
fi
good "Konfiguracja czytelna."

# ── 4. Porty na maszynie ───────────────────────────────────────────────
step "Zapora na maszynie"
if command -v iptables >/dev/null 2>&1; then
  for port in 80 443; do
    if sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      good "Port $port juz otwarty."
    elif sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      good "Otwarty port $port."
    else
      warn "Nie udalo sie dodac reguly dla portu $port."
    fi
  done
  sudo netfilter-persistent save >/dev/null 2>&1 || true
fi
warn "Porty 80 i 443 trzeba jeszcze otworzyc w panelu Oracle (Security List) — tego skrypt nie zrobi."

# ── 5. Ikony PWA ───────────────────────────────────────────────────────
step "Ikony PWA"
if [ -f apps/web/public/icons/icon-192.png ]; then
  good "Ikony sa."
elif [ -f scripts/generate-icons.py ]; then
  if python3 scripts/generate-icons.py >/dev/null 2>&1; then good "Wygenerowane."; else warn "Ikony nie powstaly — aplikacja wstanie, PWA bez ikony."; fi
fi

# ── 6. Budowanie i start ───────────────────────────────────────────────
step "Budowanie i uruchomienie"
note "Pierwsze budowanie trwa kilka minut — piec obrazow na maszynie ARM."
if ! compose up -d --build; then
  die "Budowanie albo start nie powiodly sie. Log: compose logs --tail=80"
fi

# ── 7. Czekanie na zdrowie i odpowiedz ─────────────────────────────────
step "Czekam, az aplikacja wstanie"
ZDROWE=0
for proba in $(seq 1 40); do
  stan=$(compose ps --format '{{.Service}} {{.State}}' 2>/dev/null || true)
  zle=$(printf '%s\n' "$stan" | grep -v 'running' | grep -v '^$' || true)
  if [ -z "$zle" ] && [ -n "$stan" ]; then ZDROWE=1; break; fi
  sleep 3
done

interfejs_up=0
for proba in $(seq 1 30); do
  if curl -fsS --max-time 5 "http://127.0.0.1/api/health" -o /dev/null 2>/dev/null; then
    interfejs_up=1; break
  fi
  sleep 3
done

printf '\n'
if [ "$ZDROWE" = "1" ]; then good "Wszystkie kontenery dzialaja."; else warn "Ktorys kontener nie wstal:"; compose ps; fi
if [ "$interfejs_up" = "1" ]; then good "Aplikacja odpowiada pod http://127.0.0.1."; else warn "Aplikacja nie odpowiada lokalnie."; fi

# ── 8. Diagnoza, gdy cos nie wstalo ────────────────────────────────────
if [ "$ZDROWE" != "1" ] || [ "$interfejs_up" != "1" ]; then
  step "Diagnoza"
  for usluga in api web proxy realtime; do
    if ! compose ps --format '{{.Service}} {{.State}}' 2>/dev/null | grep -q "^${usluga} running"; then
      bad "Usluga $usluga nie dziala. Ostatnie linie logu:"
      compose logs --tail=15 "$usluga" 2>/dev/null | sed 's/^/    /'
      printf '\n'
    fi
  done
fi

# ── 9. Test dymny Django ───────────────────────────────────────────────
step "Test dymny"
compose exec -T api python manage.py sprawdz || warn "Test dymny zgloszil bledy — patrz komunikat wyzej."

# ── 10. Podsumowanie ───────────────────────────────────────────────────
step "Gotowe"
ADRES=$(adres_z_env)
printf '%sAdres aplikacji: http://%s%s\n' "$BOLD" "$ADRES" "$OFF"
printf '\n%sCo dalej:%s\n' "$BOLD" "$OFF"
printf '  Stan kontenerow:   sudo docker compose --env-file .env -f infra/docker-compose.prod.yml ps\n'
printf '  Logi na zywo:      sudo docker compose --env-file .env -f infra/docker-compose.prod.yml logs -f\n'
printf '  Ponowne wdrozenie: bash scripts/uruchom.sh\n'
printf '\n%sCzego ten skrypt nie zrobil:%s wystawienia portow 80 i 443\n' "$YELLOW" "$OFF"
printf 'w panelu Oracle (Security List). Jesli strona sie nie otwiera, to jest\n'
printf 'pierwsze miejsce do sprawdzenia.\n'
if printf '%s' "$ADRES" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  printf '\n%sBez domeny nie ma HTTPS, wiec logowanie nie zadziala — ciasteczko\n' "$YELLOW" "$OFF"
  printf 'sesji leci tylko po HTTPS. Zobaczysz aplikacje, ale nie zalozysz konta.\n'
fi
printf '\n'
