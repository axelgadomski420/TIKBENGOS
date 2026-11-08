import type { Metadata } from "next";

export const metadata: Metadata = { title: "BENGOS" };

/**
 * KORZEŃ — PUSTY.
 *
 * Ten plik NIE może renderować pulpitu ani żadnej treści zależnej od sesji.
 * Next.js wstawia {children} do HTML-u dla KAŻDEGO wejścia.
 * Cała decyzja (brama vs pulpit) należy wyłącznie do AppShell.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return null;
}
