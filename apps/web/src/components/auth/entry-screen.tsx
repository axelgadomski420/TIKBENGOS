"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

/**
 * Ekran startowy BENGOS — przepisany od zera.
 *
 * Wygląd z grafiki właściciela:
 * - duże świecące słowo trybu NAD znakiem,
 * - duży okrąg HUD z tygrysem w środku,
 * - drugie słowo POD znakiem jako przełącznik,
 * - formularz pod spodem, pełna szerokość.
 *
 * Zero dziedziczenia po poprzednich wersjach. Zero HomeDashboard.
 * Tylko to, co widać w kodzie poniżej.
 */
export function EntryScreen() {
  const [mode, setMode] = useState<"logowanie" | "rejestracja">("logowanie");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#rejestracja") {
      setMode("rejestracja");
    }
  }, []);

  const isRegister = mode === "rejestracja";
  const otherMode = isRegister ? "logowanie" : "rejestracja";

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-[#0A0E18] px-4 py-8">
      {/* Poświata */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F7FF] opacity-[0.08] blur-3xl"
      />

      {/* Słowo trybu — nad znakiem */}
      <h1 className="mb-4 text-center text-4xl font-semibold lowercase tracking-[0.1em] text-[#00F7FF] drop-shadow-[0_0_24px_#14809F] sm:text-5xl">
        {mode}
      </h1>

      {/* Znak w HUD */}
      <div className="relative size-64 sm:size-80">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3 sm:-inset-4" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-6 sm:-inset-8" />
          <span className="flex h-[78%] w-[78%] items-center justify-center overflow-hidden rounded-full border border-[#51689B] bg-[#060A12] shadow-[0_0_120px_-20px_#14809F]">
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

      {/* Drugie słowo — pod znakiem, przełącznik */}
      <button
        type="button"
        onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
        className="mt-4 text-center text-3xl font-semibold lowercase tracking-[0.1em] text-[#00F7FF] drop-shadow-[0_0_20px_#14809F] underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5FF0FF] sm:text-4xl"
        aria-label={`Przełącz na ${otherMode}`}
      >
        {otherMode}
      </button>

      {/* Formularz */}
      <div className="mt-8 w-full max-w-sm">
        <LoginForm registerMode={isRegister} />
      </div>

      <p className="mt-8 text-center text-sm text-[#9FB4D6]">
        {BRAND.tagline}
      </p>
    </div>
  );
}
