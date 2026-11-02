"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { can, type Permission } from "@bengos/core";

import { BottomNavigation } from "@/components/bottom-navigation";
import { SkipLink } from "@/components/skip-link";
import { useSession } from "@/lib/session-context";
import { usePreferences } from "@/lib/preferences-context";
import { themeAttributes, tokensToStyle } from "@/lib/tokens-to-style";

/**
 * Rozwidlenia z BENGOS Home w siódemkę modułów.
 *
 * `permission` jest tu po to, żeby wejście, do którego użytkownik nie ma
 * prawa, nie pojawiało się wcale. Ukrywanie go wizualnie i zostawianie
 * klikalnego jest najgorszym z wariantów: wprowadza w błąd i ujawnia
 * istnienie czegoś, do czego i tak nie ma dostępu.
 */
const BRANCHES: { href: string; label: string; description: string; permission?: Permission }[] = [
  { href: "/feed", label: "Feed", description: "Krótkie wideo, dźwięki, twórcy" },
  { href: "/studio", label: "Studio", description: "Wideo, muzyka, posty, projekty" },
  { href: "/chat", label: "Chat", description: "Wiadomości, grupy, tłumaczenia" },
  { href: "/create", label: "Create", description: "Asystent, pomysły, scenariusze" },
  { href: "/dev", label: "Dev", description: "Repozytoria, issue, agent kodujący", permission: "repo.connect" },
  { href: "/access", label: "Access", description: "Język migowy, napisy, Morse" },
  { href: "/profile", label: "Profile", description: "Tożsamość, twórczość, ustawienia" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accessibility } = usePreferences();
  const { identity } = useSession();
  const pathname = usePathname();

  const visibleBranches = BRANCHES.filter(
    (branch) => !branch.permission || (identity && can(identity, branch.permission)),
  );

  return (
    <div
      style={tokensToStyle(
        theme,
        accessibility.accessibilityMode,
        accessibility.reducedMotion,
        accessibility.highContrast,
      )}
      {...themeAttributes(theme, accessibility.accessibilityMode, accessibility.reducedMotion)}
      className="min-h-dvh bg-[var(--bengos-surface)] text-[var(--bengos-text)]"
    >
      <SkipLink />

      <header className="sticky top-0 z-40 border-b border-[var(--bengos-border)] bg-[var(--bengos-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="bengos-touch-target px-1 text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]"
          >
            TIKBENGOS
          </Link>

          <nav aria-label="Moduły" className="ml-auto hidden gap-1 md:flex">
            {visibleBranches.map((branch) => {
              const active = pathname === branch.href || pathname.startsWith(`${branch.href}/`);
              return (
                <Link
                  key={branch.href}
                  href={branch.href}
                  aria-current={active ? "page" : undefined}
                  title={branch.description}
                  className={`bengos-touch-target px-3 text-[var(--bengos-size-body)] transition-colors duration-[var(--bengos-motion-fast)] ${
                    active
                      ? "text-[var(--bengos-accent)] font-[var(--bengos-weight-medium)]"
                      : "text-[var(--bengos-text-muted)] hover:text-[var(--bengos-text)]"
                  }`}
                >
                  {branch.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/settings"
            className="bengos-touch-target ml-auto px-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)] md:ml-0"
          >
            Ustawienia
          </Link>
        </div>
      </header>

      <main id="bengos-main" className="mx-auto max-w-5xl px-4 pb-28 pt-6">
        {children}
      </main>

      <BottomNavigation />
    </div>
  );
}
