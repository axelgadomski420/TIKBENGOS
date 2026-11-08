import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Zaloguj się" };

/**
 * Strona startowa: logowanie i rejestracja. Nic więcej.
 *
 * ── KTÓRA GRAFIKA TU NALEŻY ─────────────────────────────────────────────
 * Na tym ekranie jest `BRAND.login` — kompozycja z napisami „logowanie”,
 * „BENGOS” i „rejestracja”. Wcześniej stała tu grafika MENU (z podpisami
 * studio, bridge, dev, profil, chat…), i to był błąd: ekran logowania
 * pokazywał spis modułów, czyli treść należącą do pulpitu. Grafika menu
 * wraca tam, gdzie jej miejsce — do siatki na pulpicie.
 *
 * ── GRAFIKA JAKO TŁO, NIE JAKO PROSTOKĄT ────────────────────────────────
 * Obraz zajmuje górne 58% ekranu, jest przygaszony i rozmyty o 2 px, a od
 * dołu wchodzi gradient, na którym siada formularz. Dzięki temu nie ma
 * „prostokąta na prostokącie”, a obraz i treść tworzą jedną kompozycję.
 *
 * ── JEDNO ZADANIE ───────────────────────────────────────────────────────
 * Znak, nazwa, formularz, jedno wyjście. Żadnych kafli modułów i żadnych
 * kart pulpitu — te należą do ekranu po zalogowaniu.
 *
 * ── WYSOKOŚĆ `dvh` I ZAPAS NA DOLNY PASEK ───────────────────────────────
 * `dvh` liczy się od realnie widocznego obszaru, więc na telefonie treść
 * nie ucieka pod pasek adresu. Dołem zostaje `pb-28`, żeby dolna nawigacja
 * nie zasłaniała ostatniego elementu.
 *
 * ── TEN PLIK NIE MA "use client" ────────────────────────────────────────
 * Eksport `metadata` jest dozwolony wyłącznie w komponencie serwerowym.
 */
export default function LoginPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/*
        Tło: kompozycja logowania, pod nią tło motywu, a od dołu gradient.
        Obraz jest przygaszony, bo ma dawać nastrój, nie konkurować z tekstem.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.login}
          alt=""
          className="absolute inset-x-0 top-0 h-[58%] w-full object-cover object-top opacity-70 blur-[2px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_34%,var(--bengos-surface)_58%,var(--bengos-surface)_100%)]" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.10] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.08] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pb-28 pt-12 sm:max-w-md sm:pt-16 md:pb-12">
        {/*
          Znak w kole. Jedyne miejsce z poświatą na tym ekranie — brief mówi:
          jeden element z `glow` na ekran, nigdy jako tło pod tekstem.
        */}
        <div className="flex flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_56px_-10px_var(--bengos-glow)] sm:size-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" className="size-full object-cover object-top" />
          </span>
          <p className="mt-4 text-[var(--bengos-size-caption)] uppercase tracking-[0.32em] text-[var(--bengos-text-muted)]">
            {BRAND.name}
          </p>
          <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            {BRAND.tagline}
          </p>
        </div>

        <div className="mt-7">
          <LoginForm />
        </div>

        <p className="mt-7 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          <Link
            href="/"
            className="bengos-touch-target inline-flex items-center justify-center px-4 text-[var(--bengos-accent)]"
          >
            Wejdź bez konta
          </Link>
        </p>
      </div>
    </div>
  );
}
