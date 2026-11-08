"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

/**
 * Ekran wejścia BENGOS — logowanie i rejestracja.
 *
 * Układ 1:1 z grafiką właściciela (trzecie zdjęcie):
 * - duże świecące słowo „logowanie” (lub „rejestracja”) NAD znakiem,
 * - duży okrąg HUD z tygrysem w środku (dominujący element),
 * - drugie słowo POD znakiem jako przełącznik,
 * - formularz pod spodem, mniejszy wizualnie.
 *
 * Wszystkie napisy są żywym tekstem (dostępność). Obraz z /brand/logo.jpg.
 */
export function EntryScreen() {
  const [mode, setMode] = useState<"logowanie" | "rejestracja">("logowanie");

  useEffect(() => {
    if (window.location.hash === "#rejestracja") setMode("rejestracja");
  }, []);

  const isRegister = mode === "rejestracja";
  const otherMode = isRegister ? "logowanie" : "rejestracja";

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-[var(--bengos-surface)] px-4 py-6 overflow-x-hidden">
      {/* Poświaty w tle */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[38%] size-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bengos-accent)] opacity-[0.07] blur-3xl" />
        <div className="absolute -right-32 bottom-16 size-[26rem] rounded-full bg-[var(--bengos-warning)] opacity-[0.05] blur-3xl" />
      </div>

      {/* 1. Słowo trybu — nad znakiem */}
      <h1 className="mb-3 text-center text-4xl font-[var(--bengos-weight-semibold)] lowercase tracking-[0.1em] text-[var(--bengos-accent)] drop-shadow-[0_0_28px_var(--bengos-glow)] sm:text-5xl">
        {mode}
      </h1>

      {/* 2. Znak marki w HUD — ograniczony tak, żeby formularz zmieścił się pod spodem */}
      <div className="relative size-60 shrink-0 sm:size-80">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3 sm:-inset-4" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-6 sm:-inset-8" />
          <span className="flex h-[78%] w-[78%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_140px_-20px_var(--bengos-glow)]">
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

      {/* 3. Drugie słowo — pod znakiem */}
      <button
        type="button"
        onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
        className="mt-3 text-center text-3xl font-[var(--bengos-weight-semibold)] lowercase tracking-[0.1em] text-[var(--bengos-accent)] drop-shadow-[0_0_20px_var(--bengos-glow)] underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)] sm:text-4xl"
        aria-label={`Przełącz na ${otherMode}`}
      >
        {otherMode}
      </button>

      {/* 4. Formularz — wymuszona pełna szerokość, wyśrodkowany, bez paska z lewej */}
      <div className="mt-6 flex w-full max-w-sm flex-col items-center self-center px-2">
        <div className="w-full">
          <LoginForm registerMode={isRegister} />
        </div>
      </div>

      <p className="mt-6 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {BRAND.tagline}
      </p>
    </div>
  );
}
