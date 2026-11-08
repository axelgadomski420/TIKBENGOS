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
 * ── PALETA PROSTO Z GRAFIK MARKI ────────────────────────────────────────
 * Wartości pochodzą z grafik właściciela: tło ekranu logowania to granat
 * #0A0E18, świeżący cyjan to #00F7FF, a złoto-pomarańcz tygrysa (#FFAB4D)
 * pracuje w roli ostrzeżenia — tak samo jak na obrazku, gdzie pomarańcz
 * świeci przy krawędzi okręgu. Właściciel wskazał ten zestaw jako motyw
 * główny; motyw jasny i kontrastowy zostają przy swoich zadaniach.
 *
 * ── DLACZEGO WARSTW SĄ TRZY ─────────────────────────────────────────────
 * Tło, karta (#131C2E) i pole (#060A12) różnią się na tyle, żeby czarny
 * prostokąt grafiki marki miał na czym siedzieć — ale nie na tyle, żeby
 * rozbić ciemny charakter ekranu z grafiki. Granat jest WIDOCZNY jako
 * granat, a nie prawie-czerń zlewająca się z obrazkiem.
 *
 * ── WARTOŚCI SĄ POLICZONE, NIE WYBRANE NA OKO ───────────────────────────
 * Każda para tekstu i tła została policzona metodą WCAG 2.2 przed wpisaniem,
 * a `contrast.test.ts` liczy je ponownie przy każdym uruchomieniu testów.
 * Ciemny motyw: tekst 17,23; drugorzędny 9,16; akcent jako tekst 14,46;
 * ostrzeżenie 10,27; błąd 6,97; obramowanie aktywne 3,49 (próg UI 3:1);
 * obramowanie subtelne 1,53 (próg widoczności 1,4). Poświata (4,24) celowo
 * NIE przechodzi progu tekstu 4,5:1 — poświata jest dekoracją, nie kolorem
 * napisu, i test „poświata nigdy nie jest tekstem" tego pilnuje.
 */
const DARK: Palette = {
  surface: "#0A0E18",
  surfaceRaised: "#131C2E",
  surfaceSunken: "#060A12",
  border: "#26334D",
  borderStrong: "#51689B",
  text: "#EAF3FF",
  textMuted: "#9FB4D6",
  textOnAccent: "#031318",
  accent: "#00F7FF",
  accentMuted: "#0D3440",
  glow: "#14809F",
  success: "#4ADE80",
  warning: "#FFAB4D",
  danger: "#F87171",
};

/**
 * Motyw jasny zachowuje ten sam charakter: chłodne tło i cyjanowy akcent,
 * tylko odwrócone. Akcent jest ciemniejszy, bo na jasnym tle jasny cyjan
 * byłby nieczytelny.
 *
 * `textOnAccent` jest tu #FFFFFF, nie ciemny granat. Ciemne dawało na
 * akcencie 3,54:1 — poniżej progu 4,5:1 — a ten kolor pojawia się na akcencie
 * w każdym przycisku głównym, więc musi przechodzić z zapasem. Białe daje
 * 5,36:1.
 *
 * `borderStrong` to #6480B8, bo jaśniejszy odcień dawał na tle 2,2:1 —
 * poniżej progu 3:1 dla elementów interfejsu. Obecny daje 3,71:1.
 */
const LIGHT: Palette = {
  surface: "#F5F8FF",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#E7EEFB",
  border: "#C6D3EC",
  borderStrong: "#6480B8",
  text: "#0A1020",
  textMuted: "#4A5A78",
  textOnAccent: "#FFFFFF",
  accent: "#0E7490",
  accentMuted: "#CDE9F2",
  glow: "#0891B2",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B91C1C",
};

/**
 * Motyw o wysokim kontraście nie jest „ciemnym z mocniejszym tekstem".
 * Ma własne tło, własne obramowania i własny akcent, bo jego zadaniem jest
 * przekroczenie progu AA z zapasem, także dla tekstu drugorzędnego.
 *
 * Tu warstwy NIE idą w górę: czysta czerń i czysta biel są tym, czego ten
 * tryb wymaga. Rozjaśnianie tła „dla epickości" byłoby tu błędem, nie
 * ulepszeniem — i dlatego te wartości zostają.
 *
 * `glow` to #1E7086, nie jasny cyjan: poświata jest dekoracją i NIE MOŻE
 * przechodzić progu tekstu (test „poświata nigdy nie jest tekstem").
 * #1E7086 daje na czerni 3,72:1 — widoczna dekoracja poniżej progu 4,5:1.
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
  glow: "#1E7086",
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
