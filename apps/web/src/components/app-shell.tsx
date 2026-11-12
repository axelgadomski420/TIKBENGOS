"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BRAND } from "@/lib/brand";
import { usePreferences } from "@/lib/preferences-context";
import { useSession } from "@/lib/session-context";
import { themeAttributes, tokensToStyle } from "@/lib/tokens-to-style";
import { SkipLink } from "@/components/skip-link";

const NAMES: Record<string, string> = {
  "/chat": "BengMess",
  "/settings": "ustawienia",
  "/studio": "studio",
  "/access": "bridge",
  "/dev": "dev",
  "/profile": "profil",
  "/szukaj": "wyszukiwarka",
  "/feed": "bengtok",
  "/create": "asystent",
  "/market": "market",
  "/register": "rejestracja",
};

function placeName(pathname: string): string {
  const key = Object.keys(NAMES).find((item) => pathname === item || pathname.startsWith(item + "/"));
  return key ? (NAMES[key] ?? "") : "";
}

/**
 * Poza ekranem startowym jest tylko pasek: znak wraca do kuli, nazwa mówi gdzie jesteś.
 * Drugiego menu tu nie ma.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, accessibility } = usePreferences();
  const { status } = useSession();
  const pathname = usePathname();
  const bare = pathname === "/" || pathname === "/login";

  if (bare) return <>{children}</>;

  const shellStyle = tokensToStyle(
    theme,
    accessibility.accessibilityMode,
    accessibility.reducedMotion,
    accessibility.highContrast,
  );

  return (
    <div
      style={shellStyle}
      {...themeAttributes(theme, accessibility.accessibilityMode, accessibility.reducedMotion)}
      className="min-h-dvh bg-black text-[var(--bengos-text)]"
    >
      <SkipLink />
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur">
        <Link href="/" aria-label="Wróć do znaku BENGOS" className="flex items-center gap-2">
          <Image src={BRAND.logo} alt="" width={36} height={36} unoptimized className="size-9 rounded-full object-cover" />
          <span className="text-sm tracking-[0.18em]">BENGOS</span>
        </Link>
        <span className="ml-auto text-xs uppercase tracking-[0.22em] text-[#9eefff]">{placeName(pathname)}</span>
        {status !== "authenticated" ? (
          <Link href="/login" className="text-xs uppercase tracking-[0.16em] text-[#7ef6ff]">
            Konto
          </Link>
        ) : null}
      </header>
      <main id="bengos-main" className="mx-auto max-w-3xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
