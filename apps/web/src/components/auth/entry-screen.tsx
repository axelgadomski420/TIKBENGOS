"use client";

import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";

/**
 * Minimalna brama — zero HUD, zero dużego tygrysa, zero wycieków.
 * Tylko przełącznik trybu + formularz na pełną szerokość.
 * Cel: żeby logowanie/rejestracja wreszcie działały na telefonie.
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
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#0A0E18] px-4 py-8">
      <h1 className="mb-2 text-center text-3xl font-semibold text-[#00F7FF]">
        BENGOS
      </h1>
      <p className="mb-6 text-center text-sm text-[#9FB4D6]">
        {mode === "logowanie" ? "Zaloguj się" : "Załóż konto"}
      </p>

      <button
        type="button"
        onClick={() => setMode(isRegister ? "logowanie" : "rejestracja")}
        className="mb-6 text-sm text-[#00F7FF] underline underline-offset-4"
      >
        {isRegister ? "Masz już konto? Logowanie" : "Nie masz konta? Rejestracja"}
      </button>

      <div className="w-full max-w-sm">
        <LoginForm registerMode={isRegister} />
      </div>
    </div>
  );
}
