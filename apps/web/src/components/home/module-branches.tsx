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
 * ── NAJPIERW SIATKA, POTEM KOLUMNY ────────────────────────────────────
 * Siedem pozycji to liczba pierwsza, więc każdy układ kolumnowy zostawi
 * jedną pozycję samą w ostatnim wierszu. Nie da się tego naprawić doborem
 * siatki — zamiast tego ostatnia pozycja zajmuje obie kolumny, a rząd
 * zostaje domknięty. Pusty róg czyta się jak błąd, pełny wiersz jak decyzja.
 *
 * ── ETAP ZAMIENIONY W ZNACZNIK, NIE W ZDANIE ──────────────────────────
 * „Etap 2” jako osobna linia tekstu wyglądało jak część opisu. Teraz jest
 * znakiem na krawędzi kafla: widać go kątem oka przy skanowaniu siatki
 * i od razu wiadomo, które drzwi są zamknięte, a które nie.
 */
const BRANCHES = [
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
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {BRANCHES.map((branch) => (
          <li
            key={branch.href}
            /*
              Ostatnia pozycja na szerokim ekranie bierze obie kolumny.
              Siedem to liczba nieparzysta, więc bez tego zostawałaby
              dziura w siatce.
            */
            className={branch.stage === null ? "sm:col-span-2" : undefined}
          >
            <Link href={branch.href} className="bengos-tile h-full">
              <span className="flex items-center gap-2">
                <span className="font-[var(--bengos-weight-medium)]">{branch.label}</span>
                {branch.stage ? (
                  <span className="bengos-eyebrow ml-auto shrink-0 text-[var(--bengos-accent)]">
                    Etap {branch.stage}
                  </span>
                ) : null}
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
