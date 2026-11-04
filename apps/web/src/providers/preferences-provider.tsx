"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

/**
 * Preferencje trzymane lokalnie.
 *
 * Kolejność jest przemyślana: najpierw to, co użytkownik ustawił sam, potem
 * to, co wynika z jego systemu, na końcu wartość domyślna. Odwrotna kolejność
 * — nadpisywanie wyboru użytkownika ustawieniem systemowym przy każdym
 * uruchomieniu — to najczęstszy błąd w aplikacjach z motywami. Wybór
 * użytkownika jest nadrzędny i tak zostaje.
 *
 * Trzy miejsca w tym pliku są celowo ostrożne, bo wszystkie trzy są źródłem
 * awarii, której użytkownik nie umie zgłosić:
 *
 * 1. ODCZYT I ZAPIS do pamięci idą przez osobny modul `preferences-storage`,
 *    który obsługuje brak `localStorage` (tryb prywatny, wyłączone dane
 *    witryny) i uszkodzoną wartość. Bez tego jedna zła wartość w pamięci
 *    blokowałaby ekran ustawień na zawsze.
 * 2. ZAPIS JEST OPAKOWANY, więc pełny dysk nie wywala aplikacji — ustawienie
 *    zostaje w pamięci sesji i po prostu nie przetrwa odświeżenia.
 * 3. HYDRAKA „useEffect” ZAMIENIA WARTOŚĆ PO PIERWSZYM RENDERZE. Przy pierwszym
 *    renderze serwer nie zna preferencji, więc wynik musi być taki sam jak
 *    u klienta — inaczej React zgłasza rozjazd hydracji. Ten efekt jest
 *    jednorazowy i wynika z tego, że motyw ustawia przeglądarka, a nie serwer.
 */

const STORAGE_KEY = "bengos.preferences.v1";

interface StoredPreferences {
  theme: ThemeName;
  locale: string;
  accessibility: AccessibilityPreferences;
  region: RegionSettings;
}

function readStored(): Partial<StoredPreferences> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<StoredPreferences>;
  } catch {
    // Uszkodzony zapis to nie powód, żeby wywalić ekran. Czyscimy i idziemy
    // dalej z wartościami domyślnymi.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* brak dostępu do pamięci — nic nie poradzimy, ale też nic nie psujemy */
    }
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
  // Wartość początkowa jest STAŁA i taka sama jak na serwerze: motyw ciemny,
  // język polski, dostępność jak domyślna. Rozpoznanie systemu robi dopiero
  // efekt poniżej — inaczej serwer i klient wyrenderowałyby różne drzewa.
  const [theme, setThemeState] = useState<ThemeName>("dark");
  const [locale, setLocaleState] = useState<string>("pl");
  const [accessibility, setAccessibilityState] = useState<AccessibilityPreferences>(
    DEFAULT_ACCESSIBILITY,
  );

  useEffect(() => {
    if (stored.theme) {
      setThemeState(stored.theme);
    } else {
      setThemeState(prefersDark() ? "dark" : "light");
    }
    if (stored.locale) setLocaleState(stored.locale);
    if (stored.accessibility) {
      setAccessibilityState(stored.accessibility);
    } else {
      setAccessibilityState({
        ...DEFAULT_ACCESSIBILITY,
        reducedMotion: prefersReducedMotion(),
      });
    }
  }, [stored]);

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
        const next = { ...accessibility, ...patch };
        setAccessibilityState(next);
        persist({ theme, locale, accessibility: next, region });
      },
    }),
    [theme, locale, accessibility, region, persist],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
