"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { BottomNavigation } from "./bottom-navigation";
import { BRAND } from "@/lib/brand";
import { usePreferences } from "@/lib/preferences-context";
import { themeAttributes, tokensToStyle } from "@/lib/tokens-to-style";

/**
 * Sam pasek górny — dla ekranów, które nie potrzebują całej powłoki.
 *
 * Powstał, bo ekrany błędów i stanów pustych potrzebują tego samego paska
 * co reszta aplikacji, ale bez nawigacji modułów u góry i bez nawigacji
 * dolnej. Zamiast kopiować znacznik z `AppShell` (i rozjechać go przy
 * pierwszej zmianie), ten plik bierze te same tokeny motywu i ten sam znak
 * z `@/lib/brand` — więc wygląda identycznie bez duplikatu logiki.
 *
 * ── LINK DO USTAWIEŃ ZNIKA NA EKRANIE USTAWIEŃ ──────────────────────────
 * Odnośnik do miejsca, w którym się już jest, jest ślepą uliczką: wygląda
 * na wyjście, a prowadzi donikąd. Dlatego na `/settings` go nie ma.
 */
export function Topbar() {
  const { theme, accessibility } = usePreferences();
  const pathname = usePathname();

  return (
    <div
      style={tokensToStyle(
        theme,
        accessibility.accessibilityMode,
        accessibility.reducedMotion,
        accessibility.highContrast,
      )}
      {...themeAttributes(theme, accessibility.accessibilityMode, accessibility.reducedMotion)}
    >
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
          {pathname !== "/settings" ? (
            <Link
              href="/settings"
              className="bengos-touch-target ml-auto rounded-[var(--bengos-radius-control)] px-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)] hover:bg-[var(--bengos-surface-sunken)]"
            >
              Ustawienia
            </Link>
          ) : null}
        </div>
      </header>
      <BottomNavigation />
    </div>
  );
}
