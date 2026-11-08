import Link from "next/link";

/**
 * Rozwidlenia z BENGOS Home.
 *
 * Siedem modułów w jednej siatce, każdy z jednym zdaniem o tym, co tam jest.
 * Użytkownik nie widzi granic między dawnymi aplikacjami — widzi siedem
 * drzwi w jednym korytarzu.
 *
 * ── OKRĄGŁE KAFLE JAK W ZNAKU MARKI ────────────────────────────────────
 * Grafika pulpitu pokazuje moduły jako koła z podpisem pod nimi. Ten
 * komponent powtarza ten układ jako PRAWDZIWE odnośniki: okrągła tarcza,
 * pod nią nazwa, pod nią jedno zdanie. Kształt jest ten sam, ale każdy
 * element prowadzi do swojego ekranu — nie ma tu nic, co wygląda jak
 * przycisk i nic nie robi.
 *
 * Każdy kafel ma w tarczy znak rysowany `currentColor`, więc dziedziczy
 * kolor motywu i stanu aktywnego. Tarcza jest okrągła jak w grafice, ale
 * jej wnętrze pochodzi z tokenów — dlatego działa w każdym motywie, także
 * w wysokim kontraście, gdzie grafika nie ma zastosowania.
 *
 * ── ETAP NA KRAWĘDZI, NIE W OPISIE ─────────────────────────────────────
 * Moduł w przygotowaniu ma znak etapu w prawym górnym rogu tarczy. Widać
 * go kątem oka przy skanowaniu siatki i od razu wiadomo, które drzwi są
 * zamknięte, a które nie — bez czytania opisu.
 *
 * ── PROFILE NIE MA ETAPU, MA PODPIS „DOSTĘPNY” ────────────────────────
 * Profil nie jest zamknięty w żadnym etapie — działa i rozbudowuje się
 * razem z resztą. `stage: null` znaczy „brak informacji o etapie”, więc
 * tarcza dostaje podpis „Dostępny”, a nie pustkę czytającą się jak błąd.
 */

type IconProps = { className?: string };

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconFeed({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10.5 9.5 5.5 2.5-5.5 2.5z" />
    </svg>
  );
}

function IconStudio({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="m16 10 4-2.5v9L16 14" />
    </svg>
  );
}

function IconChat({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M20 12a7 7 0 0 1-7 7H8l-4 3v-5.5A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7Z" />
    </svg>
  );
}

function IconCreate({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function IconDev({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="m8.5 8.5-4 3.5 4 3.5M15.5 8.5l4 3.5-4 3.5" />
      <path d="m13.5 5.5-3 13" />
    </svg>
  );
}

function IconAccess({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 4v8" />
      <path d="M8 12h8" />
      <path d="m9 20 3-6 3 6" />
      <circle cx="12" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconProfile({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="9" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

type Branch = {
  href: string;
  label: string;
  short: string;
  description: string;
  stage: number | null;
  Icon: (p: IconProps) => React.JSX.Element;
};

const BRANCHES: Branch[] = [
  { href: "/feed", label: "BENGOS Feed", short: "Feed", description: "Krótkie wideo, dźwięki, posty, twórcy.", stage: 2, Icon: IconFeed },
  { href: "/studio", label: "BENGOS Studio", short: "Studio", description: "Tworzenie wideo, muzyki AI, postów i projektów kodu.", stage: 2, Icon: IconStudio },
  { href: "/chat", label: "BENGOS Chat", short: "Chat", description: "Wiadomości, grupy, tłumaczenia, tryby dostępności.", stage: 4, Icon: IconChat },
  { href: "/create", label: "BENGOS Create", short: "Create", description: "Asystent AI, pomysły, scenariusze, muzyka, kod.", stage: 5, Icon: IconCreate },
  { href: "/dev", label: "BENGOS Dev", short: "Dev", description: "Repozytoria, issue, pull requesty, agent kodujący.", stage: 5, Icon: IconDev },
  { href: "/access", label: "BENGOS Access", short: "Access", description: "Język migowy, napisy, TTS, Morse, wibracje.", stage: 4, Icon: IconAccess },
  { href: "/profile", label: "BENGOS Profile", short: "Profile", description: "Tożsamość, twórczość, projekty, ustawienia.", stage: null, Icon: IconProfile },
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
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BRANCHES.map((branch) => (
          <li key={branch.href}>
            <Link
              href={branch.href}
              className="group flex min-h-[var(--bengos-touch-target-min)] flex-col items-center gap-2 rounded-[var(--bengos-radius-card)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)] px-3 py-4 text-center transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-border-strong)]"
            >
              {/*
                Tarcza modułu. Okrągła jak w znaku marki, ale zbudowana
                z tokenów — dzięki temu działa także w trybie wysokiego
                kontrastu, gdzie grafika nie jest używana.

                `aria-hidden` na tarczy, bo znak jest dekoracją: nazwę
                modułu niesie tekst pod nim, a powtórzenie jej w opisie
                ikony dałoby czytnikowi to samo dwa razy.
              */}
              <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] text-[var(--bengos-accent)] transition-colors duration-[var(--bengos-motion-fast)] group-hover:border-[var(--bengos-accent)]">
                <branch.Icon className="size-7" />
                {branch.stage ? (
                  <span className="absolute -right-1 -top-1 rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface)] px-1.5 text-[0.625rem] font-[var(--bengos-weight-medium)] leading-4 text-[var(--bengos-text-muted)]">
                    {branch.stage}
                  </span>
                ) : null}
              </span>

              <span className="font-[var(--bengos-weight-medium)]">{branch.short}</span>
              <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {branch.description}
              </span>
              <span className="bengos-eyebrow mt-auto pt-1 text-[var(--bengos-text-muted)]">
                {branch.stage ? `Etap ${branch.stage}` : "Dostępny"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
