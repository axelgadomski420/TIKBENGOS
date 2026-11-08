import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Zaloguj się" };

/**
 * Ekran logowania i rejestracji — pierwszy ekran, jaki widzi nowy użytkownik.
 *
 * Ten plik celowo nie ma "use client". Eksport `metadata` jest dozwolony
 * wyłącznie w komponencie serwerowym — próba połączenia go z "use client"
 * kończy się błędem budowania, nie ostrzeżeniem. Dlatego cała logika
 * formularza mieszka w `@/components/auth/login-form`, a tutaj zostaje
 * tylko to, co serwerowe.
 *
 * ── PEŁNOEKRANOWY UKŁAD Z TŁEM ──────────────────────────────────────────
 * Logowanie jest jedynym ekranem bez nagłówka powłoki, więc jako jedyny
 * może wziąć cały ekran. Tło jest gradientem zbudowanym z tokenów motywu
 * (granat w środku, czerń przy brzegach) i dwiema rozmytymi plamami —
 * cyjanową i pomarańczową. To ten sam motyw co w znaku marki, więc ekran
 * czyta się jako jego przedłużenie, a nie jako osobna strona.
 *
 * Plamy są `aria-hidden` i `pointer-events: none`: to czysta dekoracja —
 * nie niosą treści i nie mogą przechwytywać kliknięć.
 *
 * ── ZNAK NAD FORMULARZEM ────────────────────────────────────────────────
 * Znak stoi nad treścią, bo bez nagłówka powłoki nie byłoby wiadomo, do
 * czego się logujesz. Obraz jest dekoracją (`alt=""`), bo nazwa stoi pod
 * nim tekstem: czytnik ekranu usłyszałby „BENGOS” dwa razy.
 *
 * ── LICZBA W KADRZE: CAŁA POSTAĆ, NIE TYLKO GŁOWA ──────────────────────
 * W nagłówku powłoki znak jest przycięty do głowy (`object-top`), bo tam
 * ma 36 px. Tutaj ma 112 px i cały napis „BENGOS” jest częścią grafiki —
 * przycięcie zabrałoby połowę znaku, więc kadr zostaje pełny.
 */
export default function LoginPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Dekoracja tła — gradient i dwie plamy. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,var(--bengos-surface-raised)_0%,var(--bengos-surface)_45%,var(--bengos-surface-sunken)_100%)]" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.07] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.06] blur-3xl" />
      </div>

      <div className="bengos-rise mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.logo}
            alt=""
            width={112}
            height={112}
            className="size-28 rounded-full object-cover"
            style={{ boxShadow: "0 0 56px -10px var(--bengos-glow)" }}
          />
          <p className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)] tracking-[0.2em] text-indent-[0.2em]">
            BENGOS
          </p>
          <p className="text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            {BRAND.tagline}
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          <Link href="/" className="text-[var(--bengos-accent)]">
            Wróć do BENGOS Home
          </Link>
        </p>
      </div>
    </div>
  );
}
