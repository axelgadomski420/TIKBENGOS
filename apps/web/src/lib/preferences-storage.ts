import type { AccessibilityPreferences } from "@bengos/core";

/**
 * Zapis preferencji między sesjami.
 *
 * Osobny plik, a nie kod w dostawcy, bo odczyt i zapis muszą radzić sobie
 * z trzema przypadkami, których nie da się obsłużyć w jednym miejscu: brak
 * `localStorage` (tryb prywatny, wyłączone dane witryny), uszkodzona wartość
 * i brak wszystkich pól. Każdy z nich kończy się powrotem do wartości
 * domyślnych, a nie błędem na ekranie.
 *
 * Wersja klucza jest w nazwie, bo zmiana kształtu preferencji bez zmiany
 * klucza czytałaby stary zapis i pokazywała ustawienia, których użytkownik
 * nie wybrał.
 *
 * Typ `AccessibilityPreferences` pochodzi z `@bengos/core`, a nie
 * z `./preferences-context` — tamten plik go tylko importuje, więc nie ma
 * czego eksportować. Wcześniejsza wersja wskazywała zły moduł i build
 * produkcyjny przerywał się komunikatem o typie, którego nie ma.
 */

export const STORAGE_KEY = "tikbengos.preferences.v1";

export interface StoredPreferences {
  theme?: string;
  locale?: string;
  accessibility?: Partial<AccessibilityPreferences>;
}

export function readStoredPreferences(): StoredPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as StoredPreferences;
  } catch {
    // Uszkodzony zapis to nie powód, żeby wywalić ekran. Czyścimy i idziemy
    // dalej z wartościami domyślnymi — inaczej jedna zła wartość w pamięci
    // blokowałaby ustawienia na zawsze.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* brak dostępu do pamięci — nic nie poradzimy, ale też nic nie psujemy */
    }
    return null;
  }
}

export function writeStoredPreferences(value: StoredPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Brak miejsca albo brak dostępu. Preferencja zostaje w pamięci sesji,
    // więc ustawienie działa — po prostu nie przetrwa odświeżenia.
  }
}
