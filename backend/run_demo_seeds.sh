#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MYSQL_BIN="${MYSQL_BIN:-mysql}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-Elif}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

SEED_FILES=(
  "user_demo_seed.sql"
  "community_demo_seed.sql"
  "pet_profile_demo_seed.sql"
  "adoption_demo_seed.sql"
  "marketplace_demo_seed.sql"
  "pet_transit_demo_seed.sql"
)

if ! command -v "$MYSQL_BIN" >/dev/null 2>&1; then
  echo "Error: mysql client not found (MYSQL_BIN=$MYSQL_BIN)." >&2
  exit 1
fi

MYSQL_ARGS=(-h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")
if [[ -n "$DB_PASSWORD" ]]; then
  MYSQL_ARGS+=("-p${DB_PASSWORD}")
fi
MYSQL_ARGS+=("$DB_NAME")

echo "Seeding database '$DB_NAME' on ${DB_HOST}:${DB_PORT} as user '$DB_USER'"

for seed_file in "${SEED_FILES[@]}"; do
  seed_path="$SCRIPT_DIR/$seed_file"

  if [[ ! -f "$seed_path" ]]; then
    echo "Error: missing seed file $seed_path" >&2
    exit 1
  fi

  echo "Applying $seed_file ..."
  "$MYSQL_BIN" "${MYSQL_ARGS[@]}" < "$seed_path"
  echo "Applied $seed_file"
  echo

done

echo "All seeds applied successfully."
