/**
 * Design system BENGOS — tokeny, motywy i liczenie kontrastu.
 *
 * Importy są BEZ rozszerzenia, tak samo jak w `@bengos/core`. Powód ten sam:
 * webpack nie rozwiązuje `.js` wskazującego na plik `.ts`, a to właśnie
 * zatrzymało build produkcyjny.
 */

export * from "./tokens";
export * from "./themes";
export * from "./contrast";
