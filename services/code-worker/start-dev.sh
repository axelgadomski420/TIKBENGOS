#!/usr/bin/env bash
# Start Dev coding agent on Oracle.
# Asystent (phi4-mini) generuje prompty → Coder (qwen2.5-coder:3b) robi plany.
set -euo pipefail

export OLLAMA_URL="http://127.0.0.1:11434"
export CODER_MODEL="qwen2.5-coder:3b"
export CODE_AGENT_AVAILABLE=1

echo "=== Dev Agent ==="
echo "Coder: $CODER_MODEL"
echo "Ollama: $OLLAMA_URL"
echo

# Quick check
curl -fsS "$OLLAMA_URL/api/tags" | grep -q "qwen2.5-coder" || {
  echo "Coder not found. Run: ollama pull qwen2.5-coder:3b"
  exit 1
}

echo "Coder ready. Use /dev in the app or call ollama_agent.py directly."
echo
echo "Test plan:"
python3 "$(dirname "$0")/ollama_agent.py" "Dodaj przycisk eksportu do ustawień"
