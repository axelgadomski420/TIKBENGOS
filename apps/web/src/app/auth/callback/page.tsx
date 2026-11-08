import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCallbackClient } from "./callback-client";

export const metadata: Metadata = { title: "Logowanie" };

/**
 * Dokończenie logowania przez dostawcę — gdy dostawca odsyła na interfejs.
 *
 * ── PO CO OSOBNY PLIK Z LOGIKĄ ─────────────────────────────────────────
 * `useSearchParams()` czyta adres, a Next.js przy budowaniu statycznym nie
 * wie, jaki ten adres będzie. Bez granicy `<Suspense>` przerywa build
 * komunikatem:
 *
 *     useSearchParams() should be wrapped in a suspense boundary
 *
 * i to jest błąd twardy — build nie kończy się ostrzeżeniem, a wyjściem
 * z kodem 1. Dlatego ten plik jest komponentem serwerowym i trzyma tylko
 * `metadata` oraz granicę, a cała logika mieszka w `callback-client.tsx`.
 *
 * Ta sama zasada obowiązuje w `login/page.tsx` — stąd identyczny podział
 * na plik serwerowy i plik z `"use client"`.
 *
 * `fallback` jest tym, co widać w ułamku sekundy przed hydracją. Mówi
 * prawdę: wymiana kodu trwa.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12">
          <section className="bengos-surface-card">
            <h1 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
              Logowanie
            </h1>
            <p className="mt-2 text-[var(--bengos-text-muted)]">Dokańczam logowanie…</p>
          </section>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
