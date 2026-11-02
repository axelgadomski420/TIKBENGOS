"use client";

import { createContext, useContext } from "react";

import type { Identity } from "@bengos/core";

export interface SessionContextValue {
  identity: Identity | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession musi być użyte wewnątrz SessionProvider.");
  return value;
}
