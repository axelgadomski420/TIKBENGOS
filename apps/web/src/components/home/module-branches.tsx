successfully downloaded text file (SHA: 4da9972074fea005d64121b57dfd0bf32482411d)import Link from "next/link";

/**
 * Rozwidlenia z BENGOS Home.
 *
 * ── NAPISY SĄ TEKSTEM, NIE OBRAZEM ──────────────────────────────────────
 * Podpisy (studio, bengtok, chat, asystent, dev, bridge, profil, ustawienia,
 * wyszukiwarka) są tu prawdziwym tekstem w kodzie, nie fragmentem grafiki.
 *
 * To nie jest wybór estetyczny, a jedyny sposób, żeby spełnić trzy warunki
 * naraz:
 *   1. napis JEST odnośnikiem — kliknięcie w słowo prowadzi do jego trasy,
 *   2. napis jest dostępny z klawiatury — `Tab` przechodzi po kolei,
 *      a `Enter` wchodzi; obszar klikalny nałożony na obraz tego nie daje,
 *   3. napis jest czytany przez czytnik ekranu — obraz z napisami jest
 *      dla czytnika jednym prostokątem, więc dziewięć słów z grafiki
 *      byłoby dla niego niewidzialne.
 *
 * Brief nazywa dostępność warunkiem odbioru każdego ekranu, więc wersja
 * z przezroczystymi obszarami nałożonymi na grafikę nie wchodzi: wyglądałaby
 * tak samo i byłaby nieużywalna dla kogoś, kto nie używa myszy.
 *
 * ── UKŁAD ODTWARZA GRAFIKĘ ──────────────────────────────────────────────
 * Grafika menu ma moduły rozłożone wokół kuli: studio i bridge u góry,
 * dev i profil po prawej, chat i ustawienia po lewej, asystent, bengtok
 * i wyszukiwarka u dołu. Siatka poniżej zachowuje tę KOLEJNOŚĆ, ale nie
 * pozycje — na telefonie układ po okręgu byłby nieczytelny, a odległości
 * między napisami mniejsze niż 44 px, czyli poniżej progu celu dotykowego.
 *
 * ── KAŻDY KAFEL MA DOKĄD PROWADZIĆ ─────────────────────────────────────
 * Żaden nie jest atrapą. „wyszukiwarka” prowadzi na pulpit, bo tam stoi
 * pole uniwersalne; „asystent” do modułu Create, bo to dawny TIKAL;
 * „bengtok” do feedu, bo to dawny TIKTAK; „bridge” do Access, bo tak
 * potwierdził właściciel projektu.
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

function IconStudio({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="m16 10 4-2.5v9L16 14" />
    </svg>
  );
}

function IconBridge({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 4v8" />
      <path d="M8 12h8" />
      <path d="m9 20 3-6 3 6" />
      <circle cx="12" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
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

function IconProfile({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="9" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
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

function IconSettings({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z" />
    </svg>
  );
}

function IconAssistant({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function IconFeed({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10.5 9.5 5.5 2.5-5.5 2.5z" />
    </svg>
  );
}

function IconSearch({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </svg>
  );
}

type Branch = {
  href: string;
  label: string;
  description: string;
  stage: number | null;
  Icon: (p: IconProps) => React.JSX.Element;
};

/** Kolejność idzie za grafiką: moduły pracy u góry, tożsamość po prawej,
 * narzędzia u dołu. */
const BRANCHES: Branch[] = [
  { href: "/studio", label: "studio", description: "Wideo, muzyka AI, posty, projekty kodu.", stage: 2, Icon: IconStudio },
  { href: "/access", label: "bridge", description: "Język migowy, napisy, TTS, Morse, wibracje.", stage: 4, Icon: IconBridge },
  { href: "/dev", label: "dev", description: "Repozytoria, issue, pull requesty, agent kodujący.", stage: 5, Icon: IconDev },
  { href: "/profile", label: "profil", description: "Tożsamość, twórczość, projekty, ustawienia asystenta.", stage: null, Icon: IconProfile },
  { href: "/chat", label: "chat", description: "Wiadomości, grupy, tłumaczenia, dostępność.", stage: 4, Icon: IconChat },
  { href: "/settings", label: "ustawienia", description: "Język, wygląd, dostępność, klucze API, zgody.", stage: null, Icon: IconSettings },
  { href: "/create", label: "asystent", description: "Asystent AI, pomysły, scenariusze, muzyka, kod.", stage: 5, Icon: IconAssistant },
  { href: "/feed", label: "bengtok", description: "Krótkie wideo, dźwięki, posty, twórcy.", stage: 2, Icon: IconFeed },
  { href: "/#wyszukiwarka", label: "wyszukiwarka", description: "Jedno pole na pytanie, tworzenie, szukanie i kod.", stage: null, Icon: IconSearch },
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

      {/*
        Siatka 2 → 3 kolumny. Na telefonie dwa kafle w rzędzie dają cel
        dotykowy szerszy ni¿ 44 px, a trzy w rzędzie spadłyby poniżej progu.
      */}
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {BRANCHES.map((branch) => (
          <li key={branch.label}>
            <Link
              href={branch.href}
              className="group flex h-full min-h-[var(--bengos-touch-target-min)] flex-col items-center gap-2 rounded-[var(--bengos-radius-card)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)] px-3 py-4 text-center transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-accent)] hover:shadow-[0_0_36px_-14px_var(--bengos-glow)] focus-visible:border-[var(--bengos-focus-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)]"
            >
              {/*
                Tarcza modułu: okrągła jak w znaku marki, ale zbudowana
                z tokenów. Dzięki temu działa w motywie wysokiego kontrastu,
                gdzie grafika nie jest używana.

                `aria-hidden` na tarczy, bo znak jest dekoracją: nazwę modułu
                niesie tekst pod nim — prawdziwy, klikalny, czytany przez
                czytnik.
              */}
              <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] text-[var(--bengos-accent)] transition-colors duration-[var(--bengos-motion-fast)] group-hover:border-[var(--bengos-accent)]">
                <branch.Icon className="size-7" />
                {branch.stage ? (
                  <span className="absolute -right-1 -top-1 rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface)] px-1.5 text-[0.625rem] font-[var(--bengos-weight-medium)] leading-4 text-[var(--bengos-text-muted)]">
                    {branch.stage}
                  </span>
                ) : null}
              </span>

              <span className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
                {branch.label}
              </span>
              <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {branch.description}
              </span>
              <span className="bengos-eyebrow mt-auto pt-1 text-[var(--bengos-text-muted)]">
                {branch.stage ? `Etap ${branch.stage}` : "Gotowe"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
