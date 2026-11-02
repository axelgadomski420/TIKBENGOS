import { buildTokens, tokensToCssVariables, type ThemeName } from "@bengos/ui";

/**
 * Zamienia tokeny motywu na zmienne CSS dla całego drzewa.
 *
 * Wywoływane raz w powłoce aplikacji — nigdy per komponent. Komponent, który
 * sam wypisuje zmienne, tworzy drugi system równoległy do design systemu.
 */
export function tokensToStyle(
  theme: ThemeName,
  accessibilityMode: boolean,
  reducedMotion: boolean,
  highContrast: boolean,
): React.CSSProperties {
  // Wysoki kontrast jest osobnym motywem, nie nakładką — wygrywa z wybranym
  // motywem, a nie modyfikuje go.
  const effective: ThemeName = highContrast ? "high-contrast" : theme;
  const tokens = buildTokens(effective, accessibilityMode ? 1.25 : 1);
  const variables = tokensToCssVariables(tokens);

  return {
    ...(variables as unknown as React.CSSProperties),
    colorScheme: effective === "light" ? "light" : "dark",
  } as React.CSSProperties;
}

export function themeAttributes(
  theme: ThemeName,
  accessibilityMode: boolean,
  reducedMotion: boolean,
): Record<string, string> {
  return {
    "data-bengos-theme": theme,
    "data-bengos-accessibility": accessibilityMode ? "on" : "off",
    "data-bengos-reduced-motion": reducedMotion ? "on" : "off",
  };
}
