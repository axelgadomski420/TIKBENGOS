#!/usr/bin/env bash
# Start AI worker on Oracle.
# Asystent = phi4-mini
# Dev (agent kodujący) = qwen2.5-coder:3b
#
# Run from repo root on the Oracle machine.
set -euo pipefail

export OLLAMA_URL="http://127.0.0.1:11434"
export ASSISTANT_MODEL="phi4-mini"
export CODER_MODEL="qwen2.5-coder:3b"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:8001}"
export BENGOS_WORKER_TOKEN="${BENGOS_WORKER_TOKEN:-change-me-in-production}"

echo "=== Modele ==="
echo "Asystent: $ASSISTANT_MODEL"
echo "Dev/Coder: $CODER_MODEL"
echo

echo "Checking Ollama..."
curl -fsS "$OLLAMA_URL/api/tags" | head -c 400 || { echo "Ollama not running. Start with: ollama serve &"; exit 1; }

echo
echo "Starting AI worker on :8000 (phi4-mini)"
cd "$(dirname "$0")"
python3 worker.py
