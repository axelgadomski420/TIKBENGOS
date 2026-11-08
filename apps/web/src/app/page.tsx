import type { Metadata } from "next";

import { ModuleBranches } from "@/components/home/module-branches";
import { UniversalSearch } from "@/components/home/universal-search";
import { WelcomeBanner } from "@/components/home/welcome-banner";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS" };

/**
 * MENU GŁÓWNE — ekran, na który wchodzi się po zalogowaniu.
 *
 * ── TO JEST MENU, NIE DRUGI EKRAN LOGOWANIA (korekta 2026-11-08) ────────
 * Poprzednia wersja stawiała na środku ekranu DUŻY znak marki w okręgu HUD
 * — dokładnie taki sam, jaki stoi na ekranie logowania. Po zalogowaniu
 * użytkownik lądował więc na ekranie wizualnie NIEROZRÓŻNIALNYM od tego,
 * z którego właśnie wyszedł, a cała różnica (siatka kafli) była pod zgięciem.
 * Właściciel opisał to wprost: „logowanie i rejestracja do menu głównego"
 * — czyli po wejściu ma być WIDAĆ, że jest się w innym miejscu.
 *
 * Teraz hierarchia jest odwrócona tak, jak w każdym launcherze:
 *   1. PASEK TOŻSAMOŚCI — kto wszedł i jakim uchwytem (to potwierdza
 *      zalogowanie i jest pierwszą rzeczą, której szuka oko),
 *   2. SIATKA DZIEWIĘCIU WEJŚĆ — cała uwaga i cały ekran,
 *   3. znak marki jako mała pieczęć w tle nagłówka, nie jako kula
 *      na środku — znak jest dekoracją, drzwi są treścią.
 *
 * ── DLACZEGO ZNAK JEST MNIEJSZY, A NIE TAKI SAM ─────────────────────────
 * Na ekranie logowania znak jest osią kompozycji, bo nie ma tam nic
 * innego do zrobienia. Tu jest dziewięć rzeczy do zrobienia — a powtórzenie
 * tego samego znaku w tej samej wielkości odbiera uwagę siatce i sprawia,
 * że ekran wygląda jak kopia poprzedniego. Rozmiar 256–320 px w tle, mocno
 * przygaszony, wystarcza, żeby marka była obecna, i nie konkuruje z kaflami.
 *
 * ── PASEK „KONTO GOTOWE” PO REJESTRACJI ────────────────────────────────
 * Formularz wraca tu z `?welcome=1`. Pasek mówi, że konto powstało
 * i jakim uchwytem się logujesz — samo przeładowanie na pulpit niczego
 * nie potwierdzało. Po samym zalogowaniu parametru NIE MA, bo powitanie
 * jest dla nowego konta, nie dla każdego wejścia.
 */
export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/*
        Tło: cicha powierzchnia i trzy poświaty — te same plamy świetlne
        co na ekranie logowania, żeby przejście między ekranami nie zmieniało
        nastroju. Znak marki jest tu PIEKĘCIĄ W TLE (duży, przygaszony,
        przesunięty nad górną krawędź), a nie kulą na środku — bo prawdziwą
        treścią są drzwi do modułów.
      */}
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
        {/*
          Pasek tożsamości — pierwsza rzecz na ekranie. Mówi, że jesteś
          w środku i kim jesteś; dopiero pod nim stoją drzwi.
        */}
        <WelcomeBanner />

        {/*
          Siatka dziewięciu wejść — CAŁA uwaga i pierwsza rzecz po nagłówku.
          Na telefonie dwa kafle w rzędzie (44 px celu w każdym), od `lg`
          trzy w rzędzie. Znak marki jest już w tle nagłówka, więc nie ma
          tu drugiego okręgu — jest tylko `h1` z nazwą, czytany przez
          czytnik ekranu (`sr-only`), bo nazwę widać na pasku powyżej.
        */}
        <div className="mt-6">
          <h1 className="sr-only">{BRAND.name} — menu główne</h1>
          <ModuleBranches />
        </div>

        {/*
          Wyszukiwarka uniwersalna — na dole, pod siatką. To jest celowe:
          najpierw drzwi do modułów (najczęstsza droga), potem jedno pole
          na wszystko (droga dla kogoś, kto wie, czego chce).
          Kotwica `#wyszukiwarka` jest adresem kafla „wyszukiwarka”.
        */}
        <div id="wyszukiwarka" className="mt-8 scroll-mt-24">
          <UniversalSearch />
        </div>
      </div>
    </div>
  );
}
