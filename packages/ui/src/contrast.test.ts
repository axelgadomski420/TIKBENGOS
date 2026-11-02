import assert from "node:assert/strict";
import test from "node:test";

import { AA_NON_TEXT, AA_NORMAL_TEXT, contrastRatio, meetsAA } from "./contrast.ts";
import { THEMES, buildTokens } from "./themes.ts";
import type { Palette } from "./tokens.ts";

/**
 * Pary, które muszą przechodzić próg AA w KAŻDYM motywie.
 *
 * Ten test jest bramką, nie raportem. Jeżeli zmiana koloru go psuje, zmiana
 * nie wchodzi. Dopisanie wyjątku do listy wymaga zmiany progu, a to jest
 * decyzja produktowa, nie poprawka stylu.
 */
const COMBINATIONS: { name: string; fg: keyof Palette; bg: keyof Palette; large?: boolean }[] = [
  { name: "tekst na tle", fg: "text", bg: "surface" },
  { name: "tekst na karcie", fg: "text", bg: "surfaceRaised" },
  { name: "tekst na powierzchni wciśniętej", fg: "text", bg: "surfaceSunken" },
  { name: "tekst drugorzędny na tle", fg: "textMuted", bg: "surface" },
  { name: "tekst drugorzędny na karcie", fg: "textMuted", bg: "surfaceRaised" },
  { name: "tekst drugorzędny w polu", fg: "textMuted", bg: "surfaceSunken" },
  { name: "tekst na akcencie", fg: "textOnAccent", bg: "accent" },
  { name: "akcent jako tekst na tle", fg: "accent", bg: "surface" },
  { name: "akcent jako tekst na karcie", fg: "accent", bg: "surfaceRaised" },
  { name: "tekst na akcencie przygaszonym", fg: "text", bg: "accentMuted" },
  { name: "sukces na tle", fg: "success", bg: "surface" },
  { name: "ostrzeżenie na tle", fg: "warning", bg: "surface" },
  { name: "błąd na tle", fg: "danger", bg: "surface" },
];

for (const theme of THEMES) {
  const tokens = buildTokens(theme);
  const { palette } = tokens;

  test(`motyw ${theme}: tekst przechodzi próg AA ${AA_NORMAL_TEXT}:1`, () => {
    for (const combo of COMBINATIONS) {
      const fg = palette[combo.fg];
      const bg = palette[combo.bg];
      const ratio = contrastRatio(fg, bg);
      assert.ok(
        meetsAA(fg, bg, combo.large),
        `[${theme}] ${combo.name}: ${fg} na ${bg} = ${ratio.toFixed(2)}:1 — poniżej progu AA`,
      );
    }
  });

  test(`motyw ${theme}: obramowania są widoczne (${AA_NON_TEXT}:1)`, () => {
    assert.ok(
      contrastRatio(palette.borderStrong, palette.surface) >= AA_NON_TEXT,
      `[${theme}] obramowanie aktywne na tle = ${contrastRatio(palette.borderStrong, palette.surface).toFixed(2)}:1`,
    );
    assert.ok(
      contrastRatio(palette.border, palette.surface) >= 1.4,
      `[${theme}] obramowanie subtelne jest niewidoczne na tle`,
    );
  });

  test(`motyw ${theme}: pierścień fokusu jest widoczny na wszystkich powierzchniach`, () => {
    const ring = tokens.focusRing;
    for (const surface of ["surface", "surfaceRaised", "surfaceSunken"] as const) {
      assert.ok(
        contrastRatio(ring, palette[surface]) >= AA_NON_TEXT,
        `[${theme}] fokus na ${surface} = ${contrastRatio(ring, palette[surface]).toFixed(2)}:1`,
      );
    }
  });

  test(`motyw ${theme}: poświata nigdy nie jest tekstem`, () => {
    // Poświata jest dekoracją. Ten test pilnuje, żeby nie użyto jej jako koloru
    // tekstu na tle, bo w motywie jasnym nie ma na to szans.
    assert.ok(
      contrastRatio(palette.glow, palette.surface) < AA_NORMAL_TEXT,
      `[${theme}] poświata przechodzi próg tekstu — użyj akcentu, nie poświaty`,
    );
  });
}

test("tryb dostępności skaluje typografię, nie kolory", () => {
  const normal = buildTokens("dark", 1);
  const accessible = buildTokens("dark", 1.25);
  assert.equal(normal.palette.text, accessible.palette.text);
  assert.equal(normal.accessibilityScale, 1);
  assert.equal(accessible.accessibilityScale, 1.25);
});

test("kontrast jest symetryczny", () => {
  const a = "#FFFFFF";
  const b = "#000000";
  assert.equal(contrastRatio(a, b).toFixed(4), contrastRatio(b, a).toFixed(4));
  assert.ok(contrastRatio(a, b) > 20);
});
