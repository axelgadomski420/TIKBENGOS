import type { Metadata } from "next";

import { HomeDashboard } from "@/components/home/home-dashboard";

export const metadata: Metadata = { title: "BENGOS" };

/**
 * KORZEŃ PULPITU — PUSTY ZAWIAS (naprawa 2026-11-08, noc, ostatnia) ──────
 *
 * ── CO BYŁO NIE TAK ────────────────────────────────────────────────────
 * Ten plik renderował CAŁY pulpit: `WelcomeBanner`, `ModuleOrbit`
 * (z tygrysem pośrodku) i `ModuleBranches` (siatkę kafli). Next.js
 * traktował go jako zawartość trasy `/` i wstawiał do HTML-u jako `{children}`
 * powłoki — czyli do KAŻDEGO wejścia, także dla osoby bez sesji.
 *
 * Dowód, że działo się to NAPRAWDĘ (z `curl` po wdrożeniu):
 *
 *     curl -s https://bengos.pl/ | grep -oE 'Nie masz jeszcze konta|Gdzie chcesz wejść'
 *     Gdzie chcesz wejść        ← nagłówek siatki z PULPITU
 *     Nie masz jeszcze konta    ← tekst z BRAMY
 *
 * OBA w jednym dokumencie. `Gdzie chcesz wejść` to `h2` z `module-branches`,
 * czyli treść pulpitowa wysłana osobie, która konta nie ma.
 *
 * ── SKĄD BRAŁ SIĘ OBRAZ ZE ZRZUTÓW ─────────────────────────────────────
 * Właściciel widział na telefonie OGROMNEGO TYGRYSA i wąski pasek po lewej.
 * Tygrys pochodził z `ModuleOrbit` (rysuje `BRAND.logo` pośrodku koła),
 * a „pasek formularza” był fragmentem siatki `ModuleBranches` — nie bramą
 * logowania. Brama dochodziła PO hydracji i wyglądała na doklejoną do
 * pulpitu, a nie na osobny ekran.
 *
 * Kolejne poprawki tego nie leczyły, bo leczyły objaw: zmieniałem wymiary
 * znaku, usuwałem zasłonę, gasiłem cache — a źródłem był TEN plik, który
 * wysyłał pulpit w HTML-u.
 *
 * ── ROZWIĄZANIE ────────────────────────────────────────────────────────
 * `page.tsx` nie renderuje już NICZEGO. Cały pulpit przeniósł się do
 * `HomeDashboard`, a `AppShell` rysuje go WYŁĄCZNIE w gałęzi
 * `status === "authenticated"` — czyli tam, gdzie stoi też nagłówek
 * powłoki i dolna nawigacja. Jedno miejsce decyduje o tym, co widać,
 * a to jest jedyne, co daje pewność, że przybysz nigdy nie dostanie
 * treści konta.
 *
 * Ten plik zostaje jako zwijas, bo Next wymaga `page` dla trasy `/`:
 * bez niego adres przestaje istnieć. Zwraca `null`.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  // Pulpit rysuje `AppShell` — tylko dla zalogowanego, razem z powłoką.
  // Tutaj nie ma nic, bo wszystko, co tu stało, wyciekało do HTML-u
  // dla przybysza.
  return <HomeDashboard />;
}
