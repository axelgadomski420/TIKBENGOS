"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Identity } from "@bengos/core";

import { apiFetch } from "@/lib/api-client";
import { SessionContext, type SessionContextValue } from "@/lib/session-context";

/**
 * Sesja po stronie przeglądarki.
 *
 * Wartość początkowa z serwera jest przekazywana z `layout.tsx` i od razu
 * ma prawdziwy stan użytkownika. Przy pierwszym wejściu nie ma migania
 * „nie zalogowany”, a `refresh()` uzupełnia stan po stronie klienta, jeśli
 * sesja pojawiła się po renderze albo po wywołaniu `logout()` i ponownym
 * zalogowaniu.
 */
export function SessionProvider({
  children,
  initialIdentity = null,
}: {
  children: React.ReactNode;
  initialIdentity?: Identity | null;
}) {
  const [identity, setIdentity] = useState<Identity | null>(initialIdentity);

  const refresh = useCallback(async () => {
    try {
      const next = await apiFetch<Identity>("/api/users/me", { method: "GET" });
      setIdentity(next);
      return next;
    } catch {
      setIdentity(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (initialIdentity !== null) return;
    void refresh();
  }, [initialIdentity, refresh]);

  const value: SessionContextValue = useMemo(
    () => ({
      identity,
      isAuthenticated: identity !== null,
      refresh,
      logout: async () => {
        try {
          await apiFetch<void>("/api/auth/logout", { method: "POST" });
        } catch {
          // Wylogowanie lokalne wykonuje się nawet gdy serwer zawiedzie — to
          // jest lepsze niż wisząca sesja po stronie klienta.
        }
        setIdentity(null);
        window.location.assign("/");
      },
    }),
    [identity, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
