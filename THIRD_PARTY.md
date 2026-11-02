# Zależności zewnętrzne i ich licencje

Ten plik nie jest poradą prawną. To inwentarz tego, co TIKBENGOS faktycznie
używa, i co trzeba domknąć przed pierwszym publicznym wydaniem.

## Kod pochodzący z dawnych repozytoriów, użyty jako zależność

| Projekt | Źródło w Twoim koncie | Licencja | Jak wchodzi do TIKBENGOS |
| --- | --- | --- | --- |
| Audiocraft (MusicGen, JASCO, MAGNeT) | `TIKMUSIC` | MIT, copyright Meta Platforms, Inc. | biblioteka instalowana na `services/music-worker` |
| django-ai-assistant | `TIKAL` | MIT, Vinta Software | zależność pip w `services/api` i `services/ai-worker` |
| Aider | `TIKGIT` | Apache-2.0 | narzędzie w sandboxie `services/code-worker` |

Waga modelu ma osobne warunki: `TIKMUSIC/LICENSE_weights` opisuje zasady użycia
wytrenowanych checkpointów. Warunki wag AudioCraft dopuszczają użycie badawcze
i zabraniają użycia komercyjnego w części przypadków — **przeczytaj ten plik
przed uruchomieniem MusicGen w produkcie komercyjnym.** To jest jedyne miejsce
w całym stosie, gdzie licencja kodu i licencja wag się różnią.

## Kod własny przenoszony do TIKBENGOS

| Źródło | Licencja w repozytorium źródłowym | Uwaga |
| --- | --- | --- |
| `TIKTAK` | MIT | modele danych, uprawnienia — przepisywane na API i React |
| `TIKMIG` | **brak pliku licencji** | kod własny; przed wydaniem dodaj `LICENSE` w tym repozytorium |
| `TIKMORS` | CC0-1.0 | kod oddany do domeny publicznej; nie nakłada ograniczeń |
| `TIKMESS` | **niepotwierdzona** | dziedziczona po oryginalnym projekcie; plan nie przenosi tego kodu, tylko zachowanie |

## Co trzeba zamknąć przed publicznym wydaniem

1. Dodaj `LICENSE` do `TIKMIG` — dziś to repozytorium nie ma żadnej licencji,
   a jego kod jest przenoszony do TIKBENGOS w największym zakresie z całej siódemki.
2. Ustal status licencji `TIKMESS`. Plan zakłada, że ten kod nie wchodzi do
   TIKBENGOS — czat jest przepisywany na modelach danych z `TIKTAK` — więc
   problem może zniknąć sam, ale trzeba to potwierdzić, zanim cokolwiek z niego
   zostanie skopiowane.
3. Odtwórz historię wszystkich siedmiu repozytoriów przy scalaniu, żeby
   przypisanie autorstwa było widoczne w logu TIKBENGOS.
4. Uzupełnij ten plik o pełną listę zależności z `pyproject.toml` i `package.json`
   po Etapie 2, kiedy lista się ustabilizuje.
