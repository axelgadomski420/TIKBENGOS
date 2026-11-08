import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Zaloguj się" };

/**
 * Strona startowa: TYLKO logowanie i rejestracja.
 *
 * ── PEŁNY EKRAN, JEDNO ZADANIE ──────────────────────────────────────────
 * Ten ekran ma jedno zadanie: przeprowadzić użytkownika przez wejście.
 * Dlatego nie ma tu kafli modułów, kart pulpitu ani niczego, co trzeba
 * przewijać, żeby zobaczyć. Znak marki jest duży, formularz jest pod nim,
 * i to wszystko.
 *
 * ── GRAFIKA JAKO TŁO, NIE JAKO PROSTOKĄT ────────────────────────────────
 * Wcześniej kompozycja stała jako czarny kwadrat nad formularzem i zlewała
 * się z tłem — dwa prawie identyczne czernie dawały plamę bez krawędzi.
 * Teraz grafika jest W TLE całego ekranu, przykryta gradientem od dołu:
 * góra ekranu jest obrazem, dół jest ciemny i to na nim leży formularz.
 * Dzięki temu nie ma ani jednego „prostokąta na prostokącie”, a obraz
 * i treść tworzą jedną kompozycję.
 *
 * ── WYSOKOŚĆ `dvh` I ZAPAS NA DOLNY PASEK ───────────────────────────────
 * `dvh` liczy się od realnie widocznego obszaru, więc na telefonie treść
 * nie ucieka pod pasek adresu. Dołem zostaje `pb-28`, żeby dolna nawigacja
 * (przyklejona, 56 px + safe-area) nie zasłaniała ostatniego elementu.
 *
 * ── TEN PLIK NIE MA "use client" ────────────────────────────────────────
 * Eksport `metadata` jest dozwolony wyłącznie w komponencie serwerowym —
 * próba połączenia go z "use client" kończy się błędem budowania.
 * Dlatego cała logika formularza mieszka w `@/components/auth/login-form`.
 */
export default function LoginPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/*
        Tło: grafika marki, pod nią granat, a od dołu gradient, na którym
        siada formularz. Obraz jest rozmyty i przygaszony — ma dawać nastrój,
        nie konkurować z tekstem o uwagę.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.login}
          alt=""
          className="absolute inset-x-0 top-0 h-[62%] w-full object-cover object-top opacity-60 blur-[2px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_38%,var(--bengos-surface)_62%,var(--bengos-surface)_100%)]" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.10] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.08] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pb-28 pt-14 sm:max-w-md sm:pt-20 md:pb-12">
        {/*
          Znak w kole. Jedyne miejsce z poświatą na tym ekranie — brief mówi:
          jeden element z `glow` na ekran, nigdy jako tło pod tekstem.
        */}
        <div className="flex flex-col items-center text-center">
          <span className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_64px_-12px_var(--bengos-glow)] sm:size-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" className="size-full object-cover object-top" />
          </span>
          <p className="mt-5 text-[var(--bengos-size-caption)] uppercase tracking-[0.32em] text-[var(--bengos-text-muted)]">
            {BRAND.name}
          </p>
          <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            {BRAND.tagline}
          </p>
        </div>

        <div className="mt-8">
          <LoginForm />
        </div>

        <p className="mt-8 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
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
