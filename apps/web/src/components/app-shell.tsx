"use client";

import Link from "next/link";
import Image from "next/image";
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

/**
 * Nagłówek powłoki.
 *
 * ── NAZWA: `BENGOS`, NIE `TIKBENGOS` ────────────────────────────────────
 * Interfejs mówi „BENGOS” — tak nazywają się moduły (`BENGOS Home`,
 * `BENGOS Studio`), tak nazywa się marka na logo i tak ma mówić nagłówek.
 * `TIKBENGOS` zostaje wyłącznie jako nazwa repozytorium i pakietów w kodzie;
 * użytkownik nie ma powodu jej oglądać.
 *
 * ── LOGO ZAMIAST TEKSTU ─────────────────────────────────────────────────
 * Znak (`/brand/bengos-logo.jpg`) ma napis „BENGOS” wpisany w grafikę,
 * więc obok niego NIE MA drugiego napisu tekstem — powielenie tego samego
 * słowa dwa razy w jednym pasku to szum, nie hierarchia.
 *
 * Tekst alternatywny jest jednak konieczny: bez niego odnośnik do pulpitu
 * jest dla czytnika ekranu pustym linkiem, a to wyklucza nawigację
 * klawiaturą i czytnikiem — czyli dokładnie to, po co istnieje `SkipLink`.
 *
 * Obraz jest dekoracją w tym sensie, że niesie znak, a nie treść — dlatego
 * `alt=""` (żeby czytnik nie czytał „BENGOS” dwa razy), a nazwę podaje
 * `aria-label` na odnośniku, razem z celem przejścia.
 */
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
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <Link
            href="/"
            aria-label="BENGOS — przejdź do pulpitu"
            className="bengos-touch-target flex items-center gap-2 rounded-[var(--bengos-radius-control)] px-1"
          >
            {/*
              `priority` jest tu celowe: znak stoi nad zgięciem strony, więc
              leniwe ładowanie pokazałoby go po chwili jako przeskok układu.
              Rozmiar podany jawnie, bo obraz bez wymiarów rezerwuje zero
              miejsca i wypycha nawigację w momencie wczytania.
            */}
            <Image
              src="/brand/bengos-logo.jpg"
              alt=""
              width={40}
              height={40}
              priority
              className="size-10 rounded-[var(--bengos-radius-control)] object-cover"
            />
            <span className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]">
              BENGOS
            </span>
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
