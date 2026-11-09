"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { can, type Permission } from "@bengos/core";

import { BottomNavigation } from "@/components/bottom-navigation";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { SkipLink } from "@/components/skip-link";
import { useSession } from "@/lib/session-context";
import { usePreferences } from "@/lib/preferences-context";
import { themeAttributes, tokensToStyle } from "@/lib/tokens-to-style";
import { BRAND } from "@/lib/brand";

/**
 * Rozwidlenia z BENGOS Home w siódemkę modułów.
 *
 * `permission` jest tu po to, żeby wejście, do którego użytkownik nie ma
 * prawa, nie pojawiało się wcale. Ukrywanie go wizualnie i zostawianie
 * klikalnego jest najgorszym z wariantów: wprowadza w błąd i ujawnia
 * istnienie czegoś, do czego i tak nie ma dostępu.
 */
const BRANCHES: { href: string; label: string; description: string; permission?: Permission }[] = [
  { href: "/feed", label: "bengtok", description: "Krótkie wideo, dźwięki, twórcy" },
  { href: "/studio", label: "studio", description: "Wideo, muzyka, posty, projekty" },
  { href: "/chat", label: "chat", description: "Wiadomości, grupy, tłumaczenia" },
  { href: "/create", label: "asystent", description: "Asystent, pomysły, scenariusze" },
  { href: "/dev", label: "dev", description: "Repozytoria, issue, agent kodujący", permission: "repo.connect" },
  { href: "/access", label: "bridge", description: "Język migowy, napisy, Morse" },
  { href: "/profile", label: "profil", description: "Tożsamość, twórczość, ustawienia" },
];

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
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
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
      <path d="M12 4v8M8 12h8m-7 8 3-6 3 6" />
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

const ICONS: Record<string, (p: IconProps) => React.JSX.Element> = {
  "/feed": IconFeed,
  "/studio": IconStudio,
  "/chat": IconChat,
  "/create": IconCreate,
  "/dev": IconDev,
  "/access": IconAccess,
  "/profile": IconProfile,
};

/**
 * Powłoka aplikacji.
 *
 * ── PULPIT RYSUJE POWŁOKA, NIE STRONA (naprawa 2026-11-08, noc) ──────────
 * To jest ostatnia i najważniejsza poprawka w tej sprawie.
 *
 * `apps/web/src/app/page.tsx` renderował CAŁY pulpit (`WelcomeBanner`,
 * `ModuleOrbit` z tygrysem pośrodku, `ModuleBranches` z siatką kafli).
 * Next.js wysyłał go jako `{children}` do każdego wejścia — także dla osoby
 * bez sesji. Dowód z `curl` po wdrożeniu, OBA napisy w jednym dokumencie:
 *
 *     Gdzie chcesz wejść        ← h2 siatki, treść PULPITU
 *     Nie masz jeszcze konta    ← zdanie z BRAMY wejścia
 *
 * Właściciel widział na telefonie ogromnego tygrysa i wąski pasek obok.
 * Tygrys pochodził z `ModuleOrbit`, a „pasek formularza” był fragmentem
 * siatki — nie bramą. Wszystkie wcześniejsze poprawki (wymiary znaku,
 * zasłona startowa, cache) leczyły objaw.
 *
 * Teraz `page.tsx` nie renderuje nic, a ten plik podmienia `{children}`
 * na `HomeDashboard` WYŁĄCZNIE przy `status === "authenticated"`. Nie
 * istnieje droga, którą przybysz dostanie treść konta.
 *
 * ── BRAMA: JEDEN PUNKT KONTROLNY ────────────────────────────────────────
 * Przy braku sesji renderuje się `EntryScreen` — i nic więcej. Jedna brama
 * dla wszystkich tras, zero szczelin.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accessibility } = usePreferences();
  const { identity, status } = useSession();
  const pathname = usePathname();

  const visibleBranches = BRANCHES.filter(
    (branch) => !branch.permission || (identity && can(identity, branch.permission)),
  );

  const shellStyle = tokensToStyle(
    theme,
    accessibility.accessibilityMode,
    accessibility.reducedMotion,
    accessibility.highContrast,
  );
  const shellAttributes = themeAttributes(
    theme,
    accessibility.accessibilityMode,
    accessibility.reducedMotion,
  );

  /*
    ── BRAMA WYŁĄCZONA (2026-11-09) ───────────────────────────────────────
    Użytkownik prosi o natychmiastowe menu główne, żeby testować resztę
    aplikacji. Logowanie/rejestracja wróci po naprawie. Na razie każdy
    widzi pulpit.
  */
  // if (status !== "authenticated") { ... } — wyłączone

  /*
    ── PULPIT ─────────────────────────────────────────────────────────────
  */
  const isHome = pathname === "/";

  return (
    <div
      style={shellStyle}
      {...shellAttributes}
      className="min-h-dvh bg-[var(--bengos-surface)] text-[var(--bengos-text)]"
    >
      <SkipLink />

      <header className="sticky top-0 z-40 border-b border-[var(--bengos-border)] bg-[var(--bengos-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <Link
            href="/"
            aria-label="BENGOS — przejdź do pulpitu"
            className="bengos-touch-target flex items-center gap-2.5 rounded-[var(--bengos-radius-control)] px-1"
          >
            <Image
              src={BRAND.logo}
              alt=""
              width={36}
              height={36}
              priority
              unoptimized
              className="size-9 rounded-full object-cover object-top"
            />
            <span className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)] tracking-[0.08em]">
              BENGOS
            </span>
          </Link>

          <nav aria-label="Moduły" className="ml-auto hidden items-center gap-0.5 md:flex">
            {visibleBranches.map((branch) => {
              const active = pathname === branch.href || pathname.startsWith(`${branch.href}/`);
              const Icon = ICONS[branch.href];
              return (
                <Link
                  key={branch.href}
                  href={branch.href}
                  aria-current={active ? "page" : undefined}
                  title={branch.description}
                  className={`bengos-touch-target gap-1.5 rounded-[var(--bengos-radius-control)] px-2.5 text-[var(--bengos-size-caption)] transition-colors duration-[var(--bengos-motion-fast)] ${
                    active
                      ? "bg-[var(--bengos-accent-muted)] font-[var(--bengos-weight-medium)] text-[var(--bengos-accent)]"
                      : "text-[var(--bengos-text-muted)] hover:bg-[var(--bengos-surface-sunken)] hover:text-[var(--bengos-text)]"
                  }`}
                >
                  {Icon ? <Icon className="size-4" /> : null}
                  {branch.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/settings"
            className="bengos-touch-target ml-auto rounded-[var(--bengos-radius-control)] px-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)] hover:bg-[var(--bengos-surface-sunken)] md:ml-2"
          >
            Ustawienia
          </Link>
        </div>
      </header>

      <main id="bengos-main" className="mx-auto max-w-5xl px-4 pb-28 pt-6">
        {isHome ? <HomeDashboard /> : children}
      </main>

      <BottomNavigation />
    </div>
  );
}
