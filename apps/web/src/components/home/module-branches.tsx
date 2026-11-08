import Link from "next/link";

/**
 * Rozwidlenia z BENGOS Home.
 *
 * Siedem modułów w jednej siatce, każdy z jednym zdaniem o tym, co tam jest.
 * Użytkownik nie widzi granic między dawnymi aplikacjami — widzi siedem
 * drzwi w jednym korytarzu.
 *
 * Każde rozwidlenie mówi też, na jakim etapie jest moduł. Bez tego użytkownik
 * wchodzi i dopiero tam dowiaduje się, że nic nie działa — a ma wiedzieć
 * przed wejściem, nie po.
 *
 * ── LICZBA KOLUMN JEST DOBRNA POD SIEDEM POZYCJI ────────────────────────
 * Siedem to liczba pierwsza, więc żaden układ dwu- ani trzykolumnowy nie
 * domknie rzędów równo. Poprzednia wersja rozciągała ostatnią pozycję na
 * dwie kolumny (`sm:col-span-2`) — na wąskim ekranie to działało, ale od
 * breakpointu `lg` siatka ma trzy kolumny i rozciągnięcie na dwie zostawiało
 * dziurę w trzeciej. Teraz siatka jest dwukolumnowa **do `lg`**, a od `lg`
 * wchodzi trzykolumnowa z jedną pozycją rozciągniętą na dwie — czyli
 * w obu przypadkach rząd jest pełny, a nie „prawie pełny”.
 *
 * ── ETAP ZAMIENIONY W ZNACZNIK, NIE W ZDANIE ──────────────────────────
 * „Etap 2” jako osobna linia tekstu wyglądało jak część opisu. Teraz jest
 * znakiem na krawędzi kafla: widać go kątem oka przy skanowaniu siatki
 * i od razu wiadomo, które drzwi są zamknięte, a które nie.
 *
 * ── POZYCJA BEZ ETAPU JEST INNA, NIE WAŻNIEJSZA ────────────────────────
 * Profile nie ma numeru etapu, bo nie jest zamknięty — ekran działa
 * i rozbudowuje się razem z resztą. `stage: null` znaczy więc „brak
 * informacji o etapie”, a nie „etap zero”.
 */
const BRANCHES: { href: string; label: string; description: string; stage: number | null }[] = [
  { href: "/feed", label: "BENGOS Feed", description: "Krótkie wideo, dźwięki, posty, twórcy.", stage: 2 },
  { href: "/studio", label: "BENGOS Studio", description: "Tworzenie wideo, muzyki AI, postów i projektów kodu.", stage: 2 },
  { href: "/chat", label: "BENGOS Chat", description: "Wiadomości, grupy, tłumaczenia, tryby dostępności.", stage: 4 },
  { href: "/create", label: "BENGOS Create", description: "Asystent AI, pomysły, scenariusze, muzyka, kod.", stage: 5 },
  { href: "/dev", label: "BENGOS Dev", description: "Repozytoria, issue, pull requesty, agent kodujący.", stage: 5 },
  { href: "/access", label: "BENGOS Access", description: "Język migowy, napisy, TTS, Morse, wibracje.", stage: 4 },
  { href: "/profile", label: "BENGOS Profile", description: "Tożsamość, twórczość, projekty, ustawienia.", stage: null },
];

export function ModuleBranches() {
  return (
    <section aria-labelledby="branches">
      <h2
        id="branches"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Gdzie chcesz wejść
      </h2>
      <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Moduły z etapem w przygotowaniu otwierają ekran, który mówi wprost, co jest
        zaplanowane. Żaden z nich nie udaje działającej funkcji.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BRANCHES.map((branch) => (
          <li
            key={branch.href}
            /*
              Ostatnia pozycja (Profile) domyka rząd na obu breakpointach:
              dwie kolumny do `lg`, trzy od `lg`.
            */
            className={branch.stage === null ? "sm:col-span-2 lg:col-span-1" : undefined}
          >
            <Link href={branch.href} className="bengos-tile h-full">
              <span className="flex items-center gap-2">
                <span className="font-[var(--bengos-weight-medium)]">{branch.label}</span>
                {branch.stage ? (
                  <span className="bengos-eyebrow ml-auto shrink-0 text-[var(--bengos-accent)]">
                    Etap {branch.stage}
                  </span>
                ) : (
                  <span className="bengos-eyebrow ml-auto shrink-0 text-[var(--bengos-text-muted)]">
                    Dostępny
                  </span>
                )}
              </span>
              <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {branch.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
