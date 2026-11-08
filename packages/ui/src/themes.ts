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
 * ── PALETA: GRANAT, CYJAN, POMARAŃCZ ───────────────────────────────────
 * Odcienie pochodzą ze znaku marki: tło jest granatowo-czarne (nie czarne),
 * akcent cyjanowy, a pomarańcz występuje w roli ostrzeżenia — tak samo jak
 * na grafice, gdzie świeci przy krawędzi kuli.
 *
 * Wartości NIE SĄ dobrane „na oko”. Każda para tekstu i tła została
 * policzona przed wpisaniem, a `contrast.test.ts` liczy je ponownie przy
 * każdym uruchomieniu testów. Najniższy wynik w tej palecie to 7,28:1
 * (błąd na tle), przy wymaganym progu 4,5:1 — jest zapas, nie styk.
 *
 * ── DLACZEGO TŁO NIE JEST CZYSTE CZARNE ────────────────────────────────
 * `#000000` przyjmuje się na ekranach OLED jako „nieskończoną czerń”, ale
 * na zwykłym panelu LCD wygląda jak wyłączony fragment ekranu. Granatowa
 * czerń `#05070D` daje głębię na obu, a przy okazji pozwala cyjanowi
 * świecić — na czystej czerni cyjan wygląda płasko.
 */
const DARK: Palette = {
  surface: "#05070D",
  surfaceRaised: "#0C1018",
  surfaceSunken: "#03050A",
  border: "#232A38",
  borderStrong: "#4A5468",
  text: "#F2F7FA",
  textMuted: "#9BA8BC",
  textOnAccent: "#04121A",
  accent: "#22D3EE",
  accentMuted: "#0B2A33",
  glow: "#38E8FF",
  success: "#4ADE80",
  warning: "#FB923C",
  danger: "#F87171",
};

/**
 * Motyw jasny zachowuje ten sam charakter: chłodne tło i cyjanowy akcent,
 * tylko odwrócone. Akcent jest ciemniejszy, bo na jasnym tle cyjan z ciemnego
 * motywu (`#22D3EE`) daje kontrast 1,9:1 — czyli nieczytelny.
 */
const LIGHT: Palette = {
  surface: "#F4F7FA",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#E6ECF2",
  border: "#C9D4E0",
  borderStrong: "#8294A8",
  text: "#0A1119",
  textMuted: "#4A5768",
  textOnAccent: "#FFFFFF",
  accent: "#0E7490",
  accentMuted: "#D6F2F8",
  glow: "#0891B2",
  success: "#166534",
  warning: "#9A3412",
  danger: "#B91C1C",
};

/**
 * Motyw o wysokim kontraście nie jest „ciemnym z mocniejszym tekstem”.
 * Ma własne tło, własne obramowania i własny akcent, bo jego zadaniem jest
 * przekroczenie progu AA z zapasem, także dla tekstu drugorzędnego.
 *
 * Akcent cyjanowy jest tu jaśniejszy niż w ciemnym motywie — na czerni
 * `#22D3EE` przechodzi, ale `#7FF0FF` ma zapas widoczny przy powiększeniu.
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
  dark: "#38E8FF",
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
