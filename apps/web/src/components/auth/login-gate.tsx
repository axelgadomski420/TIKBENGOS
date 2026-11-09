"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { BRAND } from "@/lib/brand";
import { useSession } from "@/lib/session-context";

/**
 * Brama logowania — jedyny widok dla osoby bez sesji.
 *
 * ── UKŁAD Z GRAFIKI WŁAŚCICIELA ────────────────────────────────────────
 * Grafika marki pokazuje dwie sceny i obie są tu odtworzone napisami:
 *
 *   ekran wejścia:  „logowanie” NAD tygrysem, „rejestracja” POD nim,
 *   ekran menu:     podpisy modułów dookoła tygrysa.
 *
 * Oba napisy to PRAWDZIWE odnośniki w tych samych miejscach kompozycji.
 * Kliknięcie przełącza formularz w wybrany tryb — a jednocześnie zmienia
 * adres (replaceState), więc odświeżenie i zapisana zakładka pamiętają,
 * w którym trybie się jest.
 *
 * ── SŁOWO NAD ZNAKIEM JEST PRZYCISKIEM, NIE TYTUŁEM ─────────────────────
 * Wcześniejsza wersja stawiała wielkie słowo trybu u góry jako nagłówek,
 * a na dole odnośnik do drugiego trybu. Wyglądało jak grafika, ale czytało
 * się mylnie: wielki napis wyglądał na etykietę, a nie na rzecz do kliknięcia.
 * Teraz OBA słowa są przyciskami tej samej wagi: nad tygrysem „logowanie”,
 * pod nim „rejestracja”, oba przełączają tryb i oba mają 44 px celu.
 * Aktywne słowo jest podświetlone (tło akcentu), nieaktywne przygaszone —
 * widać, gdzie się jest, zanim przeczyta się podpis.
 *
 * ── JEDEN TYGRYS NA EKRAN ──────────────────────────────────────────────
 * Znak jest rysowany TYLKO raz — w okręgu HUD między słowami. Zasłona
 * startowa (`BootSplash`), która rysowała tę samą grafikę w `layout.tsx`,
 * została usunięta: pokazywała drugiego tygrysa pod bramą i ściskała
 * formularz do wąskiego paska przy lewej krawędzi.
 *
 * ── MOBILE FIRST: WYMIARY OD WYSOKOŚCI, NIE OD SZEROKOŚCI ──────────────
 * Okrąg ma `min(30dvh,46vw,200px)`, więc przy rejestracji — trzy pola,
 * lista wymagań hasła, przycisk — wszystko mieści się NAD zgięciem.
 * `dvh`, nie `vh`: na telefonie `vh` liczy się od największej wysokości
 * okna (z ukrytym paskiem adresu) i element wystaje poza ekran.
 *
 * ── STOPKA Z ODSTĘPEM NA PASEK GESTÓW ─────────────────────────────────
 * `pb-[max(1rem,env(safe-area-inset-bottom))]` — bez tego dolny napis
 * na iPhonie siedzi pod paskiem home i kliknięcie cofa użytkownika
 * do ekranu głównego, co wygląda jak zepsuta strona.
 */
type GateMode = "logowanie" | "rejestracja";

const GATE_MODES: GateMode[] = ["logowanie", "rejestracja"];

/** Adres trybu: logowanie bez skrótu, rejestracja ze skrótem. */
function modeHref(mode: GateMode): string {
  return mode === "rejestracja" ? "/login#rejestracja" : "/login";
}

/**
 * Adres modułu, do którego użytkownik chciał wejść — z parametru `after`.
 *
 * `after` pochodzi z adresu, więc każdy może w nim wpisać co chce. Gdyby
 * trafiało do przekierowania bez sprawdzenia, dałoby się z tej strony
 * zrobić otwarte przekierowanie na obcą domenę. Dlatego przyjmujemy
 * WYŁĄCZNIE ścieżkę wewnętrzną: jedno `/`, bez `//` i bez schematu.
 */
function safeAfter(): string {
  if (typeof window === "undefined") return "/";
  const value = new URLSearchParams(window.location.search).get("after") || "";
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes(":") && !value.includes("\\")) {
    return value;
  }
  return "/";
}

/**
 * Jedno słowo-przełącznik. Aktywne jest podświetlone tłem akcentu,
 * nieaktywne przygaszone — stan widać bez czytania podpisu.
 *
 * To `button`, nie `Link`: przełącza formularz w tym samym ekranie, więc
 * nawigacja byłaby przeładowaniem bez potrzeby. Adres i tak idzie w parze
 * przez `setMode` (replaceState), więc zakładka pamięta tryb.
 */
function ModeWord({
  mode,
  active,
  onClick,
  size,
}: {
  mode: GateMode;
  active: boolean;
  onClick: () => void;
  size: "hero" | "foot";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "bengos-touch-target rounded-[var(--bengos-radius-control)] px-4 lowercase tracking-[0.06em] transition-colors duration-[var(--bengos-motion-fast)] " +
        (size === "hero"
          ? "text-[clamp(1.75rem,8vw,4.5rem)] font-[var(--bengos-weight-semibold)] leading-none "
          : "text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]") +
        " " +
        (active
          ? "text-[#7ef6ff] [text-shadow:0_0_32px_#39e7ff]"
          : "text-[#9befff] [text-shadow:0_0_16px_#14809F] hover:text-[#7ef6ff]")
      }
    >
      {mode}
    </button>
  );
}

export function LoginGate() {
  const { status, identity } = useSession();
  const [mode, setModeState] = useState<GateMode>("logowanie");

  // Głęboki odnośnik /login#rejestracja (zapisana zakładka, odnośnik
  // z innego ekranu) ma od razu właściwy tryb.
  useEffect(() => {
    if (window.location.hash === "#rejestracja") setModeState("rejestracja");
  }, []);

  // Zmiana trybu idzie TAKŻE w adres (replaceState, nie przypisanie do
  // hash — przypisanie odpala hashchange i skok do kotwicy).
  const setMode = (next: GateMode) => {
    setModeState(next);
    window.history.replaceState({}, "", modeHref(next));
  };

  if (status === "loading") {
    // Chwila między wejściem a odpowiedzią /users/me. Krótka z definicji,
    // ale obsłużona osobno: pusty ekran wyglądałby jak awaria.
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy="true">
        <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={1024} height={1024} className="size-full object-cover object-center" />
        </span>
        <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">Sprawdzam sesję…</p>
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
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#05070d] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#05070d]" />
        <div className="absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00e7ff] opacity-[0.08] blur-3xl" />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-5">
        <ModeWord
          mode="logowanie"
          active={mode === "logowanie"}
          onClick={() => setMode("logowanie")}
          size="hero"
        />

        <div
          className="relative my-2 flex size-[min(70vw,42dvh,26rem)] items-center justify-center"
          aria-hidden="true"
        >
          <div className="bengos-hud flex size-full items-center justify-center">
            <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
            <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3 sm:-inset-4" />
            <span className="bengos-hud__ring bengos-hud__ring--arc -inset-6 sm:-inset-8" />
            <span className="flex size-[86%] items-center justify-center overflow-hidden rounded-full border border-[#7ef6ff]/40 bg-[#060A12] shadow-[0_0_80px_-12px_#39e7ff]">
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

        <ModeWord
          mode="rejestracja"
          active={mode === "rejestracja"}
          onClick={() => setMode("rejestracja")}
          size="hero"
        />

        <div className="mt-4 w-full">
          <LoginForm registerMode={mode === "rejestracja"} />
        </div>
      </main>

      <footer className="mt-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center">
        <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">{BRAND.tagline}</p>
      </footer>
    </div>
  );
}
