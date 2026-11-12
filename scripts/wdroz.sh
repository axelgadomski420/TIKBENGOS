#!/usr/bin/env bash
# Jedna komenda na Ubuntu (Oracle Cloud, aarch64 albo x86_64).
# Katalog: ~/TIKBENGOS. Istniejące niepuste klucze w .env zostają.
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

env_get() {
  local key="$1"
  if [[ -f .env ]]; then
    grep -m1 -E "^(export )?${key}=" .env | sed -E "s/^(export )?${key}=//" || true
  fi
}

env_set() {
  local key="$1"
  local value="$2"
  touch .env
  if grep -q -E "^(export )?${key}=" .env; then
    sed -i -E "s|^(export )?${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

ensure_key() {
  local key="$1"
  local value="$2"
  local current
  current="$(env_get "$key")"
  if [[ -z "$current" ]]; then
    env_set "$key" "$value"
  fi
}

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
git pull --ff-only origin main

fresh_mysql=0
if [[ -z "$(env_get MYSQL_ROOT_PASSWORD)" ]]; then
  inherited=""
  for legacy in MYSQL_PASSWORD DB_PASSWORD MYSQL_PWD DATABASE_PASSWORD; do
    inherited="$(env_get "$legacy")"
    if [[ -n "$inherited" ]]; then
      env_set MYSQL_ROOT_PASSWORD "$inherited"
      echo "MYSQL_ROOT_PASSWORD wzięte ze starego klucza ${legacy}. Wolumen MySQL zostaje."
      break
    fi
  done
  if [[ -z "$(env_get MYSQL_ROOT_PASSWORD)" ]]; then
    fresh_mysql=1
    if command -v openssl >/dev/null 2>&1; then
      env_set MYSQL_ROOT_PASSWORD "$(openssl rand -hex 18)"
    else
      env_set MYSQL_ROOT_PASSWORD "purre-$(date +%s)-$(od -An -N4 -tx1 /dev/urandom | tr -d ' ')"
    fi
    echo "Dopisano MYSQL_ROOT_PASSWORD do $APP_DIR/.env (stary plik nie miał hasła, MySQL przez to nie wstawał)."
  fi
fi

ensure_key HTTP_PORT 80
ensure_key APP_FRONTEND_BASE_URL "http://127.0.0.1"
ensure_key APP_BACKEND_BASE_URL "http://127.0.0.1/elif"
ensure_key APP_WS_ALLOWED_ORIGIN_PATTERNS "*"

# Stary stos (proxy, redis, ollama, db) trzymał port 80 i zostawiał osierocone kontenery.
docker_cmd compose down --remove-orphans || true
docker_cmd rm -f tikbengos-mysql-1 tikbengos-proxy-1 tikbengos-db-1 tikbengos-redis-1 tikbengos-ollama-1 tikbengos-realtime-1 tikbengos-ai-worker-1 >/dev/null 2>&1 || true

if [[ "$fresh_mysql" == 1 ]]; then
  # Start bez hasła nie inicjuje bazy, ale zostawia niedokończony wolumen i healthcheck wisi na -p.
  docker_cmd volume rm tikbengos_mysql-data >/dev/null 2>&1 || true
  docker_cmd volume rm TIKBENGOS_mysql-data >/dev/null 2>&1 || true
fi

docker_cmd compose up -d --build --force-recreate --remove-orphans

http_port="$(env_get HTTP_PORT)"
http_port="${http_port:-80}"

echo "Czekam na GET /elif/api/health ..."
ok=0
for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:${http_port}/elif/api/health" >/dev/null; then
    ok=1
    break
  fi
  sleep 5
done

if [[ "$ok" != 1 ]]; then
  echo "API jeszcze nie odpowiada." >&2
  docker_cmd compose ps >&2 || true
  docker_cmd compose logs --tail=80 mysql api web >&2 || true
  exit 1
fi

curl -fsS "http://127.0.0.1:${http_port}/elif/api/health"
echo
echo "PURRE PETS stoi na porcie ${http_port}."
