#!/usr/bin/env bash
# Start AI worker on Oracle with local Ollama (Phi-4 Mini).
# Run from repo root on the Oracle machine.
set -euo pipefail

export OLLAMA_URL="http://127.0.0.1:11434"
export ASSISTANT_MODEL="phi4-mini"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:8001}"
export BENGOS_WORKER_TOKEN="${BENGOS_WORKER_TOKEN:-change-me-in-production}"

echo "Checking Ollama..."
curl -fsS "$OLLAMA_URL/api/tags" | head -c 200 || { echo "Ollama not running. Start with: ollama serve &"; exit 1; }

echo "Starting AI worker on :8000"
cd "$(dirname "$0")"
python3 worker.py
