#!/usr/bin/env python3
"""Ollama Coder agent for BENGOS Dev.

Takes a request (from Phi-4 Mini assistant or user) and uses local
qwen2.5-coder:3b to produce a change plan. No external API keys needed.
"""

from __future__ import annotations

import json
import os
import urllib.request
import urllib.error

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
CODER_MODEL = os.environ.get("CODER_MODEL", "qwen2.5-coder:3b")

SYSTEM = (
    "You are a coding agent for the BENGOS project. "
    "You receive a feature request and a file tree. "
    "Reply ONLY with a JSON object: "
    '{"summary": "one sentence", "steps": [{"description": "...", "files": ["path"]}], "filesTouched": ["path"]}. '
    "Do not write code. Do not explain. Only the JSON plan."
)


def call_coder(prompt: str, timeout: int = 180) -> str:
    """Call local Ollama coder model."""
    payload = json.dumps({
        "model": CODER_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "options": {"temperature": 0.3},
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        raise RuntimeError(f"Coder model unavailable: {exc}") from exc

    message = data.get("message") or {}
    content = str(message.get("content") or "").strip()
    if not content:
        raise RuntimeError("Coder returned empty response")
    return content


def make_plan(request: str, file_tree: str) -> dict:
    """Build a change plan from a request + file tree using the coder."""
    user_prompt = (
        f"REQUEST:\n{request}\n\nFILE TREE:\n{file_tree}\n\n"
        "Return only the JSON plan."
    )
    raw = call_coder(user_prompt)

    # Strip markdown fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        cleaned = cleaned.rsplit("```", 1)[0]

    try:
        plan = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Coder did not return valid JSON: {exc}. Raw: {raw[:200]}") from exc

    if not isinstance(plan, dict) or "summary" not in plan:
        raise RuntimeError("Coder plan missing summary")

    return plan


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python ollama_agent.py 'request text'")
        sys.exit(1)
    tree = "(no tree provided)"
    plan = make_plan(sys.argv[1], tree)
    print(json.dumps(plan, indent=2, ensure_ascii=False))
