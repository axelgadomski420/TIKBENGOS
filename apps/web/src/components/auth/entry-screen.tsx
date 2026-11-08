"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

/**
 * Ekran wejścia BENGOS — logowanie i rejestracja.
 *
 * Układ zbliżony do grafiki właściciela:
 * - duże słowo trybu (logowanie / rejestracja) nad znakiem,
 * - duży świecący okrąg HUD z tygrysem w środku (jak na zdjęciu),
 * - drugie słowo (przełączenie) pod znakiem,
 * - formularz pod spodem na pełną szerokość.
 *
 * Wszystkie napisy są żywym tekstem (dostępność, WCAG), nie wypalone
 * w obrazie. Obraz logo jest lokalny z /brand/logo.jpg.
 *
 * Wymiary: znak ~280px na mobile, do 360px na większych ekranach —
 * wystarczająco duży, żeby oddać kompozycję ze zdjęcia, ale nie pełny ekran.
 */
export function EntryScreen() {
  const [mode, setMode] = useState<"logowanie" | "rejestracja">("logowanie");

  useEffect(() => {
    if (window.location.hash === "#rejestracja") setMode("rejestracja");
  }, []);

  const isRegister = mode === "rejestracja";
  const otherMode = isRegister ? "logowanie" : "rejestracja";

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[var(--bengos-surface)] px-4 py-8 overflow-hidden">
      {/* Poświaty w tle — jak na grafice */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bengos-accent)] opacity-[0.06] blur-3xl" />
        <div className="absolute -right-40 bottom-20 size-96 rounded-full bg-[var(--bengos-warning)] opacity-[0.04] blur-3xl" />
      </div>

      {/* 1. Słowo trybu — nad znakiem, duże, cyjan, lowercase jak na zdjęciu */}
      <h1 className="mb-4 text-center text-4xl font-[var(--bengos-weight-semibold)] lowercase tracking-[0.08em] text-[var(--bengos-accent)] drop-shadow-[0_0_24px_var(--bengos-glow)] sm:text-5xl">
        {mode}
      </h1>

      {/* 2. Znak marki w HUD — duży, z pierścieniami */}
      <div className="relative size-64 shrink-0 sm:size-80">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3 sm:-inset-4" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-6 sm:-inset-8" />
          <span className="flex h-[78%] w-[78%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_120px_-20px_var(--bengos-glow)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo}
              alt="BENGOS"
              width={1024}
              height={1024}
              fetchPriority="high"
              className="size-full object-cover object-center"
            />
          </span>
        </div>
      </div>

      {/* 3. Drugie słowo — pod znakiem, jako przełączenie, duże */}
      <button
        type="button"
        onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
        className="mt-4 text-center text-3xl font-[var(--bengos-weight-semibold)] lowercase tracking-[0.08em] text-[var(--bengos-accent)] underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)] sm:text-4xl"
        aria-label={`Przełącz na ${otherMode}`}
      >
        {otherMode}
      </button>

      {/* 4. Formularz — pod spodem */}
      <div className="mt-8 w-full max-w-sm">
        <LoginForm registerMode={isRegister} />
      </div>

      {/* Stopka */}
      <p className="mt-8 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {BRAND.tagline}
      </p>
    </div>
  );
}
