"use client";

import { createContext, useContext } from "react";

import type { Identity } from "@bengos/core";

/**
 * Stan sesji po stronie przeglądarki.
 *
 * `status` rozdziela „jeszcze nie wiem” (loading) od „wiem — nie jest
 * zalogowany” (anonymous). Bez tego rozróżnienia brama logowania pokazałaby
 * się na moment przy KAŻDYM wejściu, zanim dociągnie się odpowiedź
 * /users/me — i wyglądałoby to jak mignięcie błędu, a nie jak sprawdzenie.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface SessionContextValue {
  identity: Identity | null;
  /** Skrót: `status === "authenticated"`. Zostaje, bo większość czyta tylko to. */
  isAuthenticated: boolean;
  status: SessionStatus;
  /** Ponowny odczyt sesji — po zmianach na koncie, nie przy każdym renderze. */
  refresh: () => Promise<void>;
  /**
   * Wylogowanie.
   *
   * ── DLACZEGO TO POLE WRÓCIŁO ────────────────────────────────────────────
   * Kontrakt sesji rozszerzył się kiedyś o `status` i `refresh`, a `logout`
   * z niego wypadł — mimo że `SessionProvider` dalej go dostarczał.
   * Skutek: build produkcyjny padał w `profile-identity.tsx`
   * komunikatem `Property 'logout' does not exist on type
   * 'SessionContextValue'`, a przycisk „Wyloguj się” na profilu był
   * nieosiągalny.
   *
   * Typ MUSI opisywać wszystko, co dostawca daje. Inaczej każdy konsument
   * tego kontraktu dowiaduje się od kompilatora, że funkcja, którą widzi
   * w działającej aplikacji, nie istnieje.
   *
   * Semantyka jest ta sama co w dostawcy: sesja lokalna znika nawet wtedy,
   * gdy serwer zawiedzie, a użytkownik wraca na pulpit. Trzymanie tożsamości
   * w interfejsie po kliknięciu „wyloguj” byłoby gorszym błędem niż wiszące
   * ciasteczko po stronie serwera.
   */
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession musi być użyte wewnątrz SessionProvider.");
  return value;
}
