#!/usr/bin/env bash
# Jedno wdrożenie Bengos.PL: kod z GitHuba, Ollama na hoście, Docker, migracje.
# Wklej na serwerze Ubuntu albo: bash scripts/wdroz.sh
set -euo pipefail

DOMAIN="${TIKBENGOS_DOMAIN:-bengos.pl}"
EMAIL="${TIKBENGOS_ACME_EMAIL:-axelgadomski@gmail.com}"
DIR="${TIKBENGOS_DIR:-$HOME/TIKBENGOS}"
REPO="https://github.com/axelgadomski420/TIKBENGOS.git"

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

echo "==> Narzędzia"
if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq git ca-certificates curl
fi

echo "==> Kod $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin main
  git -C "$DIR" checkout main
  git -C "$DIR" pull --ff-only origin main
else
  git clone --depth 1 --branch main "$REPO" "$DIR"
fi
cd "$DIR"

echo "==> Ollama na hoście (modele już zainstalowane zostają)"
if command -v ollama >/dev/null 2>&1 || [ -x /usr/local/bin/ollama ]; then
  $SUDO mkdir -p /etc/systemd/system/ollama.service.d
  printf '%s\n' '[Service]' 'Environment=OLLAMA_HOST=0.0.0.0:11434' | $SUDO tee /etc/systemd/system/ollama.service.d/override.conf >/dev/null
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable ollama >/dev/null 2>&1 || true
  $SUDO systemctl restart ollama || true
  if command -v ollama >/dev/null 2>&1; then
    ollama list 2>/dev/null | grep -qi 'phi4' || ollama pull phi4-mini || true
    ollama list 2>/dev/null | grep -qi 'qwen2.5-coder' || ollama pull qwen2.5-coder:7b || true
  fi
else
  echo "    Brak ollammy na hoście. Asystent na Oracle wstanie, gdy ją doinstalujesz."
fi

echo "==> Wdrożenie $DOMAIN"
export TIKBENGOS_NONINTERACTIVE=1
export TIKBENGOS_DOMAIN="$DOMAIN"
export TIKBENGOS_ACME_EMAIL="$EMAIL"
bash scripts/deploy.sh

if [ -f .env ]; then
  changed=0
  grep -q '^OLLAMA_URL=' .env || { echo 'OLLAMA_URL=http://host.docker.internal:11434' >> .env; changed=1; }
  grep -q '^ASSISTANT_MODEL=' .env || { echo 'ASSISTANT_MODEL=phi4-mini' >> .env; changed=1; }
  if [ "$changed" = 1 ]; then
    echo "==> Dopisane OLLAMA_URL i ASSISTANT_MODEL, podnoszę stos"
    docker compose --env-file .env -f infra/docker-compose.prod.yml up -d
  fi
fi

echo "==> Gotowe: https://$DOMAIN"
