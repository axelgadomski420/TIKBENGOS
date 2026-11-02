# Dostępność w TIKBENGOS

Dostępność nie jest warstwą dokładaną na koniec. Jest warunkiem odbioru każdego ekranu
przed scaleniem, nie zadaniem do zrobienia „kiedyś”.

## Minimum

**WCAG 2.2 AA** — nie jako deklaracja, ale jako próg egzekwowany testem.

Kontrast jest sprawdzany automatycznie w `packages/ui/colors.test.ts`. Każda para
kolorów tekstu i tła w każdym motywie musi przekraczać 4,5:1 dla tekstu zwykłego
i 3:1 dla tekstu dużego. Test przechodzi albo zmiana nie wchodzi. Kolor, który
dobrze wygląda i nie przechodzi progu, jest odrzucany — to jest cały sens testu.

## Wymagania, które muszą być spełnione na każdym ekranie

- **Pełna obsługa klawiatury.** Każda rzecz klikalna jest osiągalna klawiaturą,
  kolejność fokusu idzie za kolejnością czytania, fokus nigdy nie ucieka do pułapki.
- **Widoczny stan fokusu.** Token `bengos-focus-ring` w każdym motywie.
- **Poszanowanie ograniczenia ruchu.** Przy `prefers-reduced-motion: reduce`
  tokeny `bengos-motion-fast` i `bengos-motion-smooth` schodzą do 1 ms.
  Animacja staje się natychmiastowa — nigdy znikająca funkcja.
- **Treści nietekstowe mają opis.** Dekoracja jest ukryta przed czytnikiem ekranu,
  a każda ikona przenosząca znaczenie ma dostępną nazwę.
- **Komunikaty dla czytnika ekranu.** Każda zmiana stanu wywołana akcją użytkownika
  jest ogłaszana przez region `aria-live`.

## Kanały dostępności docelowe

| Kanał | Stan | Gdzie |
| --- | --- | --- |
| Napisy generowane automatycznie i edytowalne | Etap 2 | `services/api` + `services/ai-worker` |
| Transkrypcja każdego wideo | Etap 2 | razem z napisami |
| Synteza mowy (TTS) dla postów, czatu i interfejsu | Etap 4 | `packages/accessibility` |
| Pisanie głosem (STT) | Etap 4 | `packages/accessibility` |
| Tryb „tylko dźwięk” i „tylko tekst” | Etap 4 | `apps/web` |
| Morse przez wibracje jako kanał alertów | Etap 4 | `packages/accessibility` |
| Język migowy — rozpoznawanie | Etap 4 | `services/sign-worker` |
| Tryb dostępności: większa typografia, uproszczony interfejs, sterowanie głosem | Częściowo w Etapie 1 | `apps/web` + tokeny `packages/ui` |

## Język migowy — zakres, który wolno obiecać

Model przenoszony z `TIKMIG` to zwycięzca konkursu Kaggle ASL Signs. Rozpoznaje
250 znaków amerykańskiego języka migowego. Osiąga 76% trafności pierwszego wyboru
i 91% w piątce najlepszych na klipach spoza zbioru treningowego.

Czego **nie** robi:

- Nie rozpoznaje polskiego języka migowego. Nie istnieje wytrenowany model PJM,
  który dałoby się tu wstawić, i plan go nie zakłada.
- Nie segmentuje ciągłego migania. System wykrywa pojedyncze znaki w oknie czasowym;
  zdania wymagają innego podejścia i nie są obiecywane.
- Kierunek „tekst na mig” to odtwarzanie nagranych klipów, nie generacja ruchu.

Interfejs musi to mówić wprost na ekranie modułu. Obietnica pełnego tłumaczenia PJM,
złożona bez wytrenowanego modelu, byłaby nieprawdą.
