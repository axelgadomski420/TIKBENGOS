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
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession musi być użyte wewnątrz SessionProvider.");
  return value;
}
