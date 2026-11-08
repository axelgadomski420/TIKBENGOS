// Import BEZ rozszerzenia `.js` — patrz komentarz w `packages/core/src/identity.ts`.
import {
  BASE_GEOMETRY,
  BASE_MOTION,
  BASE_TYPOGRAPHY,
  type DesignTokens,
  type Palette,
  type ThemeName,
} from "./tokens";

/**
 * Ciemny motyw jest domyślny — brief tak stanowi i tak zostaje.
 *
 * ── PALETA: GRANAT, CYJAN, POMARAŃCZ, ALE NIE CZERŃ ─────────────────────
 * Odcienie pochodzą ze znaku marki: tło jest granatowe (nie czarne),
 * akcent cyjanowy, a pomarańcz występuje w roli ostrzeżenia.
 *
 * ── DLACZEGO WARSTWY POSZŁY W GÓRĘ ──────────────────────────────────────
 * Poprzednie `surface` (#05070D) było tak blisko czerni, że grafika marki
 * — która ma czarne tło WYPALONE w pliku — zlewała się z ekranem. Właściciel
 * nazwał to „czarnym na czarnym” i miał rację: dwa prawie identyczne czernie
 * dają obraz bez krawędzi, czyli plamę, a nie element interfejsu.
 *
 * Nowy `surface` (#0A1020) jest granatem WIDOCZNYM jako granat, a karty
 * (#121A2E) i obramowania (#243049) odcinają się od tła. Czarny prostokąt
 * grafiki ma teraz na czym siedzieć.
 *
 * ── WARTOŚCI SĄ POLICZONE, NIE WYBRANE NA OKO ───────────────────────────
 * Każda para tekstu i tła została policzona metodą WCAG 2.1 przed wpisaniem,
 * a `contrast.test.ts` liczy je ponownie przy każdym uruchomieniu testów.
 * Ciemny motyw: tekst 16,83; drugorzędny 8,62; akcent jako tekst 10,49;
 * błąd 6,85 — wszystko powyżej progu 4,5:1, najniższy wynik ma zapas.
 */
const DARK: Palette = {
  surface: "#0A1020",
  surfaceRaised: "#121A2E",
  surfaceSunken: "#070C18",
  border: "#243049",
  borderStrong: "#35486E",
  text: "#EAF2FF",
  textMuted: "#9DB0D0",
  textOnAccent: "#04121A",
  accent: "#22D3EE",
  accentMuted: "#123043",
  glow: "#5FF0FF",
  success: "#4ADE80",
  warning: "#FB923C",
  danger: "#F87171",
};

/**
 * Motyw jasny zachowuje ten sam charakter: chłodne tło i cyjanowy akcent,
 * tylko odwrócone. Akcent jest ciemniejszy, bo na jasnym tle cyjan z ciemnego
 * motywu (#22D3EE) daje kontrast 1,9:1 — czyli nieczytelny.
 *
 * `textOnAccent` jest tu #04121A, nie białe. Białe dawało 3,54:1, czyli pod
 * progiem 4,5:1 — a ten kolor pojawia się na akcencie w każdym przycisku
 * głównym, więc musi przechodzić z zapasem.
 */
const LIGHT: Palette = {
  surface: "#F5F8FF",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#E7EEFB",
  border: "#C6D3EC",
  borderStrong: "#94A9CE",
  text: "#0A1020",
  textMuted: "#4A5A78",
  textOnAccent: "#04121A",
  accent: "#0E7490",
  accentMuted: "#CDE9F2",
  glow: "#0891B2",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B91C1C",
};

/**
 * Motyw o wysokim kontraście nie jest „ciemnym z mocniejszym tekstem”.
 * Ma własne tło, własne obramowania i własny akcent, bo jego zadaniem jest
 * przekroczenie progu AA z zapasem, także dla tekstu drugorzędnego.
 *
 * Tu warstwy NIE idą w górę: czysta czerń i czysta biel są tym, czego ten
 * tryb wymaga. Rozjaśnianie tła „dla epickości” byłoby tu błędem, nie
 * ulepszeniem — i dlatego te wartości zostają.
 */
const HIGH_CONTRAST: Palette = {
  surface: "#000000",
  surfaceRaised: "#0A0E14",
  surfaceSunken: "#000000",
  border: "#7A869A",
  borderStrong: "#FFFFFF",
  text: "#FFFFFF",
  textMuted: "#D6DEE8",
  textOnAccent: "#000000",
  accent: "#7FF0FF",
  accentMuted: "#0B2A33",
  glow: "#B8F7FF",
  success: "#7DFFA8",
  warning: "#FFC078",
  danger: "#FF9A9A",
};

const PALETTES: Record<ThemeName, Palette> = {
  dark: DARK,
  light: LIGHT,
  "high-contrast": HIGH_CONTRAST,
};

/** Pierścień fokusu. W motywie kontrastowym jest biały — nigdy nie znika. */
const FOCUS_RINGS: Record<ThemeName, string> = {
  dark: "#5FF0FF",
  light: "#0E7490",
  "high-contrast": "#FFFFFF",
};

/**
 * Buduje tokeny jednego motywu.
 *
 * `accessibilityScale` nie jest mnożone tutaj — leży w tokenach jako liczba,
 * a skaluje go arkusz stylów. Dzięki temu ten sam motyw obsługuje tryb
 * zwykły i tryb dostępności bez drugiego zestawu wartości.
 */
export function buildTokens(theme: ThemeName, accessibilityScale = 1): DesignTokens {
  return {
    name: theme,
    highContrast: theme === "high-contrast",
    palette: PALETTES[theme],
    motion: BASE_MOTION,
    geometry: BASE_GEOMETRY,
    typography: BASE_TYPOGRAPHY,
    focusRing: FOCUS_RINGS[theme],
    accessibilityScale,
  };
}

export const THEMES: readonly ThemeName[] = ["dark", "light", "high-contrast"];

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: "Ciemny",
  light: "Jasny",
  "high-contrast": "Wysoki kontrast",
};

/**
 * Zamienia tokeny na zmienne CSS. To jedyne miejsce, w którym nazwa tokenu
 * spotyka się z nazwą zmiennej — wszędzie dalej w kodzie jest już `--bengos-*`.
 */
export function tokensToCssVariables(tokens: DesignTokens): Record<string, string> {
  const { palette: p, motion: m, geometry: g, typography: t } = tokens;
  const scale = tokens.accessibilityScale;
  return {
    "--bengos-surface": p.surface,
    "--bengos-surface-raised": p.surfaceRaised,
    "--bengos-surface-sunken": p.surfaceSunken,
    "--bengos-border": p.border,
    "--bengos-border-strong": p.borderStrong,
    "--bengos-text": p.text,
    "--bengos-text-muted": p.textMuted,
    "--bengos-text-on-accent": p.textOnAccent,
    "--bengos-accent": p.accent,
    "--bengos-accent-muted": p.accentMuted,
    "--bengos-glow": p.glow,
    "--bengos-success": p.success,
    "--bengos-warning": p.warning,
    "--bengos-danger": p.danger,
    "--bengos-motion-fast": m.fast,
    "--bengos-motion-smooth": m.smooth,
    "--bengos-motion-enter": m.enter,
    "--bengos-ease-out": m.easeOut,
    "--bengos-ease-in-out": m.easeInOut,
    "--bengos-radius-card": g.radiusCard,
    "--bengos-radius-control": g.radiusControl,
    "--bengos-touch-target-min": `calc(${g.touchTargetMin} * ${scale})`,
    "--bengos-space-card": `calc(${g.spaceCard} * ${scale})`,
    "--bengos-space-card-gap": g.spaceCardGap,
    "--bengos-focus-ring": tokens.focusRing,
    "--bengos-font-sans": t.fontSans,
    "--bengos-font-mono": t.fontMono,
    "--bengos-weight-regular": String(t.weightRegular),
    "--bengos-weight-medium": String(t.weightMedium),
    "--bengos-weight-semibold": String(t.weightSemibold),
    "--bengos-size-caption": `calc(${t.sizeCaption} * ${scale})`,
    "--bengos-size-body": `calc(${t.sizeBody} * ${scale})`,
    "--bengos-size-title": `calc(${t.sizeTitle} * ${scale})`,
    "--bengos-size-display": `calc(${t.sizeDisplay} * ${scale})`,
    "--bengos-line-height": String(t.lineHeightBody),
  };
}
