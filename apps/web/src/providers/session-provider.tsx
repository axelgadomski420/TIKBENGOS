"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Identity } from "@bengos/core";

import { apiFetch } from "@/lib/api-client";
import { SessionContext, type SessionContextValue, type SessionStatus } from "@/lib/session-context";

/**
 * Sesja po stronie przeglądarki.
 *
 * ── TOŻSAMOŚĆ JEST DOCIĄGANA TUTAJ — obiecane w layout.tsx, wykonane tu ──
 * Komentarz w layout.tsx mówił „tożsamość dociąga SessionProvider po stronie
 * klienta”, ale ten dostawca NIGDY nie wykonywał żądania: `initialIdentity`
 * szło jako `null` i tak zostawało na zawsze. Skutek: `isAuthenticated`
 * było zawsze fałszywe — moduły chowały wejścia wymagające uprawnień, panel
 * asystenta prosił o logowanie człowieka, który BYŁ zalogowany, a po udanym
 * logowaniu przeładowanie strony i tak nie zmieniało niczego w kontekście.
 *
 * Teraz przy montażu leci `GET /api/users/me`. Odpowiedź 200 daje tożsamość;
 * 401, przekroczony czas albo niedostępny serwer daje stan anonima — uczciwie,
 * zgodnie z zasadą z session-reader.ts: nie twierdzimy, że ktoś jest
 * zalogowany, dopóki nie wiemy, że jest.
 */
export function SessionProvider({
  children,
  initialIdentity = null,
}: {
  children: React.ReactNode;
  initialIdentity?: Identity | null;
}) {
  const [identity, setIdentity] = useState<Identity | null>(initialIdentity);
  const [status, setStatus] = useState<SessionStatus>(
    initialIdentity ? "authenticated" : "loading",
  );

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch<Identity>("/api/users/me");
      setIdentity(me);
      setStatus("authenticated");
    } catch {
      // Brak sesji (401), przekroczony czas, serwer niedostępny — wszystko
      // znaczy to samo i nic z tego nie jest awarią ekranu. Użytkownik po
      // prostu nie jest zalogowany, dopóki się nie zaloguje.
      setIdentity(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    // Gdy serwer przekazał tożsamość na starcie, nie pytamy drugi raz —
    // pierwsze żądanie już to wie. W layoutu dziś jest null, ale kontrakt
    // dostawcy ma działać także wtedy, kiedy ktoś go kiedyś odzyska.
    if (initialIdentity) return;
    void refresh();
  }, [initialIdentity, refresh]);

  const value: SessionContextValue = useMemo(
    () => ({
      identity,
      isAuthenticated: identity !== null,
      status,
      refresh,
      logout: async () => {
        try {
          await apiFetch<void>("/api/auth/logout", { method: "POST" });
        } catch {
          // Wylogowanie lokalne wykonuje się nawet gdy serwer zawiedzie —
          // trzymanie sesji w interfejsie po kliknięciu „wyloguj” jest
          // gorszym błędem niż wiszące ciasteczko po stronie serwera.
        }
        setIdentity(null);
        setStatus("anonymous");
        window.location.assign("/");
      },
    }),
    [identity, status, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
