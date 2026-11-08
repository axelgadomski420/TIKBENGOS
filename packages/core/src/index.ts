successfully downloaded text file (SHA: 055fc21785126e880b7b0d0184d1c3568f9aef55)/**
 * Kontrakty TIKBENGOS — jedno źródło prawdy dla interfejsu i serwera.
 *
 * Importy są BEZ rozszerzenia i to jest celowe. Wcześniej stało tu `.js`,
 * co działa w TypeScript z `moduleResolution: "node16"`, ale webpack
 * w Next.js szuka wtedy dosłownie pliku `.js` — a w repozytorium leżą `.ts`.
 * Build produkcyjny przerywał się na `Can't resolve './api.js'`.
 *
 * Bez rozszerzenia rozwiązywanie idzie po rzeczywistych plikach, więc ten sam
 * zapis działa i w webpacku, i w `tsc`, i w Node po kompilacji.
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
