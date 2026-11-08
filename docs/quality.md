# Jakość BENGOS — progi mierzalne, nie hasła

Ten dokument odpowiada na jedno pytanie: **co znaczy „na poziomie Apple”
w tym kodzie**. „Apple” i „Meta” nie są kryteriami odbioru — nie da się ich
odhaczyć, nie da się na nich przegrać testu, a dwie osoby czytające ten sam
ekran oceniają je różnie. Poniżej są progi, które da się zmierzyć i które
albo przechodzą, albo nie wchodzą.

Zasada jak w `docs/stage-1.md`: nie dopisuj tu niczego, czego nie ma w kodzie.

---

## 1. Wydajność — progi z briefu, nie moje

Brief wymienia je w Etapie 6 i te wartości są wiążące:

| Miara | Próg | Co to znaczy w praktyce |
| --- | --- | --- |
| **LCP** (Largest Contentful Paint) | **< 2,5 s** | największy element widoczny w 2,5 s na 4G |
| **INP** (Interaction to Next Paint) | **< 200 ms** | reakcja na dotyk w 200 ms |
| **CLS** (Cumulative Layout Shift) | **< 0,1** | treść nie skacze podczas wczytywania |

Trzy rzeczy, które te progi łamią w tym projekcie **już teraz** i które trzeba
naprawić, zanim ktokolwiek powie „dopracowane”:

1. **Grafiki marki jadą z `i.ibb.co`.** To zewnętrzny serwis: dodatkowe
   połączenie TLS, brak kontroli nad rozmiarem i brak `srcset`. Dla LCP to
   najdroższa rzecz na ekranie. Docelowo pliki w `apps/web/public/brand/`
   w formacie AVIF i WebP, z `priority` na znaku.
2. **`<img>` zamiast `next/image` w `login/page.tsx` i na pulpicie.**
   Wyłączone optymalizowanie, brak wariantów szerokości, brak zarezerwowanego
   miejsca → to jest źródło CLS. `next/image` w tym projekcie jest już używane
   w `topbar.tsx` — czyli wzorzec istnieje.
3. **Font systemowy, nie pobierany.** To jest **zaleta**, nie brak:
   `BASE_TYPOGRAPHY` w `packages/ui/src/tokens.ts` używa `ui-sans-serif`
   i `-apple-system`, więc nie ma `@font-face`, nie ma opóźnienia na tekście.
   Nie zamieniaj tego na Google Fonts.

---

## 2. Dostępność — już egzekwowana testem

To jest jedyna rzecz w tym projekcie, która ma **automatyczną bramkę**, a nie
de­klarację. `packages/ui/src/contrast.test.ts` liczy kontrasty metodą WCAG 2.1
i przerywa build, gdy para nie przechodzi.

| Element | Próg |
| --- | --- |
| tekst zwykły | **4,5:1** |
| tekst duży | **3:1** |
| obramowanie, obwódka fokusu | **3:1** |
| cel dotykowy | **44 px** |

Do tego na **każdym** ekranie:

- pełna obsługa klawiatury, kolejność fokusu za kolejnością czytania,
- widoczny stan fokusu — `--bengos-focus-ring`, nigdy `outline: none` bez zamiennika,
- `prefers-reduced-motion` skraca animacje do **1 ms**, ale ich **nie wyłącza**,
- zmiana stanu po akcji użytkownika ogłaszana przez `aria-live`,
- treści nietekstowe z opisem, dekoracja ukryta przed czytnikiem.

Nowe motywy (`nebula`, `paper`) i nowe komponenty **muszą** przejść ten test,
zanim wejdą. To nie jest opinia — to warunek z briefu.

---

## 3. Ruch — liczby, nie wrażenia

Tokeny w `packages/ui/src/tokens.ts`:

| Token | Wartość | Rola |
| --- | --- | --- |
| `motion-fast` | **140 ms** | naciśnięcie, przełączenie |
| `motion-smooth` | **320 ms** | przejście między widokami |
| `motion-enter` | **420 ms** | pierwsze pojawienie się elementu |
| `reduced-motion` | **1 ms** | przy ograniczeniu ruchu |

Czułość Apple bierze się z tego, że przejście trzyma 60 klatek, a nie z tego,
że ma gradient. W praktyce: animuj **wyłącznie** `transform` i `opacity`.
Animowanie `width`, `height`, `top`, `left` albo `box-shadow` wymusza
przeliczenie układu na każdą klatkę — i to jest jedyna przyczyna, dla której
interfejs „szarpie”.

---

## 4. Co odróżnia produkt dopracowany od niedokończonego

Piec rzeczy, które nie są wydajnością ani dostępnością, a decydują o wrażeniu:

**Stan pusty ma wyjście.** Nie „brak danych”, a zdanie, co zrobić, i odnośnik,
który to robi. `feed-list.tsx` to ma: „Nikt jeszcze nic nie napisał. Twój wpis
będzie pierwszy”.

**Błąd mówi, co poszło nie tak, i ma ponowienie.** `ContinueError` w
`continue-card.tsx` ma `role="alert"` **i** przycisk „Spróbuj ponownie”.
„Coś poszło nie tak” bez wyjścia to ślepy zaułek.

**Ekran zastępczy jest uczciwy i ma formę.** `module-placeholder.tsx` mówi
wprost, co powstaje w którym etapie, i prowadzi do pulpitu. Nie udaje, że
działa — i to jest jego wartość.

**Nic nie miga.** Tożsamość jest czytana po stronie serwera i podana jako
wartość początkowa dostawcy, więc nie ma przeskoku „nie zalogowany” →
„zalogowany”.

**Zero atrap.** Żaden przycisk nie jest martwy. Jeśli funkcji nie ma, ekran
mówi o tym zdaniem, a nie przyciskiem, który nic nie robi.

---

## 5. Progi, które ten projekt łamie — z nazwami plików

Uczciwy audyt, nie lista życzeń:

| Plik | Co łamie | Co zrobić |
| --- | --- | --- |
| `apps/web/src/app/login/page.tsx` | `<img>` zamiast `next/image`, grafika z `i.ibb.co` | `next/image` + pliki lokalne |
| `apps/web/src/app/page.tsx` | jak wyżej — tło nagłówka z zewnętrznego hostingu | jak wyżej |
| `packages/ui/src/themes.ts` | `borderStrong` na `surface` w `midnight` = 2,08 przy progu 3,0 | **naprawione** — `#5A6E9E` daje 3,75 |
| cały interfejs | brak pomiaru LCP/INP/CLS | audyt Lighthouse dopiero, gdy grafiki będą lokalne |

---

## 6. Kolejność, która ma sens

Nie „najpierw wszystko naraz”, a jedna rzecz, która odblokowuje następne:

1. **Grafiki do repozytorium** — `apps/web/public/brand/` w AVIF i WebP.
   Odblokowuje LCP i CLS, a przy okazji usuwa zależność od zewnętrznego serwisu.
2. **`next/image` w dwóch plikach** — dwa miejsca, jeden wzorzec, duży efekt.
3. **Audyt Lighthouse** na `/` i `/login` — dopiero teraz wynik jest o czymś.
4. **Piaskownica i podłączenie agenta** — kroki 1–4 z `docs/dev-agent.md`.
5. **Magazyn plików (R2)** — odblokowuje avatar, załączniki i wideo.

Punkt 5 jest największy, ale nie pierwszy: bez pomiaru nie wiadomo, co robić
 dalej, a bez lokalnych grafik pomiar kłamie.

---

## 7. Czego ten dokument nie obiecuje

- **Nie obiecuje, że projekt „przewyższy Apple”.** To nie jest kryterium,
  które da się spełnić albo nie. Da się natomiast: trzymać LCP poniżej 2,5 s,
  nie schodzić poniżej 4,5:1 kontrastu i nie mieć ani jednego martwego
  przycisku. To są rzeczy sprawdzalne — i one są tutaj.
- **Nie ma wyników audytu.** Nie było pomiaru, więc nie ma liczb do zacytowania.
  Zmierzone wartości wpiszemy, gdy będą — nie wcześniej.
