"use client";

import { ModuleBranches } from "@/components/home/module-branches";
import { ModuleOrbit } from "@/components/home/module-orbit";
import { UniversalSearch } from "@/components/home/universal-search";
import { WelcomeBanner } from "@/components/home/welcome-banner";
import { BRAND } from "@/lib/brand";

/**
 * Pulpit BENGOS — cała treść menu głównego.
 *
 * ── DLACZEGO OSOBNY KOMPONENT (naprawa 2026-11-08, noc) ─────────────────
 * Ta treść stała kiedyś bezpośrednio w `apps/web/src/app/page.tsx`, czyli
 * w pliku trasy `/`. Next.js wysyłał ją jako `{children}` powłoki do KAŻDEGO
 * wejścia — także dla osoby bez sesji. Dowód z `curl` po wdrożeniu:
 *
 *     curl -s https://bengos.pl/ | grep -oE 'Nie masz jeszcze konta|Gdzie chcesz wejść'
 *     Gdzie chcesz wejść        ← h2 siatki, czyli treść PULPITU
 *     Nie masz jeszcze konta    ← zdanie z BRAMY wejścia
 *
 * Oba w jednym dokumencie. Właściciel widział na telefonie ogromnego
 * tygrysa i wąski pasek obok — a to był TYGRYS Z `ModuleOrbit` (rysuje znak
 * pośrodku koła) i fragment siatki kafli, nie brama logowania.
 *
 * ── JEDNO MIEJSCE DECYDUJE O TYM, CO WIDAĆ ──────────────────────────────
 * `AppShell` rysuje ten komponent WYŁĄCZNIE w gałęzi
 * `status === "authenticated"`, razem z nagłówkiem powłoki i dolną
 * nawigacją. Dzięki temu nie istnieje droga, którą przybysz dostanie
 * treść konta: albo widzi bramę, albo widzi ten pulpit z powłoką.
 *
 * `"use client"` jest konieczne: `ModuleOrbit` używa `next/link`,
 * a `WelcomeBanner` czyta sesję z kontekstu.
 *
 * ── CO SKŁADA TEN EKRAN ─────────────────────────────────────────────────
 *   1. `WelcomeBanner`   — pasek tożsamości: kto wszedł i jakim uchwytem,
 *   2. `ModuleOrbit`     — orbita dziewięciu wejść wokół tygrysa (od `lg`),
 *   3. `ModuleBranches`  — siatka tych samych wejść (na telefonie),
 *   4. `UniversalSearch` — jedno pole na wszystko, na dole.
 *
 * Każdy z nich ma własne uzasadnienie w swoim pliku — ten komponent
 * tylko je składa w kolejności czytania.
 */
export function HomeDashboard() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/*
        Tło: cicha powierzchnia i trzy poświaty — te same plamy świetlne
        co na ekranie wejścia, żeby przejście między ekranami nie zmieniało
        nastroju. Znak marki jest PIEKĘCIĄ W TLE (duży, mocno przygaszony,
        przesunięty nad górną krawędź), a nie kulą na środku: prawdziwą
        treścią są drzwi do modułów, a znak jest dekoracją tego ekranu.
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
        {/* Pasek tożsamości — pierwsza rzecz na ekranie. */}
        <WelcomeBanner />

        {/*
          Orbita od `lg` (dziewięć wejść wokół znaku, jak na grafice
          właściciela), siatka na telefonie. Oba widoki rysują tę samą listę
          z `module-branches.tsx`, więc adresy nie mogą się rozjechać.
        */}
        <div className="mt-6">
          <h1 className="sr-only">{BRAND.name} — menu główne</h1>
          <ModuleOrbit />
          <div className="lg:hidden">
            <ModuleBranches />
          </div>
        </div>

        {/*
          Wyszukiwarka na dole: najpierw drzwi do modułów (najczęstsza droga),
          potem jedno pole na wszystko (droga dla kogoś, kto wie, czego chce).
        */}
        <div id="wyszukiwarka" className="mt-8 scroll-mt-24">
          <UniversalSearch />
        </div>
      </div>
    </div>
  );
}
