/**
 * Kontrakty TIKBENGOS — jedno źródło prawdy dla interfejsu i serwera.
 *
 * Importy są BEZ rozszerzenia i to jest celowe. Wcześniej stało tu `.js`,
 * co działa w TypeScript z `moduleResolution: "node16"`, ale webpack
 * w Next.js szuka wtedy dosłownie pliku `.js` — a w repozytorium leżą `.ts`.
 * Build produkcyjny przerywał się na `Can't resolve './api.js'`.
 *
 * Bez rozszerzenia rozwiązywanie idzie po rzeczywistych plikach, więc ten sam
 * zapis działa i w webpacku, i w `tsc`, i w Node po kompilacji.
 *
 * ── UWAGA, KTÓRA KOSZTOWAŁA CZTERY PRZEBUDOWY ───────────────────────────
 * W pierwszej linii tego pliku stało kiedyś:
 *
 *     successfully downloaded text file (SHA: 055fc217…)/**
 *
 * To komunikat narzędzia, które pobierało plik — wklejony przed komentarzem,
 * a nie do komentarza. Webpack przewracał się na tym komunikatem
 * (`Expected ';', '}' or <eof>`), a TypeScript nie dochodził do swoich
 * błędów, bo zatrzymuje się na pierwszym napotkanym. Skutek: przez kilka
 * przebudów naprawiane było `access-tools.tsx`, które było bez winy.
 *
 * Pierwsza linia tego pliku MUSI zaczynać się od `/**`. Jeśli narzędzie
 * do pobierania plików dopisze tu cokolwiek przed komentarzem, build padnie,
 * a komunikat wskaże nie ten plik, który jest przyczyną.
 */

export * from "./api";
export * from "./ai";
export * from "./identity";
export * from "./feed";
export * from "./music";
export * from "./chat";
export * from "./projects";
export * from "./access";
export * from "./jobs";
export * from "./providers";
