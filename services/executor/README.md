# BENGOS Executor (Aider)

Usługa wykonująca ZATWIERDZONE plany zmian: klonuje repozytorium,
każe Aiderowi napisać kod, wypycha gałąź i zakłada pull requesta.
Do gałęzi głównej nie wchodzi nic bez przejrzenia przez człowieka —
to zasada z audytu, wbudowana w kod.

## Wymagania (uczciwie)

- `git` w PATH oraz `aider` (`pip install -r requirements.txt`).
- Model LLM: przez `OPENAI_API_KEY` albo lokalne Ollama
  (`OLLAMA_API_BASE=http://127.0.0.1:11434` + `AIDER_MODEL=ollama_chat/qwen2.5-coder:7b`).
- `GITHUB_TOKEN` z prawem push do repozytoriów, które wykonujesz.
- `BENGOS_WORKER_TOKEN` — TEN SAM sekret co w API.

## Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `BENGOS_API_URL` | `http://127.0.0.1:8000` | Adres API (endpoint zwrotny) |
| `BENGOS_WORKER_TOKEN` | — | Wspólny sekret (wymagany) |
| `GITHUB_TOKEN` | — | Token z prawem push (wymagany) |
| `AIDER_MODEL` | `gpt-4o-mini` | Model dla Aidera |
| `EXECUTOR_LISTEN_HOST` | `127.0.0.1` | Host nasłuchu |
| `EXECUTOR_LISTEN_PORT` | `8091` | Port nasłuchu |
| `EXECUTOR_BASE_BRANCH` | `main` | Gałąź bazowa pull requestów |
| `EXECUTOR_STEP_TIMEOUT` | `1800` | Limit sekund na krok |

## Uruchomienie

```bash
pip install -r requirements.txt
BENGOS_API_URL=http://92.5.154.243:8000 \
BENGOS_WORKER_TOKEN=$BENGOS_WORKER_TOKEN \
GITHUB_TOKEN=$GITHUB_TOKEN \
AIDER_MODEL=ollama_chat/qwen2.5-coder:7b \
OLLAMA_API_BASE=http://127.0.0.1:11434 \
python executor.py
```

W API ustaw `BENGOS_CODE_EXECUTOR_URL=http://127.0.0.1:8091/jobs`.

## Przepływ

1. Użytkownik zatwierdza plan (`confirm: create-branch-and-pull-request`).
2. API tworzy CodeJob i POSTuje zlecenie na `BENGOS_CODE_EXECUTOR_URL`.
3. Executor melduje `running`, potem oddaje `succeeded` z adresem
   pull requesta, listą plików i streszczeniem — albo `failed` z powodem.
4. Plan w API przechodzi w stan `applied` (albo `failed`), dziennik
   operacji dostaje wpis `plan.applied`/`plan.failed`.

Kolejka jest w pamięci procesu: restart gubi zlecenia NIEWYKONANE,
ale nie te w bazie API — tam zostają w stanie `queued` i da się je
powtórzyć nowym zatwierdzeniem. Piaskownica (docker/bwrap) dojdzie
wokół tego procesu bez zmiany kontraktu — granica jest już wyznaczona
przez endpoint zwrotny.
