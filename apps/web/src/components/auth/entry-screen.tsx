"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

/**
 * Ekran wejścia — logowanie i rejestracja muszą być widoczne i używalne.
 *
 * Na telefonie znak jest mniejszy, formularz jest głównym elementem
 * i zawsze pełną szerokością pod nim. Przełącznik trybu działa od razu.
 */
export function EntryScreen() {
  const [mode, setMode] = useState<"logowanie" | "rejestracja">("logowanie");

  useEffect(() => {
    if (window.location.hash === "#rejestracja") setMode("rejestracja");
  }, []);

  const isRegister = mode === "rejestracja";
  const otherMode = isRegister ? "logowanie" : "rejestracja";

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-start bg-[var(--bengos-surface)] px-4 py-8 overflow-x-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-24 size-[36rem] -translate-x-1/2 rounded-full bg-[var(--bengos-accent)] opacity-[0.06] blur-3xl" />
      </div>

      {/* Znak — mniejszy na telefonie, żeby formularz zmieścił się od razu */}
      <div className="relative mt-4 size-40 shrink-0 sm:size-56">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-2 sm:-inset-3" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-4 sm:-inset-6" />
          <span className="flex h-[76%] w-[76%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_100px_-16px_var(--bengos-glow)]">
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

      {/* Tryb — duże, klikalne */}
      <h1 className="mt-6 text-center text-3xl font-[var(--bengos-weight-semibold)] lowercase tracking-[0.08em] text-[var(--bengos-accent)] drop-shadow-[0_0_20px_var(--bengos-glow)] sm:text-4xl">
        {mode}
      </h1>

      <button
        type="button"
        onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
        className="mt-2 text-center text-xl font-[var(--bengos-weight-medium)] lowercase tracking-[0.06em] text-[var(--bengos-accent)] underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)] sm:text-2xl"
        aria-label={`Przełącz na ${otherMode}`}
      >
        {otherMode}
      </button>

      {/* Formularz — główny element, pełna szerokość, zawsze widoczny */}
      <div className="mt-8 w-full max-w-md">
        <LoginForm registerMode={isRegister} />
      </div>

      <p className="mt-10 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {BRAND.tagline}
      </p>
    </div>
  );
}
