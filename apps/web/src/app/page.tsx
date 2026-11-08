import type { Metadata } from "next";

import { ModuleBranches } from "@/components/home/module-branches";
import { UniversalSearch } from "@/components/home/universal-search";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS" };

/**
 * STRONA 2 — MENU Z ODNOŚNIKAMI.
 *
 * Przepływ aplikacji jest dwustopniowy i zamknięty, jak w dużych produktach:
 *   strona 1 — logowanie i rejestracja, nic więcej (LoginGate w powłoce),
 *   strona 2 — TO menu: znak marki w okręgu HUD i dziewięć odnośników.
 *
 * ── ZNAK W OKRĘGU, JAK NA GRAFICE LOGO ─────────────────────────────────
 * Grafika marki (tygrys w świetlistym okręgu, "BENGOS" nad znakiem)
 * narzuca kompozycję tego ekranu: napis jest NAD tygrysem, a nie pod nim,
 * i świeci cyjanem z poświatą — dokładnie jak w znaku. Pierścienie HUD
 * są te same co na ekranie logowania (.bengos-hud), więc strona 1 i strona 2
 * mówią jednym językiem marki: wchodzisz przez ten sam okrąg, którym
 * nawigujesz.
 *
 * ── DLACZEGO TŁO JEST CZYSTE, A NIE HOLOGRAMEM ──────────────────────────
 * Poprzednia wersja kładła pełnoekranową grafikę menu pod siatką. Grafika
 * z wypalonymi podpisami nie jest klikalna ani czytana przez czytnik
 * ekranu, więc prawdziwe odnośniki i tak stały pod nią jako tekst — a tło
 * w tle traciło na wartości to, co miało być najważniejsze: dziewięć drzwi.
 * Teraz punkt centralny jest JEDEN (żywy okrąg z tygrysem), tło jest ciche,
 * a całą uwagę bierze siatka odnośników. To układ, którym nawigują
 * największe launchery: jeden znak, czysta siatka, zero szumu.
 *
 * ── WYSZUKIWARKA JEST TU, NIE W OBRAZIE ─────────────────────────────────
 * Kafelek "wyszukiwarka" prowadzi na kotwicę #wyszukiwarka na dole strony —
 * tam stoi karty uniwersalnej wyszukiwarki, która mówi wprost, że funkcja
 * powstaje w Etapie 5. Odnośnik więc prowadzi do prawdy, nie do atrapy.
 */
export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/*
        Tło: cicha powierzchnia i dwie poświaty — cyjan nad znakiem,
        złoto tygrysa w rogu. Te same plamy świetlne co na ekranie
        logowania utrzymują jedno wrażenie przestrzeni w całej aplikacji.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        <div className="absolute left-1/2 top-16 size-[30rem] -translate-x-1/2 rounded-full bg-[var(--bengos-accent)] opacity-[0.10] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.07] blur-3xl" />
        <div className="absolute -left-24 bottom-32 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.06] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pb-28 pt-8 md:pb-12">
        {/*
          Znak marki: napis nad tygrysem, jak na grafice logo. Pierścienie
          są aria-hidden — nazwę niesie napis, okrąg jest dekoracją.
        */}
        <header className="flex flex-col items-center text-center">
          <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)] uppercase tracking-[0.32em] text-[var(--bengos-accent)] [text-shadow:0_0_28px_var(--bengos-glow)]">
            {BRAND.name}
          </h1>

          <div className="bengos-hud mt-7 flex size-40 items-center justify-center sm:size-56">
            <span aria-hidden="true" className="bengos-hud__ring bengos-hud__ring--static inset-0" />
            <span aria-hidden="true" className="bengos-hud__ring bengos-hud__ring--ticks -inset-4 sm:-inset-6" />
            <span aria-hidden="true" className="bengos-hud__ring bengos-hud__ring--arc -inset-8 sm:-inset-12" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo}
              alt="Tygrys w cyfrowym okregu — znak marki BENGOS"
              width={1024}
              height={1024}
              fetchPriority="high"
              className="size-[78%] rounded-full object-cover object-center shadow-[0_0_64px_-16px_var(--bengos-glow)]"
            />
          </div>

          <p className="mt-7 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            {BRAND.tagline}
          </p>
        </header>

        <div className="mt-12">
          <ModuleBranches />
        </div>

        <div id="wyszukiwarka" className="mt-10 scroll-mt-28">
          <UniversalSearch />
        </div>
      </div>
    </div>
  );
}
