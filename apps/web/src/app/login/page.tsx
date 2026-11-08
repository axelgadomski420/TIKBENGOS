import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Logowanie" };

/**
 * Ekran logowania i rejestracji — pierwszy ekran, jaki widzi nowy użytkownik.
 *
 * Ten plik celowo nie ma "use client". Eksport `metadata` jest dozwolony
 * wyłącznie w komponencie serwerowym — próba połączenia go z "use client"
 * kończy się błędem budowania, nie ostrzeżeniem. Dlatego cała logika
 * formularza mieszka w `@/components/auth/login-form`, a tutaj zostaje
 * tylko to, co serwerowe.
 *
 * ── PIERWSZY EKRAN JEST TYLKO LOGOWANIEM ────────────────────────────────
 * Wejście na `/login` NIE wymusza zalogowania — pokazuje tylko ekran
 * z wyborem drogi. Wymuszenie sesji należy do ekranów modułów, nie tutaj:
 * użytkownik ma prawo zobaczyć, jak wygląda logowanie, zanim się zaloguje.
 *
 * ── GRAFIKA U GÓRY, ZNAK W KARCIE ───────────────────────────────────────
 * Kompozycja z podpisami „logowanie” i „rejestracja” ustawia nastrój
 * i mówi, gdzie użytkownik trafił. Znak prosty w karcie jest punktem
 * odniesienia dla samego formularza — oba obrazy mają `alt=""`, bo napisy
 * i nagłówki są prawdziwym tekstem.
 *
 * ── WYSOKOŚĆ `dvh`, NIE `screen` ────────────────────────────────────────
 * `dvh` liczy się od realnie widocznego obszaru, więc na telefonie z paskiem
 * adresu treść nie ucieka pod krawędź.
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

      <div className="bengos-rise mx-auto flex max-w-md flex-col px-4 py-8">
        <div className="mb-5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.login}
            alt=""
            width={1024}
            height={1024}
            className="w-full max-w-xs rounded-[var(--bengos-radius-card)] object-contain"
          />
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
