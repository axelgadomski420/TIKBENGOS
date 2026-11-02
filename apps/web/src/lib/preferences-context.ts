"use client";

import { createContext, useContext } from "react";

import type { AccessibilityPreferences, RegionSettings } from "@bengos/core";

export type ThemeName = "dark" | "light" | "high-contrast";

export interface PreferencesContextValue {
  theme: ThemeName;
  locale: string;
  accessibility: AccessibilityPreferences;
  region: RegionSettings;
  setTheme: (theme: ThemeName) => void;
  setLocale: (locale: string) => void;
  setAccessibility: (patch: Partial<AccessibilityPreferences>) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/**
 * Rzuca, jeżeli użyte poza dostawcą. Cichy powrót do wartości domyślnej
 * sprawiłby, że ustawienie motywu albo dostępności przestałoby działać bez
 * żadnego sygnału — a to jest błąd, którego użytkownik nie umie zgłosić.
 */
export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences musi być użyte wewnątrz PreferencesProvider.");
  return value;
}
