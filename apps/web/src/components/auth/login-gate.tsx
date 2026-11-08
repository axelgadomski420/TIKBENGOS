"use client";

import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";
import { useSession } from "@/lib/session-context";

/**
 * Brama logowania — jedyny widok dla osoby bez sesji.
 *
 * ── „BEZ ZALOGOWANIA NIC NIE WIDAĆ” ───────────────────────────────────
 * Właściciel postanowił, że aplikacja nie pokazuje niczego przed wejściem:
 * feed, studio, chat, asystent — to treść konta, więc osoba bez sesji
 * widzi tylko wejście. Brama stoi w powłoce (AppShell), a nie w pojedynczych
 * stronach: jedna brama, zero szczelin. Gdyby każda strona pilnowała sama,
 * jedna zapomniana pokazałaby treść bez zalogowania.
 *
 * ── UKŁAD Z GRAFIKI MARKI ─────────────────────────────────────────────
 * „logowanie” wielkim cyjanem u góry, tygrys w świecącym okręgu pośrodku,
 * „rejestracja” jako odnośnik na dole — kompozycja z pliku login.jpg.
 * Napisy z grafiki są wypalonymi pikselami: nie da się ich kliknąć ani
 * odczytać czytnikiem ekranu. Tu stoją PRAWDZIWE napisy w tych samych
 * miejscach — klikalne, czytane, dostępne z Tab.
 *
 * ── REJESTRACJA PRZEZ SKRÓT, NIE PRZEZ DRUGI FORMULARZ ────────────────
 * Odnośnik „rejestracja” prowadzi na /login#rejestracja; formularz czyta
 * skrót przy montażu i włącza zakładkę rejestracji. Jedna implementacja
 * formularza, dwa wejścia.
 */
export function LoginGate() {
  const { status, identity } = useSession();

  if (status === "loading") {
    // Chwila między wejściem a odpowiedzią /users/me. Krótka z definicji,
    // ale obsłużona osobno: pusty ekran wyglądałby jak awaria.
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy="true">
        <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.logo}
            alt=""
            width={1024}
            height={1024}
            className="size-full object-cover object-center"
          />
        </span>
        <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Sprawdzam sesję…
        </p>
      </div>
    );
  }

  if (status === "authenticated" && identity) {
    // /login dla zalogowanego to nie brama, tylko droga powrotna — OAuth
    // wraca tu z ciasteczkiem sesji i tą kartą dowozimy na pulpit.
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-[var(--bengos-size-caption)] uppercase tracking-[0.34em] text-[var(--bengos-text-muted)]">
          {BRAND.name}
        </p>
        <h1 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]">
          Jesteś zalogowany jako {identity.displayName ?? identity.username}
        </h1>
        <Link
          href="/"
          className="bengos-touch-target inline-flex items-center justify-center rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-5 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Przejdź na pulpit
        </Link>
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      {/*
        Tło: kompozycja logowania na CAŁYM ekranie, przygaszona i rozmyta —
        daje nastrój znaku marki, a formularz czyta się NA niej, nie obok niej.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.login}
          alt=""
          width={1024}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-center opacity-60 blur-[2px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--bengos-surface)_0%,transparent_20%,transparent_64%,var(--bengos-surface)_100%)]" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.12] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.10] blur-3xl" />
      </div>

      {/* „logowanie” — wielki cyjan u góry, jak na grafice marki. */}
      <header className="px-5 pt-10 text-center sm:pt-14">
        <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)] lowercase tracking-[0.12em] text-[var(--bengos-accent)] [text-shadow:0_0_28px_var(--bengos-glow)]">
          logowanie
        </h1>
        <p className="bengos-eyebrow mt-2 text-[var(--bengos-text-muted)]">{BRAND.tagline}</p>
      </header>

      {/*
        Tygrys w świecącym okręgu — środek ekranu, jak na grafice. Całość
        jest dekoracją (aria-hidden): nazwę i działanie niosą napisy,
        obraz w kole jest czystym znakiem marki z pustym altem.
      */}
      <div className="flex items-center justify-center px-5 py-8" aria-hidden="true">
        <div className="flex size-36 items-center justify-center sm:size-44">
          <div className="bengos-hud flex size-full items-center justify-center">
            <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
            <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3 sm:-inset-5" />
            <span className="bengos-hud__ring bengos-hud__ring--arc -inset-6 sm:-inset-10" />
            <span className="flex h-[80%] w-[80%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_72px_-12px_var(--bengos-glow)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND.logo}
                alt=""
                width={1024}
                height={1024}
                fetchPriority="high"
                className="size-full object-cover object-center"
              />
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm px-5 pb-4 sm:max-w-md">
        <LoginForm />
      </div>

      {/* „rejestracja” — odnośnik na dole, jak na grafice. */}
      <footer className="mt-auto px-5 pb-10 pt-4 text-center">
        <Link
          href="/login#rejestracja"
          className="bengos-touch-target inline-flex items-center justify-center px-4 text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] lowercase tracking-[0.12em] text-[var(--bengos-accent)] [text-shadow:0_0_22px_var(--bengos-glow)]"
        >
          rejestracja
        </Link>
      </footer>
    </div>
  );
}
