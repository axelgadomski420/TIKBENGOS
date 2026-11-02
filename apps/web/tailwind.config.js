/**
 * Konfiguracja Tailwinda.
 *
 * Ten plik istnieje, bo `globals.css` zaczyna się od dyrektyw `@tailwind`,
 * a bez konfiguracji i wtyczki PostCSS build Next.js przewraca się na
 * nieznanej dyrektywie.
 *
 * ŚWIADOMIE nie definiujemy tu kolorów. Kolory są w `@bengos/ui` jako tokeny
 * CSS (`--bengos-*`) i komponenty odwołują się do nich wprost. Gdyby Tailwind
 * miał własną paletę, powstałby drugi system kolorów obok design systemu —
 * dokładnie to, czego `packages/ui/src/tokens.ts` zabrania w swoim komentarzu.
 *
 * Zakres skanowania obejmuje workspace'y, bo klasy są też w komponentach
 * `@bengos/ui`, gdyby kiedyś ich przybyło.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/core/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
