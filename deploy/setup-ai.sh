#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/purre-pets}"
if ! command -v ollama >/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
systemctl enable ollama
systemctl start ollama
ollama pull qwen2.5:3b
echo "Ollama + Qwen2.5:3b gotowe"
