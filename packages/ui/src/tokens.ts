/**
 * Tokeny design systemu BENGOS.
 *
 * Nazwy są te same, które ustala brief — bez skrótów i bez wymyślania
 * nowych. Każdy token ma wariant w każdym motywie i to jest jedyne miejsce,
 * w którym definiuje się kolor, ruch albo promień. Komponenty nie mają
 * prawa zawierać wartości koloru ani czasu trwania animacji.
 */

export type ThemeName = "dark" | "light" | "high-contrast";

/** Paleta semantyczna jednego motywu. */
export interface Palette {
  /** Tło całej aplikacji — najciemniejsza warstwa. */
  surface: string;
  /** Powierzchnia podniesiona: karty, panele, arkusze. */
  surfaceRaised: string;
  /** Powierzchnia wciśnięta: pola, listy, strefy przewijania. */
  surfaceSunken: string;
  /** Obramowanie o niskim kontraście — oddziela bez przyciągania wzroku. */
  border: string;
  /** Obramowanie aktywne: stan fokusu elementu, na którym stoi wzrok. */
  borderStrong: string;
  /** Tekst podstawowy. */
  text: string;
  /** Tekst drugorzędny — metadane, podpisy. */
  textMuted: string;
  /** Tekst na powierzchni akcentu. */
  textOnAccent: string;
  /** Kolor akcentu. Jeden na motyw, nigdy dwa. */
  accent: string;
  /** Akcent przygaszony: tło pod akcentem bez nasycenia. */
  accentMuted: string;
  /** Poświata. Używana oszczędnie — jeden element na ekran. */
  glow: string;
  success: string;
  warning: string;
  danger: string;
}

/** Czasy i krzywe ruchu. */
export interface Motion {
  /** Mikrointerakcje: naciśnięcie, przełączenie, pojawienie się podpowiedzi. */
  fast: string;
  /** Przejścia między widokami i rozłożenie kart. */
  smooth: string;
  /** Wejście elementu, który pojawia się pierwszy raz na ekranie. */
  enter: string;
  /** Krzywa dla ruchu wchodzącego — szybki start, łagodne zatrzymanie. */
  easeOut: string;
  /** Krzywa dla ruchu w obie strony — łagodna na obu końcach. */
  easeInOut: string;
}

export interface Geometry {
  /** Promień karty i dużych powierzchni. */
  radiusCard: string;
  /** Promień kontrolek: przycisków, pól, pigułek. */
  radiusControl: string;
  /** Minimalny wymiar celu dotykowego. Poniżej tego nie schodzimy. */
  touchTargetMin: string;
  /** Odstęp wewnątrz karty. */
  spaceCard: string;
  /** Odstęp między kartami na pulpicie. */
  spaceCardGap: string;
}

export interface Typography {
  fontSans: string;
  fontMono: string;
  /** Wagi dostępne w systemie; więcej nie jest potrzebne. */
  weightRegular: number;
  weightMedium: number;
  weightSemibold: number;
  /** Skala rozmiarów. `accessibilityScale` mnoży te wartości. */
  sizeCaption: string;
  sizeBody: string;
  sizeTitle: string;
  sizeDisplay: string;
  lineHeightBody: number;
}

/**
 * Zestaw tokenów, który trafia do CSS jako zmienne.
 *
 * Nazwy w CSS: `--bengos-surface`, `--bengos-accent`, `--bengos-glow`,
 * `--bengos-motion-fast`, `--bengos-motion-smooth`, `--bengos-radius-card`,
 * `--bengos-focus-ring` — zgodnie z briefem.
 */
export interface DesignTokens {
  name: ThemeName;
  /** Czy motyw sam w sobie jest kontrastowy. Czytane przez test i przez audyt. */
  highContrast: boolean;
  palette: Palette;
  motion: Motion;
  geometry: Geometry;
  typography: Typography;
  /** Kolor pierścienia fokusu — zawsze widoczny, nigdy przezroczysty. */
  focusRing: string;
  /**
   * Skala trybu dostępności. `1` w motywach zwykłych, więcej w trybie
   * dostępności — mnoży rozmiary typografii i minimalny cel dotykowy.
   */
  accessibilityScale: number;
}

/**
 * Ruch przy ograniczeniu animacji.
 *
 * Uwaga na to, co tu się dzieje: przy `prefers-reduced-motion` animacje
 * nie są wyłączane, tylko sprowadzone do 1 ms. Wyłączenie byłoby zmianą
 * zachowania — element, który się nie pojawia, jest błędem, a nie
 * udogodnieniem. Skrócenie do zera zostawia funkcję i zabiera ruch.
 */
export const REDUCED_MOTION: Motion = {
  fast: "1ms",
  smooth: "1ms",
  enter: "1ms",
  easeOut: "linear",
  easeInOut: "linear",
};

/** Wartości bazowe, wspólne dla wszystkich motywów. */
export const BASE_MOTION: Motion = {
  fast: "140ms",
  smooth: "320ms",
  enter: "420ms",
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
};

export const BASE_GEOMETRY: Geometry = {
  radiusCard: "20px",
  radiusControl: "12px",
  touchTargetMin: "44px",
  spaceCard: "20px",
  spaceCardGap: "16px",
};

export const BASE_TYPOGRAPHY: Typography = {
  fontSans:
    "ui-sans-serif, -apple-system, 'Segoe UI', Inter, 'Helvetica Neue', Arial, sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, monospace",
  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,
  sizeCaption: "0.8125rem",
  sizeBody: "1rem",
  sizeTitle: "1.375rem",
  sizeDisplay: "2.125rem",
  lineHeightBody: 1.55,
};
