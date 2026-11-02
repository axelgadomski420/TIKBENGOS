# Licencje siedmiu repozytoriów

Ten dokument opisuje **stan odczytany z `THIRD_PARTY.md`** w tym repozytorium.
Nie weryfikowałem niezależnie plików `LICENSE` w siedmiu repozytoriach
źródłowych. Oznaczenie „POTWIERDZONA” znaczy: treść `THIRD_PARTY.md` podaje
licencję i nie oznacza jej jako niepotwierdzonej. „NIEPOTWIERDZONA” znaczy:
brak danych albo jawna adnotacja o niepotwierdzeniu.

**To nie jest porada prawna.**

| Repozytorium | Licencja wg `THIRD_PARTY.md` | Status | Uwaga |
|---|---|---|---|
| `TIKTAK` | MIT | **POTWIERDZONA** | Kod własny; modele danych i uprawnienia przepisywane na API i React |
| `TIKMIG` | **brak pliku licencji** | **POTWIERDZONA** (brak) | Przed wydaniem trzeba dodać `LICENSE`; to repozytorium ma największy zakres przenoszonego kodu |
| `TIKMORS` | CC0-1.0 | **POTWIERDZONA** | Kod oddany do domeny publicznej; nie nakłada ograniczeń |
| `TIKMESS` | **niepotwierdzona** | **NIEPOTWIERDZONA** | Plan nie przenosi tego kodu, tylko zachowanie; status trzeba potwierdzić przed skopiowaniem czegokolwiek |
| `TIKMUSIC` | MIT (kod); wagi mają osobne warunki | **POTWIERDZONA** dla kodu | `TIKMUSIC/LICENSE_weights` opisuje warunki wag AudioCraft; przed użyciem komercyjnym trzeba go przeczytać |
| `TIKAL` | MIT, copyright Vinta Software | **POTWIERDZONA** | `django-ai-assistant` jako zależność pip |
| `TIKGIT` | Apache-2.0 | **POTWIERDZONA** | Aider jako narzędzie w sandboxie |

## Co pozostaje otwarte

1. `TIKMIG` nie ma pliku licencji — dodać przed publicznym wydaniem.
2. `TIKMESS` ma status niepotwierdzony — potwierdzić przed skopiowaniem kodu.
3. Odtworzyć historię wszystkich siedmiu repozytoriów przy scalaniu, żeby
   przypisanie autorstwa było widoczne w logu.
4. Uzupełnić `THIRD_PARTY.md` o pełną listę zależności z `pyproject.toml`
   i `package.json` po Etapie 2.

**To nie jest porada prawna.**
