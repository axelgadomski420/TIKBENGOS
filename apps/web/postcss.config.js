/**
 * Wtyczka PostCSS.
 *
 * Dwie pozycje i obie są potrzebne: `tailwindcss` rozwija dyrektywy
 * `@tailwind`, a `autoprefixer` dokłada przedrostki producentów. Bez
 * pierwszego build pada, bez drugiego style działają wszędzie tam, gdzie
 * użytkownik jest na aktualnej przeglądarce — co nie jest założeniem,
 * które wolno przyjąć bez pytania.
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
