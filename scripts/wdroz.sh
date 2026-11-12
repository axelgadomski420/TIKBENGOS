#!/usr/bin/env bash
# Jedna komenda na Ubuntu (Oracle Cloud, aarch64 albo x86_64).
# Katalog docelowy: ~/TIKBENGOS
# Nie nadpisuje istniejącego .env.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/TIKBENGOS}"
REPO="${REPO:-https://github.com/axelgadomski420/TIKBENGOS.git}"

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  else
    sudo docker "$@"
  fi
}

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
git pull --ff-only origin main

if [[ ! -f .env ]]; then
  cp .env.example .env
  if command -v openssl >/dev/null 2>&1; then
    pass="$(openssl rand -hex 18)"
    sed -i "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=${pass}/" .env
  fi
  echo "Utworzono $APP_DIR/.env — uzupełnij klucze, jeśli ich potrzebujesz."
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

docker_cmd compose up -d --build

echo "Czekam na GET /elif/api/health ..."
ok=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${HTTP_PORT:-80}/elif/api/health" >/dev/null; then
    ok=1
    break
  fi
  sleep 5
done

if [[ "$ok" != 1 ]]; then
  echo "API jeszcze nie odpowiada. Logi: docker compose logs --tail=80 api" >&2
  exit 1
fi

curl -fsS "http://127.0.0.1:${HTTP_PORT:-80}/elif/api/health"
echo
echo "PURRE PETS stoi na porcie ${HTTP_PORT:-80}."
