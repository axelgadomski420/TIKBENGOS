"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

/**
 * Brama BENGOS — zbudowana od zera.
 *
 * Układ ze zdjęć właściciela:
 * - duże cyjanowe słowo trybu NAD znakiem,
 * - duży okrąg z tygrysem (BRAND.logo),
 * - drugie słowo POD znakiem jako wyraźny przełącznik,
 * - formularz pod spodem, pełna szerokość.
 *
 * Przełącznik zmienia mode i przekazuje registerMode do LoginForm,
 * żeby pojawiały się pola rejestracji (username + email).
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
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-[#0A0E18] px-4 py-6 overflow-x-hidden">
      {/* Poświata */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F7FF] opacity-[0.07] blur-3xl"
      />

      {/* Słowo trybu — nad znakiem */}
      <h1 className="mb-3 text-center text-4xl font-semibold lowercase tracking-[0.1em] text-[#00F7FF] drop-shadow-[0_0_20px_#14809F] sm:text-5xl">
        {mode}
      </h1>

      {/* Znak */}
      <div className="relative size-56 shrink-0 sm:size-72">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-5" />
          <span className="flex h-[76%] w-[76%] items-center justify-center overflow-hidden rounded-full border border-[#51689B] bg-[#060A12] shadow-[0_0_100px_-16px_#14809F]">
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

      {/* Drugie słowo — pod znakiem, wyraźny przełącznik */}
      <button
        type="button"
        onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
        className="mt-3 mb-6 text-center text-3xl font-semibold lowercase tracking-[0.1em] text-[#00F7FF] drop-shadow-[0_0_16px_#14809F] underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5FF0FF] sm:text-4xl"
        aria-label={`Przełącz na ${otherMode}`}
      >
        {otherMode}
      </button>

      {/* Formularz — pełna szerokość */}
      <div className="w-full max-w-sm">
        <LoginForm registerMode={isRegister} />
      </div>

      <p className="mt-8 text-center text-xs text-[#9FB4D6]">
        {BRAND.tagline}
      </p>
    </div>
  );
}
