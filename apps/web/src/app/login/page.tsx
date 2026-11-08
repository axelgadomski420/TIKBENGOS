import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS" };

/**
 * Strona startowa. Logo, dwa słowa, formularz. Nic więcej.
 *
 * ── NA CAŁYM EKRANIE JEST LOGO Z NAPISAMI ───────────────────────────────
 * Grafika `BRAND.login` ma w pliku napisy „logowanie", „BENGOS"
 * i „rejestracja". Jest to TŁO całego ekranu — nie prostokąt nad kartą,
 * nie element do przewijania. Wypełnia widok, jest przygaszona i rozmyta,
 * więc formularz czyta się na niej, a nie obok niej.
 *
 * ── NAPISY Z GRAFIKI SĄ PRAWDZIWYM TEKSTEM ──────────────────────────────
 * Podpisy wypalone w JPEG-u są dla przeglądarki jednym prostokątem: nie da
 * się ich kliknąć ani odczytać czytnikiem ekranu. Dlatego dwa słowa, które
 * użytkownik ma kliknąć — „Zaloguj się" i „Zarejestruj się" — stoją pod
 * grafiką jako tekst, w miejscach odpowiadających napisom z obrazka.
 * Grafika daje nastrój, tekst daje działanie.
 *
 * ── JEDNO ZADANIE ───────────────────────────────────────────────────────
 * Żadnych kafli modułów, żadnych kart pulpitu, żadnej siatki odgałęzień —
 * te należą do ekranu PO zalogowaniu. Tu jest wejście i tylko wejście.
 *
 * ── WYSOKOŚĆ `dvh` I ŚRODEK EKRANU ─────────────────────────────────────
 * `dvh` liczy się od realnie widocznego obszaru, więc na telefonie treść
 * nie ucieka pod pasek adresu. Całość jest wyśrodkowana w pionie, bo przy
 * dwóch elementach na ekranie górna krawędź czyta się jak urwane urządzenie.
 */
export default function LoginPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/*
        Tło: grafika na CAŁYM ekranie, pod nią tło motywu, na wierzchu
        gradient od dołu. Obraz jest przygaszony i rozmyty o 2 px — ma dawać
        nastrój, nie konkurować o uwagę z formularzem.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.login}
          alt=""
          width={1024}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-center opacity-70 blur-[2px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--bengos-surface)_0%,transparent_18%,transparent_62%,var(--bengos-surface)_100%)]" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.10] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.08] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-28 pt-10 sm:max-w-md md:pb-12">
        {/*
          Znak w kole. Jedyne miejsce z poświatą na tym ekranie — brief mówi:
          jeden element z `glow` na ekran, nigdy jako tło pod tekstem.
        */}
        <div className="flex flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_64px_-10px_var(--bengos-glow)] sm:size-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo}
              alt=""
              width={1024}
              height={1024}
              fetchPriority="high"
              className="size-full object-cover object-center"
            />
          </span>
          <p className="mt-5 text-[var(--bengos-size-caption)] uppercase tracking-[0.34em] text-[var(--bengos-text-muted)]">
            {BRAND.name}
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
