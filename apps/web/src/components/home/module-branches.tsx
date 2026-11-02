import Link from "next/link";

/**
 * Rozwidlenia z BENGOS Home.
 *
 * Siedem modułów w jednej liście, każdy z jednym zdaniem o tym, co tam jest.
 * Użytkownik nie widzi granic między dawnymi aplikacjami — widzi siedem
 * drzwi w jednym korytarzu.
 */
const BRANCHES = [
  { href: "/feed", label: "BENGOS Feed", description: "Krótkie wideo, dźwięki, posty, twórcy." },
  { href: "/studio", label: "BENGOS Studio", description: "Tworzenie wideo, muzyki AI, postów i projektów kodu." },
  { href: "/chat", label: "BENGOS Chat", description: "Wiadomości, grupy, tłumaczenia, tryby dostępności." },
  { href: "/create", label: "BENGOS Create", description: "Asystent AI, pomysły, scenariusze, muzyka, kod." },
  { href: "/dev", label: "BENGOS Dev", description: "Repozytoria, issue, pull requesty, agent kodujący." },
  { href: "/access", label: "BENGOS Access", description: "Język migowy, napisy, TTS, Morse, wibracje." },
  { href: "/profile", label: "BENGOS Profile", description: "Tożsamość, twórczość, projekty, ustawienia." },
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
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
