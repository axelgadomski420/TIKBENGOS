"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

/**
 * Ekran wejścia BENGOS — logowanie i rejestracja w jednym, napisany od nowa.
 *
 * ── DLACZEGO OSOBNY PLIK, A NIE POPRAWKA STAREJ BRAMY ───────────────────
 * Stara brama (`login-gate.tsx`) przechodziła przez tyle wersji, że nie dało
 * się już ustalić, co dokładnie widzi użytkownik: zrzuty pokazywały ogromnego
 * tygrysa i formularz wciśnięty w pasek po lewej, choć kod tego nie zawierał.
 * Każda kolejna poprawka nałożona na tamten plik dokładała kolejną warstwę,
 * którą trzeba było potem odkręcać.
 *
 * Ten plik nie dziedziczy niczego. Nie używa `bengos-hud`, nie używa
 * pełnoekranowej grafiki, nie zapisuje trybu do adresu i nie renderuje niczego
 * poza tym, co widać w kodzie poniżej. Jeden komponent, zero historii.
 *
 * ── UKŁAD: DOKŁADNIE CZTERY RZECZY ─────────────────────────────────────
 *   1. znak marki w okręgu — JEDEN obraz na całym ekranie,
 *   2. słowo „logowanie” albo „rejestracja” — nad znakiem,
 *   3. formularz — pod znakiem, na całą szerokość telefonu,
 *   4. zdanie z przełączeniem — na dole.
 *
 * Nic więcej. Każdy element, który nie jest jednym z tych czterech, jest
 * błędem — bo poprzednie wersje właśnie nadmiarem elementów wyglądały źle.
 *
 * ── WYMIARY USTALONE RAZ, NIE WALCZĄCE ZE SOBĄ ──────────────────────────
 * Znak: `size-40` (160 px), stały na każdej szerokości. Nie `dvh`, nie `vw`,
 * nie `min()` z trzech wartości — poprzednie wersje liczyły średnicę z kilku
 * jednostek naraz i przy pewnych proporcjach ekranu wychodziło z tego 55%
 * wysokości telefonu. 160 px mieści się zawsze i wygląda jak znak, a nie
 * jak tapeta.
 *
 * Formularz: `w-full` w kontenerze, który sam jest `w-full` w `max-w-sm`.
 * Karta jest pionowym blokiem na całą szerokość — nigdy paskiem po lewej.
 *
 * ── TYLKO `min-h-dvh` NA KORZENIU ──────────────────────────────────────
 * Na telefonie wysokość okna zmienia się przy każdym schowaniu paska adresu.
 * Wymiary elementów oparte na niej powodowały, że układ przeskakiwał między
 * stanami. Tu `dvh` stoi wyłącznie na zewnętrznym kontenerze — żeby tło
 * wypełniło ekran — a znak, napisy i odstępy mają stałe rozmiary.
 */
export function EntryScreen() {
  const [mode, setMode] = useState<"logowanie" | "rejestracja">("logowanie");

  // Skrót `#rejestracja` w adresie włącza tryb rejestracji od razu. To jedyna
  // rzecz czytana z adresu — nie zapisujemy trybu z powrotem, bo prowadziło
  // to do stanu, którego nie dało się odtworzyć przy odświeżeniu.
  useEffect(() => {
    if (window.location.hash === "#rejestracja") setMode("rejestracja");
  }, []);

  const isRegister = mode === "rejestracja";

  return (
    // `justify-center` w pionie, a gdy treść nie mieści się na niskim ekranie,
    // przewija się naturalnie — bez przycinania formularza.
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bengos-surface)] px-4 py-8">
      {/* ── 1. ZNAK MARKI — jedyna grafika na tym ekranie ──────────── */}
      <div className="relative size-40 shrink-0">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-[var(--bengos-border-strong)] shadow-[0_0_72px_-16px_var(--bengos-glow)]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.logo}
          alt="BENGOS"
          width={1024}
          height={1024}
          fetchPriority="high"
          className="absolute inset-[6%] size-[88%] rounded-full object-cover object-center"
        />
      </div>

      {/* ── 2. SŁOWO TRYBU — nad znakiem, jak na grafice ────────────── */}
      <h1 className="mt-6 text-[2rem] font-[var(--bengos-weight-semibold)] lowercase leading-none tracking-[0.06em] text-[var(--bengos-accent)]">
        {mode}
      </h1>

      {/* ── 3. FORMULARZ — na całą szerokość telefonu ───────────────── */}
      <div className="mt-6 w-full max-w-sm">
        <LoginForm registerMode={isRegister} />
      </div>

      {/* ── 4. PRZEŁĄCZENIE — jedno zdanie i jedno słowo ────────────── */}
      <p className="mt-6 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {isRegister ? "Masz już konto?" : "Nie masz jeszcze konta?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
          className="bengos-touch-target rounded-[var(--bengos-radius-control)] px-2 lowercase tracking-[0.06em] text-[var(--bengos-accent)] underline underline-offset-4"
        >
          {isRegister ? "logowanie" : "rejestracja"}
        </button>
      </p>

      {/* Stopka: zdanie marki, żeby ekran nie kończył się urwanym tekstem. */}
      <p className="mt-8 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {BRAND.tagline}
      </p>
    </div>
  );
}
