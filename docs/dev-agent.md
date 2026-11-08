# BENGOS Dev — worker agenta kodującego

Dokument prawdy o tym, co ten worker robi, czego nie robi i jakich warunków
wymaga. Zasada jak w `docs/stage-1.md`: nie dopisuj tu niczego, czego nie ma
w kodzie.

---

## 1. Czym ten worker jest

`services/code-worker` to **osobny serwis**, który bierze zlecenie w kształcie
kontraktu BENGOS Dev (`packages/core/src/projects.ts`), prowadzi agenta przez
plan zmian i zwraca plan oraz patch.

Kontrakt już istnieje i ten worker go nie zmienia:

| Typ z kontraktu | Co opisuje |
| --- | --- |
| `ChangePlan` | propozycja zmian: `summary`, `steps`, `filesTouched`, `state` |
| `PlanStep` | jeden krok: `description`, `status`, `output` |
| `PlanState` | `drafting` → `awaiting-approval` → `approved` / `rejected` / `applied` / `failed` |
| `ApprovePlanRequest` | zatwierdzenie wymaga pola `confirm` = `create-branch-and-pull-request` |
| `CodeOperation` | dziennik operacji na kodzie — trwały, nieusuwalny |

Agent pochodzi z `github.com/axelgadomski420/TIKCODING` — forka **Self-Improving
Coding Agent** (Maxime Robeyns, Martin Szummer, Laurence Aitchison; ICLR 2025
Workshop on Scaling Self-Improving Foundation Models). To nie biblioteka, nie
API i nie SDK: to eksperyment badawczy uruchamiany lokalnie, w kontenerze,
z kluczami dostawców w zmiennych środowiskowych. Dlatego ten worker jest
**opakowaniem**, a nie importem.

---

## 2. Dlaczego osobny proces, a nie część API

`README` TIKCODING mówi to wprost, wielkimi literami: agent wykonuje polecenia
powłoki, więc uruchamiaj go **wyłącznie w kontenerze**, bo inaczej grzebie
w systemie plików hosta.

Gdyby agent chodził w procesie Django, jedno jego polecenie sięgałoby do bazy
Django i do kluczy dostawców użytkowników. Osobny kontener z własnym systemem
plików to nie wygoda, a warunek, bez którego ten moduł nie może istnieć.

Brief BENGOS-a mówi to samo: „agent kodujący w piaskownicy — nigdy jako proces
serwerowy z tokenem użytkownika".

---

## 3. Kontrakt wejścia i wyjścia

### Wejście (JSON na `stdin` albo przez `--input`)

```json
{
  "request": "opis funkcji od użytkownika",
  "repositoryId": "uuid z połączenia w module Dev",
  "repoUrl": "https://github.com/owner/name",
  "branch": "main"
}
```

Zasady:
- `request` jest wymagane, maks. 4000 znaków,
- `repositoryId` i `repoUrl` są wymagane — worker **nie zgaduje** repozytorium,
- `repoUrl` musi zaczynać się od `https://github.com/` — worker nie klonuje
  adresów spoza GitHuba. Powód ten sam co w `accounts/providers.py`: adres
  pochodzi z katalogu, nie z wejścia.

### Wyjście — sukces

```json
{
  "plan": {
    "id": "uuid",
    "repositoryId": "uuid",
    "request": "opis funkcji",
    "summary": "jedno zdanie, co zostanie zmienione",
    "steps": [{ "id": "step-1", "description": "…", "status": "pending", "output": null }],
    "filesTouched": ["ścieżka/pliku"],
    "state": { "state": "awaiting-approval" },
    "createdAt": "2026-11-08T00:00:00Z"
  },
  "fileTree": "…"
}
```

### Wyjście — błąd

Zawsze w kształcie `ApiError` z kontraktu, ten sam co w każdym innym punkcie API:

```json
{ "code": "unavailable", "message": "…" }
```

Kody: `bad_request`, `not_found`, `internal`, `unavailable`.
Nigdy nie zwraca stosu wywołań — w środowisku produkcyjnym to wyciek,
nie informacja. Ta sama zasada co `handler(Exception)` w `tikbengos/urls.py`.

---

## 4. Zmienne środowiskowe

| Zmienna | Wymagana | Do czego |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` | **tak, jedna z nich** | agent bez modelu nie zrobi kroku |
| `GITHUB_READ_TOKEN` | nie | klonowanie prywatnych repozytoriów; bez niego tylko publiczne |
| `CODE_AGENT_AVAILABLE` | tak, `=1` | potwierdza, że obraz z agentem jest podniesiony |

Bez klucza dostawcy worker **odmawia startu z wyjaśnieniem**, a nie pada
w połowie drogi. To ten sam wzorzec co `validate_credential()`.

---

## 5. Czego ten worker NIE robi

- **Nie woła API GitHub po zapisy.** Gałąź, commit i pull request powstają
  w `services/api`, gdzie jest token użytkownika i gdzie każda operacja ląduje
  w dzienniku audytu (`CodeOperation`). Worker zwraca plan i patch — zapis
  jest po stronie API, po zatwierdzeniu przez człowieka.
- **Nie zapisuje niczego bez zatwierdzenia.** Kontrakt ma stan
  `awaiting-approval`, więc pierwszy krok to **tylko plan**: nic nie jest
  zmieniane, nic nie jest uruchamiane. `ApprovePlanRequest` wymaga pola
  `confirm` z konkretną wartością — bez tego API odmawia.
- **Nie przyjmuje klucza od użytkownika.** Klucz modelu jest po stronie
  serwera. Wzięcie go z formularza oznaczałoby, że agent w piaskownicy
  dostaje sekret z przeglądarki.
- **Nie klonuje spoza GitHuba.** Adres musi zaczynać się od
  `https://github.com/`.
- **Nie loguje tokenu.** Wyjście `git` jest czyszczone z tokenu, zanim trafi
  do komunikatu — wyciek tokenu w błędzie to wyciek tokenu.

---

## 6. Limity

| Limit | Wartość | Dlaczego |
| --- | --- | --- |
| Kroków w planie | 12 | plan dłuższy niż 12 kroków przestaje być planem, a staje się opisem |
| Kroków wykonania | 40 | agent bez limitu pracuje godzinami |
| Czas kroku | 300 s | model, który milczy, nie może trzymać workera |
| Czas zlecenia | 1800 s | 30 minut na jedno zlecenie |
| Rozmiar patcha | 512 kB | większa zmiana idzie na mniejsze zadania |
| Długość opisu | 4000 znaków | opis dłuższy niż to jest już specyfikacją, nie zleceniem |

Wartości dobrane do darmowej maszyny ARM (2 rdzenie, 24 GB), a nie do maszyny
deweloperskiej.

---

## 7. Stan wdrożenia — ODCZYTANY, NIE ZGADYWANY

| Element | Stan |
| --- | --- |
| `packages/core/src/projects.ts` | istnieje, kontrakt kompletny |
| `services/code-worker/` | **tylko `.gitkeep`** — katalog zarezerwowany, pusty |
| `worker.py` | **napisany, wypchnięty** — pełna ścieżka planu |
| `services/code-worker/Dockerfile` | **nie istnieje** |
| obraz z agentem | **nie istnieje** |
| wywołanie modelu | **nie podłączone** — patrz komentarz w `run_agent_plan` |
| usługa w `docker-compose.prod.yml` | **nie dodana** |

### Co to znaczy dla użytkownika

Worker **przyjmuje zlecenia i ma pełną ścieżkę planu**, ale zwraca
`unavailable` z wyjaśnieniem, dopóki obraz z agentem nie jest podniesiony.
To jest celowe: wołanie agenta, którego nie ma, zwróciłoby „command not found",
a to dokładnie ta atrapa, której brief zakazuje.

**Jedno miejsce do zmiany**, gdy obraz będzie gotowy: blok oznaczony
komentarzem w `run_agent_plan()`. Ścieżka jest tam wypisana.

---

## 8. Kolejność prac

1. **`services/code-worker/Dockerfile`** — obraz z Pythonem 3.12, `git`,
   zależnościami agenta i samym workerem. Bez niego nie ma czego uruchomić.
2. **`requirements.txt`** — zależności agenta z `TIKCODING/base_agent/requirements.txt`.
3. **Usługa w `infra/docker-compose.prod.yml`** — osobny kontener, **bez**
   portów na zewnątrz, **bez** dostępu do sieci z bazą, z wolumenem na
   katalog pracy.
4. **Podłączenie wywołania agenta** — jedno miejsce, opisane w kodzie.
5. **Endpointy w `services/api`** — `POST /v1/git/plans`, `POST /v1/git/plans/{id}/approve`,
   zapis `CodeOperation` przy każdej operacji.
6. **Ekran w `apps/web/src/app/dev`** — dziś ekran zastępczy; dostaje listę
   planów, podgląd kroków i przycisk zatwierdzenia.

Kroki 1–4 to praca nad jednym kontenerem. Kroki 5–6 to moduł Dev w interfejsie.

---

## 9. Czego ten dokument świadomie nie obiecuje

- **Nie ma gwarancji, że agent napisze poprawny kod.** To eksperyment
  badawczy. Dlatego plan jest zatwierdzany przez człowieka, a każda operacja
  ląduje w dzienniku.
- **Nie ma testów.** Ich nie ma w tym etapie i ten dokument tego nie ukrywa.
- **Nie ma porównania z Aiderem.** Brief wymienia Aidera jako warstwę agenta
  w `TIKGIT`. TIKCODING to inny wybór i wymaga Twojej decyzji: **Aider czy
  TIKCODING**. Ten worker jest napisany tak, że podmiana agenta to jedno
  miejsce w `run_agent_plan()`.
