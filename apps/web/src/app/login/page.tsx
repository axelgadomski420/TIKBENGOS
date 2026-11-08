import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

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
 * ── GRAFIKA JEST NA GÓRZE, ALE NIE JEST JEDYNYM ZNAKIEM ─────────────────
 * Na samej górze stoi kompozycja z podpisami „logowanie” i „rejestracja”.
 * Pod nią — już wewnątrz karty formularza — jest znak prosty, obok
 * prawdziwego nagłówka. To nie jest powtórzenie: grafika ustawia nastrój
 * i mówi, gdzie użytkownik trafił, a znak w karcie jest punktem odniesienia
 * dla samego formularza. Czytnik ekranu dostaje z tego tylko jedno:
 * oba obrazy mają `alt=""`, bo napisy i nagłówki są prawdziwym tekstem.
 *
 * ── WSZYSTKO ZWRÓCONE DO CZYTNIKA JEST PRAWDZIWE ────────────────────────
 * Napisy „logowanie” i „rejestracja” są WYPALONE w grafice, więc nie istnieją
 * dla czytnika ekranu ani dla wyszukiwarki. To akceptowalne tylko dlatego,
 * że prawdziwe nagłówki i przyciski stoją pod obrazem: funkcja nie zależy
 * od grafiki. Obraz ma `alt=""`, a prawdziwy `h1` mówi to samo.
 *
 * ── PEŁNOEKRANOWY UKŁAD Z TŁEM Z TOKENÓW ────────────────────────────────
 * Logowanie jest jedynym ekranem bez nagłówka powłoki, więc jako jedyny
 * może wziąć cały ekran. Tło to gradient z tokenów motywu i dwie rozmyte
 * plamy — cyjanowa i pomarańczowa. Ten sam motyw co w znaku, więc ekran
 * czyta się jako jego przedłużenie, a nie jako osobna strona.
 *
 * Wysokość `min-h-dvh` zamiast `min-h-screen`: `dvh` liczy się od realnie
 * widocznego obszaru, więc na telefonie z paskiem adresu treść nie ucieka
 * pod krawędź.
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
            src={BRAND_LOGIN}
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
