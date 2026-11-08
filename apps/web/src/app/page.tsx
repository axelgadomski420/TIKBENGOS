import type { Metadata } from "next";

import { ModuleBranches } from "@/components/home/module-branches";
import { ModuleOrbit } from "@/components/home/module-orbit";
import { UniversalSearch } from "@/components/home/universal-search";
import { WelcomeBanner } from "@/components/home/welcome-banner";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS" };

/**
 * ── TA STRONA NIE JEST PRE-RENDEROWANA (naprawa 2026-11-08, noc) ────────
 *
 * `force-dynamic` jest tu NAJWAŻNIEJSZĄ linią w tym pliku i powód jest
 * konkretny, nie estetyczny.
 *
 * Next.js domyślnie pre-renderuje statyczne trasy przy budowie obrazu.
 * Skutek dla tej strony był podwójny:
 *
 * 1. Wysyłała `Cache-Control: s-maxage=31536000`, czyli pozwolenie na
 *    trzymanie jej w cache przez ROK. Dowód z nagłówków po wdrożeniu:
 *        cache-control: s-maxage=31536000
 *        x-nextjs-cache: HIT
 *    Właściciel widział na telefonie ekran sprzed godzin mimo nowego
 *    obrazu — sprawdzone `grep`-em w kompilacie kontenera.
 *
 * 2. Renderowała PULPIT (`WelcomeBanner`, `ModuleOrbit`, `ModuleBranches`)
 *    w HTML-u wysyłanym do przeglądarki — czyli treść konta dla osoby,
 *    która go nie ma. Brama z `AppShell` dochodziła dopiero po hydracji,
 *    więc przez chwilę (a przy wolnym łączu dłużej) widać było pulpit
 *    zamiast ekranu wejścia: orbita z TYGRYSEM pośrodku i siatka kafli.
 *
 * To jest dokładnie ten obraz, który zgłaszał właściciel: „ogromny tygrys
 * i wąski pasek formularza po lewej”. Tygrys pochodził z `ModuleOrbit`,
 * a „pasek formularza” był fragmentem siatki — nie bramą logowania.
 *
 * `force-dynamic` sprawia, że strona renderuje się przy KAŻDYM żądaniu,
 * a nie raz przy budowie. Cena jest jedna: brak statycznego pre-renderu,
 * więc pierwsze żądanie jest wolniejsze o czas renderu serwera (kilka ms
 * dla tego drzewa). W zamian HTML nie zawiera już pulpitu dla przybysza,
 * a cache nie ma czego trzymać.
 *
 * Ta strona i tak zależy od stanu sesji — dla zalogowanego pokazuje
 * pulpit, dla przybysza `AppShell` wstawia `EntryScreen`. Pre-render
 * dowolnej z tych dwóch wersji jest więc z definicji błędny dla połowy
 * odwiedzających.
 */
export const dynamic = "force-dynamic";

/**
 * MENU GŁÓWNE — ekran, na który wchodzi się po zalogowaniu.
 *
 * `AppShell` pokazuje to drzewo WYŁĄCZNIE przy `status === "authenticated"`.
 * Przy braku sesji renderuje `EntryScreen`, a z tego pliku nie trafia na
 * ekran nic.
 */
export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.logo}
          alt=""
          width={1024}
          height={1024}
          className="absolute left-1/2 top-0 size-64 -translate-x-1/2 -translate-y-1/3 rounded-full object-cover object-center opacity-[0.14] blur-sm sm:size-80"
        />
        <div className="absolute left-1/2 top-16 size-[26rem] -translate-x-1/2 rounded-full bg-[var(--bengos-accent)] opacity-[0.08] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.06] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-28 pt-6 md:pb-12 md:pt-10">
        <WelcomeBanner />

        <div className="mt-6">
          <h1 className="sr-only">{BRAND.name} — menu główne</h1>
          <ModuleOrbit />
          <div className="lg:hidden">
            <ModuleBranches />
          </div>
        </div>

        <div id="wyszukiwarka" className="mt-8 scroll-mt-24">
          <UniversalSearch />
        </div>
      </div>
    </div>
  );
}
