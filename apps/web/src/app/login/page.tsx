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
 * ── GRAFIKA EKRANU JEST CZĘŚCIĄ KOMPOZYCJI, NIE OZDOBĄ ─────────────────
 * Ekran logowania ma własną grafikę (`BRAND.login`) — tygrys w kuli
 * z podpisami „logowanie” i „rejestracja”. Stoi na samej górze, nad
 * formularzem, i jest jedynym elementem bez ramki: reszta ekranu to karty
 * i pola, więc obraz bez krawędzi czyta się jako tło kompozycji.
 *
 * ── TEKST OBCY W GRAFICE NIE JEST ODCZYTYWANY ─────────────────────────
 * Napisy „logowanie” i „rejestracja” są WYPALONE w obrazie, więc nie
 * istnieją dla czytnika ekranu ani dla wyszukiwarki. To akceptowalne
 * tylko dlatego, że prawdziwe nagłówki i przyciski stoją pod obrazem:
 * funkcja nie zależy od grafiki. Obraz ma `alt=""`, bo prawdziwy `h1`
 * mówi to samo, a powtórzenie dałoby „Utwórz konto” dwa razy.
 *
 * ── PEŁNOEKRANOWY UKŁAD Z TŁEM ──────────────────────────────────────────
 * Logowanie jest jedynym ekranem bez nagłówka powłoki, więc jako jedyny
 * może wziąć cały ekran. Tło to gradient z tokenów motywu i dwie rozmyte
 * plamy — cyjanowa i pomarańczowa. Ten sam motyw co w znaku, więc ekran
 * czyta się jako jego przedłużenie, a nie jako osobna strona.
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
        <div className="mb-6 flex flex-col items-center">
          {/*
            `priority` nie jest tu potrzebne (to zwykły `img`, nie `next/image`),
            ale grafika stoi nad zgięciem — więc ładujemy ją od razu, bez
            leniwego wczytywania, żeby nie wskoczyła po chwili jako przeskok.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.login}
            alt=""
            width={1024}
            height={1024}
            className="w-full max-w-sm rounded-[var(--bengos-radius-card)] object-contain"
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
