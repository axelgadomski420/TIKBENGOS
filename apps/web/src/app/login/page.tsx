import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Zaloguj się" };

/**
 * Minimalny ekran wejściowy: logowanie na górze, rejestracja niżej w tym
 * samym formularzu. Jedna kolumna, wyraźna hierarchia i brak kart/kafli,
 * które odciągałyby uwagę od wejścia do aplikacji.
 */
export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--bengos-surface)] px-4 py-8 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(118,132,255,0.16),transparent_48%)]" />
        <div className="absolute -left-40 top-1/4 size-80 rounded-full bg-[var(--bengos-accent)] opacity-[0.07] blur-3xl" />
        <div className="absolute -right-40 bottom-0 size-96 rounded-full bg-[var(--bengos-warning)] opacity-[0.05] blur-3xl" />
      </div>

      <div className="w-full max-w-[440px]">
        <header className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-[72px] items-center justify-center overflow-hidden rounded-[24px] border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)] shadow-[0_12px_42px_rgba(0,0,0,0.25)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" className="size-full object-cover object-top" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.34em] text-[var(--bengos-text-muted)]">
            {BRAND.name}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--bengos-text)] sm:text-3xl">
            Wszystko zaczyna się tutaj
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--bengos-text-muted)]">
            Jedno konto. Twoje treści, rozmowy i pomysły w jednym miejscu.
          </p>
        </header>

        <LoginForm />

        <footer className="mt-6 flex flex-col items-center gap-3 text-center">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm text-[var(--bengos-text-muted)] underline-offset-4 hover:text-[var(--bengos-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bengos-focus-ring)]"
          >
            Przeglądaj jako gość
          </Link>
          <p className="text-xs text-[var(--bengos-text-muted)]">
            Kontynuując, akceptujesz zasady i politykę prywatności BENGOS.
          </p>
        </footer>
      </div>
    </main>
  );
}
