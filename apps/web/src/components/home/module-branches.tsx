import Link from "next/link";

/**
 * Rozwidlenia z BENGOS Home.
 *
 * Siedem modułów w jednej liście, każdy z jednym zdaniem o tym, co tam jest.
 * Użytkownik nie widzi granic między dawnymi aplikacjami — widzi siedem
 * drzwi w jednym korytarzu.
 *
 * Każde rozwidlenie mówi też, na jakim etapie jest moduł. Bez tego użytkownik
 * wchodzi i dopiero tam dowiaduje się, że nic nie działa — a ma wiedzieć
 * przed wejściem, nie po.
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
          <li key={branch.href}>
            <Link
              href={branch.href}
              className="bengos-surface-card flex min-h-[var(--bengos-touch-target-min)] flex-col justify-center transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-border-strong)]"
            >
              <span className="font-[var(--bengos-weight-medium)]">{branch.label}</span>
              <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {branch.description}
              </span>
              {branch.stage ? (
                <span className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]">
                  Etap {branch.stage}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
