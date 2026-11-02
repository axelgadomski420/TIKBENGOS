"use client";

import { useCallback, useMemo, useState } from "react";

import {
  DEFAULT_ACCESSIBILITY,
  DEFAULT_REGION,
  type AccessibilityPreferences,
  type RegionSettings,
} from "@bengos/core";

import {
  PreferencesContext,
  type PreferencesContextValue,
  type ThemeName,
} from "@/lib/preferences-context";

interface StoredPreferences {
  theme: ThemeName;
  locale: string;
  accessibility: AccessibilityPreferences;
  region: RegionSettings;
}

const STORAGE_KEY = "bengos.preferences.v1";

/**
 * Preferencje trzymane lokalnie.
 *
 * Kolejność jest przemyślana: najpierw to, co użytkownik ustawił sam, potem
 * to, co wynika z jego systemu, na końcu wartość domyślna. Odwrotna kolejność
 * — nadpisywanie wyboru użytkownika ustawieniem systemowym przy każdym
 * uruchomieniu — to najczęstszy błąd w aplikacjach z motywami. Wybór
 * użytkownika jest nadrzędny i tak zostaje.
 */
function readStored(): Partial<StoredPreferences> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredPreferences>) : {};
  } catch {
    return {};
  }
}

function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [stored] = useState<Partial<StoredPreferences>>(readStored);
  const [theme, setThemeState] = useState<ThemeName>(
    stored.theme ?? (prefersDark() ? "dark" : "light"),
  );
  const [locale, setLocaleState] = useState<string>(stored.locale ?? "pl");
  const [accessibility, setAccessibilityState] = useState<AccessibilityPreferences>(
    stored.accessibility ?? { ...DEFAULT_ACCESSIBILITY, reducedMotion: prefersReducedMotion() },
  );

  const region = stored.region ?? DEFAULT_REGION;

  const persist = useCallback((next: StoredPreferences) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Brak dostępu do localStorage (tryb prywatny, pełny dysk) nie może
      // wywalić aplikacji. Preferencje zostaną w pamięci na czas sesji.
    }
  }, []);

  const value: PreferencesContextValue = useMemo(
    () => ({
      theme,
      locale,
      accessibility,
      region,
      setTheme: (next) => {
        setThemeState(next);
        persist({ theme: next, locale, accessibility, region });
      },
      setLocale: (next) => {
        setLocaleState(next);
        persist({ theme, locale: next, accessibility, region });
      },
      setAccessibility: (patch) => {
        const next = { ...accessibility, ...patch, updatedAt: new Date().toISOString() };
        setAccessibilityState(next);
        persist({ theme, locale, accessibility: next, region });
      },
    }),
    [theme, locale, accessibility, region, persist],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
