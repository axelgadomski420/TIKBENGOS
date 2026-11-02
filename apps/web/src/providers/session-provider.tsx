"use client";

import { useMemo, useState } from "react";

import type { Identity } from "@bengos/core";

import { apiFetch } from "@/lib/api-client";
import { SessionContext, type SessionContextValue } from "@/lib/session-context";

/**
 * Sesja po stronie przeglądarki.
 *
 * Serwerowy odczyt sesji dzieje się w `readSession()` i przekazuje wynik do
 * tego dostawcy jako wartość początkową. Dzięki temu pierwszy render nie
 * pokazuje migającego „nie zalogowany”, a wylogowanie nie wymaga przeładowania.
 */
export function SessionProvider({
  children,
  initialIdentity = null,
}: {
  children: React.ReactNode;
  initialIdentity?: Identity | null;
}) {
  const [identity, setIdentity] = useState<Identity | null>(initialIdentity);

  const value: SessionContextValue = useMemo(
    () => ({
      identity,
      isAuthenticated: identity !== null,
      logout: async () => {
        try {
          await apiFetch<void>("/api/auth/logout", { method: "POST" });
        } catch {
          // Wylogowanie lokalne wykonuje się nawet gdy serwer zawiedzie —
          // trzymanie sesji w interfejsie po kliknięciu „wyloguj” jest
          // gorszym błędem niż wiszące ciasteczko po stronie serwera.
        }
        setIdentity(null);
        window.location.assign("/");
      },
    }),
    [identity],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
