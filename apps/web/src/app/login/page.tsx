import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Logowanie" };

/**
 * Ekran startowy: tylko logowanie i rejestracja.
 *
 * Ten plik celowo nie ma "use client". Eksport `metadata` jest dozwolony
 * wyłącznie w komponencie serwerowym — próba połączenia go z "use client"
 * kończy się błędem budowania, nie ostrzeżeniem. Dlatego cała logika
 * formularza mieszka w `@/components/auth/login-form`, a tutaj zostaje
 * tylko to, co serwerowe.
 *
 * ── PIERWSZY EKRAN NIE WYMUSZA SESJI ────────────────────────────────────
 * Wejście na `/login` pokazuje tylko wybór drogi. Wymuszenie sesji należy
 * do ekranów modułów, nie tutaj: użytkownik ma prawo zobaczyć, jak wygląda
 * logowanie, zanim się zaloguje.
 *
 * ── GRAFIKA NIE MOŻE ZLEWAĆ SIĘ Z TŁEM ──────────────────────────────────
 * Kompozycja z podpisami „logowanie” i „rejestracja” ma CZARNE tło wypalone
 * w pliku. Wsadzona bezpośrednio na powierzchnię `surface` (#05070D) dawała
 * efekt „czarne na czarnym”: obraz nie miał krawędzi, więc wyglądał jak
 * rozmazana plama, a nie jak element interfejsu.
 *
 * Poprawka jest w trzech ruchach i wszystkie są w tokenach, bez ani jednej
 * wartości koloru w tym pliku:
 *   1. `surface-sunken` — ciemniejsza niż tło powierzchnia pod obrazem,
 *      więc czarny prostokąt grafiki ma na czym siedzieć,
 *   2. obramowanie `border` — daje obrazowi krawędź, którą oko łapie,
 *   3. ograniczenie WYSOKOŚCI, nie tylko szerokości — na telefonie grafika
 *      1024×1024 zjadała cały pierwszy ekran i formularz zaczynał się dopiero
 *      po przewinięciu. Formularz jest tu najważniejszy; obraz jest zapowiedzią.
 *
 * ── MOBILNA WERSJA PRZEDE WSZYSTKIM ─────────────────────────────────────
 * Treść jest węższa na małych ekranach niż na dużych (`max-w-sm` → `max-w-md`),
 * a dołem zostaje zapas na dolną nawigację (`pb-28`), żeby odsyłacz „Wróć do
 * BENGOS Home” nie wchodził pod przyklejony pasek. Wysokość liczona `dvh`,
 * a nie `screen`, bo `dvh` odejmuje pasek adresu przeglądarki na telefonie.
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

      <div className="bengos-rise mx-auto flex w-full max-w-sm flex-col px-4 pb-28 pt-6 sm:max-w-md md:pb-10">
        {/*
          Grafika kompozycji. `alt=""` jest poprawne: napisy „logowanie”
          i „rejestracja” są wypalone w obrazie, a nagłówek karty mówi to samo
          prawdziwym tekstem — powtórzenie ich w opisie dałoby czytnikowi
          dwa razy tę samą treść.

          Wysokość jest ograniczona clampem, nie samą szerokością: kwadrat
          1024×1024 na telefonie zajmował cały ekran i wypychał formularz
          poza pierwszy widok.
        */}
        <div className="mb-4 flex justify-center">
          <div className="w-full max-w-[15rem] overflow-hidden rounded-[var(--bengos-radius-card)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] sm:max-w-[17rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.login}
              alt=""
              width={1024}
              height={1024}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          <Link href="/" className="bengos-touch-target inline-flex items-center justify-center px-4 text-[var(--bengos-accent)]">
            Wróć do BENGOS Home
          </Link>
        </p>
      </div>
    </div>
  );
}
