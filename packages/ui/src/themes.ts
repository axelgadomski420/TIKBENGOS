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
 * Wartości są dobrane tak, żeby każda para tekstu i tła przechodziła próg
 * WCAG 2.2 AA. Nie są ustalane „na oko”: `contrast.test.ts` liczy je
 * i każda zmiana, która spadnie pod próg, jest odrzucana przez test.
 */
const DARK: Palette = {
  surface: "#0B0B0F",
  surfaceRaised: "#14141A",
  surfaceSunken: "#08080B",
  border: "#2A2A34",
  borderStrong: "#4A4A58",
  text: "#F5F5F7",
  textMuted: "#A0A0AE",
  textOnAccent: "#0B0B0F",
  accent: "#7C5CFF",
  accentMuted: "#241B47",
  glow: "#9B7DFF",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
};

const LIGHT: Palette = {
  surface: "#F7F7F9",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#EDEDF1",
  border: "#D8D8E0",
  borderStrong: "#9A9AAB",
  text: "#101014",
  textMuted: "#5A5A6B",
  textOnAccent: "#FFFFFF",
  accent: "#5B3DE0",
  accentMuted: "#ECE7FF",
  glow: "#7C5CFF",
  success: "#166534",
  warning: "#92400E",
  danger: "#B91C1C",
};

/**
 * Motyw o wysokim kontraście nie jest „ciemnym z mocniejszym tekstem”.
 * Ma własne tło, własne obramowania i własny akcent, bo jego zadaniem jest
 * przekroczenie progu AA z zapasem, także dla tekstu drugorzędnego.
 */
const HIGH_CONTRAST: Palette = {
  surface: "#000000",
  surfaceRaised: "#0A0A0A",
  surfaceSunken: "#000000",
  border: "#6E6E7A",
  borderStrong: "#FFFFFF",
  text: "#FFFFFF",
  textMuted: "#D0D0D8",
  textOnAccent: "#000000",
  accent: "#C3B1FF",
  accentMuted: "#1A1030",
  glow: "#E0D6FF",
  success: "#7DFFA8",
  warning: "#FFD166",
  danger: "#FF9A9A",
};

const PALETTES: Record<ThemeName, Palette> = {
  dark: DARK,
  light: LIGHT,
  "high-contrast": HIGH_CONTRAST,
};

/** Pierścień fokusu. W motywie kontrastowym jest biały — nigdy nie znika. */
const FOCUS_RINGS: Record<ThemeName, string> = {
  dark: "#9B7DFF",
  light: "#5B3DE0",
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
