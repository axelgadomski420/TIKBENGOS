import Link from "next/link";

/**
 * Karta „Stwórz teraz”.
 *
 * Cztery wejścia, każde do innego modułu, ale wszystkie wyglądają jak jedna
 * karta. To jest cała idea TIKBENGOS w jednym komponencie: cztery osobne
 * aplikacje nie są tu widoczne — widać cztery rzeczy, które można zrobić.
 *
 * ── TARCZE ZE ZNAKAMI, NIE SAM TEKST ───────────────────────────────────
 * Cztery pozycje w jednej kolumnie tworzyły ścianę tekstu — nie było czego
 * zaczepić wzrokiem przy skanowaniu. Każda pozycja ma teraz tarczę ze
 * znakiem, ten sam język co menu główne i obie nawigacje. Dzięki temu
 * wzrok rozpoznaje pozycję po kształcie, a nie po pierwszej literze.
 *
 * ── OPIS IDZIE POD ETYKIETĄ ─────────────────────────────────────────────
 * Opis obok etykiety łamał się w dwie linie na wąskim ekranie i rozjeżdżał
 * wysokości pozycji. Pod etykietą trzyma równy rytm niezależnie od
 * szerokości ekranu.
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

function IconVideo({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="6" width="12" height="12" rx="3" />
      <path d="m15 10 6-3v10l-6-3" />
    </svg>
  );
}

function IconMusic({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  );
}

function IconPost({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M5 5h14M5 10h14M5 15h8" />
    </svg>
  );
}

function IconProject({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="m8.5 8.5-4 3.5 4 3.5M15.5 8.5l4 3.5-4 3.5" />
      <path d="m13.5 5.5-3 13" />
    </svg>
  );
}

const OPTIONS: {
  href: string;
  label: string;
  description: string;
  Icon: (p: IconProps) => React.JSX.Element;
}[] = [
  { href: "/studio/video", label: "Wideo", description: "Nagraj albo wgraj, dodaj napisy, opublikuj", Icon: IconVideo },
  { href: "/studio/music", label: "Muzyka", description: "Opisz utwór, poczekaj, przypisz do wideo", Icon: IconMusic },
  { href: "/studio/post", label: "Post", description: "Tekst, wideo albo dźwięk — z opisem dla ekranu bez obrazu", Icon: IconPost },
  { href: "/studio/project", label: "Projekt kodu", description: "Opisz funkcję, zobacz plan, zatwierdź pull request", Icon: IconProject },
];

export function CreateNowCard() {
  return (
    <section aria-labelledby="create-now" className="bengos-surface-card">
      <h2
        id="create-now"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Stwórz teraz
      </h2>

      <ul className="mt-3 -mx-2">
        {OPTIONS.map((option) => (
          <li key={option.href}>
            <Link
              href={option.href}
              className="group flex min-h-[var(--bengos-touch-target-min)] items-center gap-3 rounded-[var(--bengos-radius-control)] px-2 py-2.5 transition-colors duration-[var(--bengos-motion-fast)] hover:bg-[var(--bengos-surface-sunken)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] text-[var(--bengos-accent)] transition-colors duration-[var(--bengos-motion-fast)] group-hover:border-[var(--bengos-accent)]">
                <option.Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-[var(--bengos-weight-medium)]">{option.label}</span>
                <span className="block text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  {option.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
