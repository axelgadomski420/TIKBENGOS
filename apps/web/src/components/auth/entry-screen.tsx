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
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[var(--bengos-surface)] px-4 py-6 overflow-hidden">
      {/* Poświaty w tle */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[40%] size-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bengos-accent)] opacity-[0.07] blur-3xl" />
        <div className="absolute -right-32 bottom-16 size-[28rem] rounded-full bg-[var(--bengos-warning)] opacity-[0.05] blur-3xl" />
      </div>

      {/* 1. Słowo trybu — nad znakiem, duże, cyjan, glow */}
      <h1 className="mb-2 text-center text-5xl font-[var(--bengos-weight-semibold)] lowercase tracking-[0.1em] text-[var(--bengos-accent)] drop-shadow-[0_0_32px_var(--bengos-glow)] sm:text-6xl">
        {mode}
      </h1>

      {/* 2. Znak marki w HUD — duży, dominujący */}
      <div className="relative size-72 shrink-0 sm:size-96">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-4 sm:-inset-5" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-8 sm:-inset-10" />
          <span className="flex h-[80%] w-[80%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_160px_-24px_var(--bengos-glow)]">
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

      {/* 3. Drugie słowo — pod znakiem, duże, jako przełącznik */}
      <button
        type="button"
        onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
        className="mt-2 text-center text-4xl font-[var(--bengos-weight-semibold)] lowercase tracking-[0.1em] text-[var(--bengos-accent)] drop-shadow-[0_0_24px_var(--bengos-glow)] underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)] sm:text-5xl"
        aria-label={`Przełącz na ${otherMode}`}
      >
        {otherMode}
      </button>

      {/* 4. Formularz — pod spodem, mniejszy wizualnie */}
      <div className="mt-6 w-full max-w-xs sm:max-w-sm">
        <LoginForm registerMode={isRegister} />
      </div>

      <p className="mt-6 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {BRAND.tagline}
      </p>
    </div>
  );
}
