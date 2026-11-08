"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { can, type Permission } from "@bengos/core";

import { BottomNavigation } from "@/components/bottom-navigation";
import { SkipLink } from "@/components/skip-link";
import { useSession } from "@/lib/session-context";
import { usePreferences } from "@/lib/preferences-context";
import { themeAttributes, tokensToStyle } from "@/lib/tokens-to-style";
import { BRAND } from "@/lib/brand";

type IconProps = { className?: string };

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Glyph({ kind, className }: IconProps & { kind: string }) {
  switch (kind) {
    case "studio":
      return <svg {...ICON_PROPS} className={className}><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/><path d="M8 9h3M8 12h3"/></svg>;
    case "feed":
      return <svg {...ICON_PROPS} className={className}><rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 9 5 3-5 3z"/></svg>;
    case "chat":
      return <svg {...ICON_PROPS} className={className}><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-5a7.5 7.5 0 0 1 7.5-7.5h1A7.5 7.5 0 0 1 20 16Z"/><path d="M8 12h8M8 15h5"/></svg>;
    case "assistant":
      return <svg {...ICON_PROPS} className={className}><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="3.5"/></svg>;
    case "dev":
      return <svg {...ICON_PROPS} className={className}><path d="m8.5 8-4 4 4 4m7-8 4 4-4 4m-2.5-11-2 14"/></svg>;
    case "bridge":
      return <svg {...ICON_PROPS} className={className}><circle cx="12" cy="5" r="2"/><path d="M12 7v7m-5-3h10m-9 9 4-6 4 6"/></svg>;
    case "profile":
      return <svg {...ICON_PROPS} className={className}><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>;
    case "settings":
      return <svg {...ICON_PROPS} className={className}><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1) scale(1.08)"/></svg>;
    case "search":
      return <svg {...ICON_PROPS} className={className}><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.5 4.5"/></svg>;
    default:
      return <svg {...ICON_PROPS} className={className}><path d="M12 5v14m-7-7h14"/></svg>;
  }
}

const MODULES: {
  href: string;
  label: string;
  detail: string;
  kind: string;
  status: string;
  permission?: Permission;
}[] = [
  { href: "/studio", label: "studio", detail: "Twórz wideo, muzykę i posty", kind: "studio", status: "TWÓRZ" },
  { href: "/feed", label: "bengtok", detail: "Odkrywaj krótkie wideo i twórców", kind: "feed", status: "ODKRYWAJ" },
  { href: "/chat", label: "chat", detail: "Rozmawiaj i buduj społeczności", kind: "chat", status: "POŁĄCZ SIĘ" },
  { href: "/create", label: "asystent", detail: "Zamień pomysł w konkretny plan", kind: "assistant", status: "POMYSŁY" },
  { href: "/dev", label: "dev", detail: "Kod, repozytoria i projekty", kind: "dev", status: "BUDUJ", permission: "repo.connect" },
  { href: "/access", label: "bridge", detail: "Narzędzia dostępności i komunikacji", kind: "bridge", status: "DOSTĘPNOŚĆ" },
  { href: "/profile", label: "profil", detail: "Twoja tożsamość i twórczość", kind: "profile", status: "TY" },
  { href: "/settings", label: "ustawienia", detail: "Wygląd, prywatność i preferencje", kind: "settings", status: "KONFIGURUJ" },
  { href: "/#universal-search", label: "wyszukiwarka", detail: "Szukaj, pytaj lub zacznij tworzyć", kind: "search", status: "SZUKAJ" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accessibility } = usePreferences();
  const { identity } = useSession();
  const pathname = usePathname();
  const visibleModules = MODULES.filter(
    (module) => !module.permission || (identity && can(identity, module.permission)),
  );
  const isHome = pathname === "/";

  return (
    <div
      style={tokensToStyle(theme, accessibility.accessibilityMode, accessibility.reducedMotion, accessibility.highContrast)}
      {...themeAttributes(theme, accessibility.accessibilityMode, accessibility.reducedMotion)}
      className="min-h-dvh bg-[var(--bengos-surface)] text-[var(--bengos-text)]"
    >
      <SkipLink />

      <header className="sticky top-0 z-40 border-b border-[var(--bengos-border)] bg-[var(--bengos-surface)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="BENGOS — strona główna" className="flex min-h-11 items-center gap-3 rounded-xl">
            <Image src={BRAND.logo} alt="" width={38} height={38} priority unoptimized className="size-[38px] rounded-xl object-cover object-top" />
            <span className="text-sm font-semibold tracking-[0.2em]">BENGOS</span>
          </Link>
          <div className="flex items-center gap-2">
            {identity ? (
              <Link href="/profile" className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--bengos-border)] px-3 text-sm transition hover:border-[var(--bengos-accent)]">
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--bengos-accent-muted)] text-xs font-semibold text-[var(--bengos-accent)]">
                  {(identity.displayName || identity.username).slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-28 truncate">{identity.displayName || identity.username}</span>
              </Link>
            ) : (
              <Link href="/login" className="flex min-h-11 items-center rounded-full bg-[var(--bengos-accent)] px-5 text-sm font-semibold text-[var(--bengos-text-on-accent)] transition hover:brightness-110">
                Zaloguj się
              </Link>
            )}
          </div>
        </div>
      </header>

      {isHome ? (
        <main id="bengos-main" className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pt-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--bengos-accent)]">Twoja przestrzeń. Wszystko połączone.</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Co chcesz dziś zrobić?</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--bengos-text-muted)] sm:text-base">
              Twórz, odkrywaj i rozmawiaj — wybierz miejsce, od którego chcesz zacząć.
            </p>
          </div>

          <nav aria-label="Główne menu BENGOS" className="mx-auto mt-9 max-w-5xl">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3">
              {visibleModules.map((module, index) => {
                const active = pathname === module.href || pathname.startsWith(`${module.href}/`);
                return (
                  <li key={module.href} className={index === 8 ? "col-span-2 sm:col-span-1" : undefined}>
                    <Link
                      href={module.href}
                      aria-current={active ? "page" : undefined}
                      className="group flex min-h-40 flex-col items-center justify-center rounded-[26px] border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)]/70 px-4 py-5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--bengos-accent)] hover:bg-[var(--bengos-surface-raised)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bengos-focus-ring)] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <span className="flex size-[58px] items-center justify-center rounded-[20px] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] text-[var(--bengos-accent)] transition group-hover:border-[var(--bengos-accent)] group-hover:bg-[var(--bengos-accent-muted)]">
                        <Glyph kind={module.kind} className="size-7" />
                      </span>
                      <span className="mt-3 text-base font-semibold lowercase tracking-wide">{module.label}</span>
                      <span className="mt-1 text-xs leading-5 text-[var(--bengos-text-muted)]">{module.detail}</span>
                      <span className="mt-3 text-[0.58rem] font-semibold tracking-[0.2em] text-[var(--bengos-accent)]">{module.status}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {!identity ? (
            <p className="mt-8 text-center text-sm text-[var(--bengos-text-muted)]">
              Zaloguj się, aby zapisywać swoje treści i korzystać z pełnego menu.
            </p>
          ) : null}

          <section aria-label="Podgląd aplikacji" className="sr-only">{children}</section>
        </main>
      ) : (
        <main id="bengos-main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
          {children}
        </main>
      )}

      <BottomNavigation />
    </div>
  );
}
