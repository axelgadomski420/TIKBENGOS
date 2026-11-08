# BENGOS MusicGen Worker

Usługa przyjmująca zlecenia generacji muzyki z API TIKBENGOS i oddająca
gotowy WAV przez endpoint zwrotny.

## Wymagania (uczciwie)

- Maszyna z GPU (domyślnie wymagana — bez niej worker odrzuca zlecenie
  z jasnym komunikatem zamiast liczyć godziny; wymuszenie CPU:
  `MUSICGEN_REQUIRE_GPU=0`).
- `pip install -r requirements.txt` — torch + transformers (kilka GB).
- Token: `BENGOS_WORKER_TOKEN` — TEN SAM sekret co w API.
- GPU 16 GB dla `musicgen-medium`/`musicgen-melody`; `musicgen-small`
  działa na 8 GB.

## Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `BENGOS_API_URL` | `http://127.0.0.1:8000` | Adres API (endpoint zwrotny) |
| `BENGOS_WORKER_TOKEN` | — | Wspólny sekret (wymagany) |
| `MUSICGEN_LISTEN_HOST` | `127.0.0.1` | Host nasłuchu |
| `MUSICGEN_LISTEN_PORT` | `8090` | Port nasłuchu |
| `MUSICGEN_REQUIRE_GPU` | `1` | Odmawiaj bez CUDA |

## Uruchomienie

```bash
pip install -r requirements.txt
BENGOS_API_URL=http://92.5.154.243:8000 \
BENGOS_WORKER_TOKEN=$BENGOS_WORKER_TOKEN \
python worker.py
```

W API ustaw `MUSICGEN_ENDPOINT=http://127.0.0.1:8090/jobs` (adres tej
usługi z perspektywy serwera API).

## Jak to działa

1. API tworzy zadanie (202) i POSTuje je na `MUSICGEN_ENDPOINT`.
2. Worker odkłada zlecenie do kolejki i melduje `running`.
3. Po generacji składa 30-sekundowe fragmenty w jeden WAV i POSTuje
   multipart na `/v1/music/jobs/{id}/complete` z sekretem
   `X-Bengos-Worker`.
4. API zapisuje utwór do biblioteki właściciela z licencją CC-BY 4.0
   (wagi modelu) i domyka zadanie stanem `succeeded`.

Nie ma tu kolejki Redisa ani bazy: kolejka w pamięci procesu znika przy
restarcie, ale zlecenia w API zostają w stanie `queued` i można je
powtórzyć — worker nie jest źródłem prawdy, tylko wykonawcą.
