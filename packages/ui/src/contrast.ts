/**
 * Liczenie kontrastu wg WCAG 2.2.
 *
 * Ten plik istnieje po to, żeby próg AA był sprawdzany maszynowo, a nie
 * deklarowany. Kolor, który dobrze wygląda i nie przechodzi progu, jest
 * odrzucany — to jest cały sens tego kodu.
 */

/** Rozbija zapis szesnastkowy na kanały 0–255. Rzuca na zapisie, którego nie rozumie. */
export function parseHex(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Nieprawidłowy zapis koloru: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Luminancja względna wg definicji WCAG. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Współczynnik kontrastu między dwoma kolorami, od 1 do 21.
 * Kolejność argumentów nie ma znaczenia.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Progi z WCAG 2.2: 4.5:1 dla tekstu zwykłego, 3:1 dla dużego i elementów UI. */
export const AA_NORMAL_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
export const AA_NON_TEXT = 3;

export function meetsAA(foreground: string, background: string, large = false): boolean {
  return contrastRatio(foreground, background) >= (large ? AA_LARGE_TEXT : AA_NORMAL_TEXT);
}

/**
 * Formatuje wynik do raportu. Używane przez test i przez przegląd dostępności,
 * żeby ten sam próg był pokazywany tak samo w obu miejscach.
 */
export function describeContrast(foreground: string, background: string): string {
  const ratio = contrastRatio(foreground, background);
  const verdict = ratio >= AA_NORMAL_TEXT ? "AA" : ratio >= AA_LARGE_TEXT ? "tylko duży tekst" : "poniżej progu";
  return `${foreground} na ${background}: ${ratio.toFixed(2)}:1 (${verdict})`;
}
