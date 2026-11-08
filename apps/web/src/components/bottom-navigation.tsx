"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Miejsca docelowe w dolnej nawigacji.
 *
 * Pięć, nie dziewięć. Rozwidlenia z BENGOS Home to dziewięć wejść, ale
 * nawigacja dolna pokazuje pięć miejsc, w których użytkownik bywa stale —
 * studio, dev, bridge, ustawienia i wyszukiwarka są celami, do których
 * wchodzi się z pulpitu.
 *
 * ── PODPISY Z GRAFIKI MENU, NIE Z BRIEFU ───────────────────────────────
 * Ten pasek mówił wcześniej „Feed”, „Create”, „Profile” — nazwami modułów
 * z briefu. Siatka na pulpicie mówi „bengtok”, „asystent”, „profil”, bo
 * właściciel podpisał tak grafikę menu głównego. Dwa języki na jednym
 * ekranie to nie styl, to niespójność: użytkownik widzi „Feed” w pasku
 * i „bengtok” na kaflu, który prowadzi dokładnie tam. Teraz jest jeden
 * zestaw podpisów — ten z grafiki.
 *
 * ── IKONY, NIE SAME NAPISY ─────────────────────────────────────────────
 * Na telefonie pasek jest czytany w ruchu, kątem oka, a sam wyraz trzeba
 * przeczytać, żeby go rozpoznać. Kształt rozpoznaje się szybciej niż literę
 * — dlatego każdy cel ma znak nad napisem.
 *
 * Ikony są napisane jako `path` w tym samym pliku, a nie pobierane z paczki:
 * pięć znaków to mniej kodu niż zależność. Każda jest rysowana
 * `currentColor`, więc dziedziczy kolor stanu aktywnego i motyw — nie ma
 * tu ani jednej wartości koloru.
 *
 * ── AKTYWNY CEL MA TEZ KRESKE I OBRAMOWANIE ────────────────────────────
 * Klasa `bengos-nav-mark` (w `globals.css`) dorysowuje kreskę nad aktywną
 * pozycją, a tarcza dostaje jaśniejszą krawędź. Kolor ikony działa tylko
 * dla kogoś, kto odróżnia akcent od tła; kształt i krawędź działają
 * niezależnie od tego.
 *
 * ── TARCZE JAK W MENU GŁÓWNYM ──────────────────────────────────────────
 * Kształt jest ten sam co na pulpicie: okrągła tarcza z podpisem. Dzięki
 * temu przejście między pulpitem a paskiem dolnym nie zmienia języka
 * interfejsu.
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

function IconHome({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
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

function IconAssistant({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="3.5" />
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

function IconProfile({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="9" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

const DESTINATIONS: { href: string; label: string; hint: string; Icon: (p: IconProps) => React.JSX.Element }[] = [
  { href: "/", label: "Home", hint: "Pulpit", Icon: IconHome },
  { href: "/feed", label: "bengtok", hint: "Wideo i posty", Icon: IconFeed },
  { href: "/create", label: "asystent", hint: "Asystent i tworzenie", Icon: IconAssistant },
  { href: "/chat", label: "chat", hint: "Rozmowy", Icon: IconChat },
  { href: "/profile", label: "profil", hint: "Twoja tożsamość", Icon: IconProfile },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Nawigacja główna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch">
        {DESTINATIONS.map((destination) => {
          const active =
            destination.href === "/"
              ? pathname === "/"
              : pathname === destination.href || pathname.startsWith(`${destination.href}/`);
          return (
            <li key={destination.href} className="flex-1">
              <Link
                href={destination.href}
                aria-current={active ? "page" : undefined}
                className={`bengos-touch-target bengos-nav-mark w-full flex-col gap-1 !min-w-0 py-1.5 text-[var(--bengos-size-caption)] transition-colors duration-[var(--bengos-motion-fast)] ${
                  active
                    ? "font-[var(--bengos-weight-medium)] text-[var(--bengos-accent)]"
                    : "text-[var(--bengos-text-muted)]"
                }`}
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full border transition-colors duration-[var(--bengos-motion-fast)] ${
                    active
                      ? "border-[var(--bengos-accent)] bg-[var(--bengos-accent-muted)]"
                      : "border-[var(--bengos-border)]"
                  }`}
                >
                  <destination.Icon className="size-5" />
                </span>
                {/*
                  Napis jest widoczny, ale jego treść powtarza `hint` dla
                  czytnika — dlatego sam napis jest ukryty przed czytnikiem,
                  a `hint` mówi pełnym zdaniem, dokąd prowadzi odnośnik.
                */}
                <span aria-hidden="true">{destination.label}</span>
                <span className="bengos-visually-hidden">{destination.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
