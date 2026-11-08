"use client";

import { useEffect, useState } from "react";
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
 * widzi tylko wejście. Brama stoi w POWŁOCE (AppShell), a nie w pojedynczych
 * stronach: jedna brama, zero szczelin.
 *
 * ── JEDEN TYGRYS NA EKRAN, NIE DWA (naprawa 2026-11-08, wieczorem) ─────
 * Właściciel pokazał zrzut z telefonu: na ekranie startowym stały DWIE
 * kopie tygrysa jedna nad drugą, a formularz był przycięty na dole.
 * Przyczyna była w `brand.ts` — wszystkie trzy pola (`logo`, `login`,
 * `menu`) wskazywały na TEN SAM plik, więc `BRAND.login` jako pełnoekranowe
 * tło rysowało tę samą grafikę, którą `BRAND.logo` rysowało w okręgu.
 * Na desktopie tło było przygaszone i rozmyte, więc dublowanie nie rzucało
 * się w oczy; na telefonie grafika 1024×1024 rozciągnięta na cały pionowy
 * ekran dominowała mimo `blur-[2px]` i `opacity-60`.
 *
 * Tło z tygrysem zniknęło z tego ekranu. Zostaje JEDEN znak — ten w okręgu,
 * bo to on jest osią kompozycji z grafiki właściciela. Tło robią poświaty
 * z tokenów, tak samo jak na pulpicie: dzięki temu oba ekrany mówią jednym
 * językiem, a żadna grafika nie jest rysowana dwa razy.
 *
 * ── MENU GŁÓWNE TYLKO PO ZALOGOWANIU ───────────────────────────────────
 * Brama ma DWA tryby i nic więcej: `logowanie` i `rejestracja`.
 * Menu główne to ekran PULPITU (`/`, rysowany przez `app-shell.tsx`
 * i `module-branches.tsx`), a nie widok dla przybysza — `AppShell` przy
 * braku sesji nie renderuje pulpitu wcale, tylko tę bramę.
 *
 * ── NAPISY SĄ KLIKALNE ────────────────────────────────────────────────
 * Na grafice właściciela napisy to WYPALONE PIKSELI — nie da się ich
 * kliknąć ani odczytać czytnikiem. Tu stoją jako PRAWDZIWE odnośniki
 * z adresem (`/login#rejestracja`) — mają stan fokusu z klawiatury,
 * pokazują adres po najechaniu i dają się wysłać komuś jako link.
 *
 * ── MOBILE FIRST: WYMIARY OD WYSOKOŚCI, NIE OD SZEROKOŚCI ──────────────
 * Okrąg ma `min(34dvh,52vw,220px)`, odstępy `pt-5`/`mt-3`, a stopka
 * `pb-[max(1.5rem,env(safe-area-inset-bottom))]`. Dzięki temu przy
 * rejestracji — trzy pola, lista wymagań hasła, przycisk — wszystko mieści
 * się NAD zgięciem, a na iPhonie napis „rejestracja” nie siedzi pod paskiem
 * gestów. `dvh`, nie `vh`: na telefonie `vh` liczy się od największej
 * wysokości okna (z ukrytym paskiem adresu) i element wystaje poza ekran.
 */
type GateMode = "logowanie" | "rejestracja";

/* Dwa słowa strony startowej. Dolny pasek pokazuje to, którym ekran nie jest. */
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
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      {/*
        Tło: TYLKO poświaty z tokenów. Grafika z tygrysem zniknęła stąd
        celowo — powód jest w nagłówku pliku (dwa tygrysy na jednym ekranie,
        bo `brand.ts` wskazywał tym samym adresem na wszystkie trzy pola).
        Poświaty dają nastrój marki bez rysowania drugiego znaku.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.12] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.10] blur-3xl" />
        <div className="absolute left-1/2 top-0 size-[24rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[var(--bengos-accent)] opacity-[0.07] blur-3xl" />
      </div>

      {/* Górne słowo — wielki cyjan trybu, jak na grafice marki. */}
      <header className="px-4 pt-5 text-center sm:pt-10">
        <h1 className="text-[clamp(2rem,9vw,5.5rem)] font-[var(--bengos-weight-semibold)] lowercase leading-none tracking-[0.06em] text-[var(--bengos-accent)] [text-shadow:0_0_38px_var(--bengos-glow)]">
          {mode}
        </h1>
        <p className="bengos-eyebrow mt-2 text-[var(--bengos-text-muted)] sm:mt-3">{BRAND.tagline}</p>
      </header>

      {/*
        ── JEDEN ZNAK, W OKRĘGU ────────────────────────────────────────
        To jest jedyna grafika na tym ekranie. Średnica liczona od
        WYSOKOŚCI (`dvh`) i `vw` naraz, z sufitem 220 px — przy rejestracji
        (trzy pola, lista wymagań, przycisk) wszystko mieści się nad
        zgięciem. `aria-hidden`: tryb niosą napisy, obraz jest znakiem
        marki z pustym altem.
      */}
      <div
        className="relative mx-auto mt-3 flex size-[min(34dvh,52vw,220px)] items-center justify-center sm:mt-5"
        aria-hidden="true"
      >
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3 sm:-inset-4" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-6 sm:-inset-9" />
          <span className="flex h-[80%] w-[80%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_96px_-16px_var(--bengos-glow)]">
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

      <div className="mx-auto w-full max-w-sm px-4 pb-2 sm:max-w-md">
        <LoginForm registerMode={mode === "rejestracja"} />
      </div>

      {/*
        ── STOPKA Z ODSTĘPEM NA PASEK GESTÓW ────────────────────────────
        Dolne słowo to ODNOŚNIK do drugiego trybu, nie przycisk.
        `pb-[max(1.5rem,env(safe-area-inset-bottom))]` — dolny odstęp to
        większa z dwóch wartości: nasze 24 px albo wcięcie systemowe.
        Bez tego na iPhonie napis „rejestracja” siedzi pod paskiem home,
        a kliknięcie w niego cofa użytkownika do ekranu głównego.
      */}
      <footer className="mt-auto px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {GATE_MODES.filter((word) => word !== mode).map((word) => (
            <Link
              key={word}
              href={"/login?after=" + encodeURIComponent(safeAfter()) + (word === "rejestracja" ? "#rejestracja" : "")}
              onClick={() => setMode(word)}
              className="bengos-touch-target px-3 py-2 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)] lowercase tracking-[0.06em] text-[var(--bengos-accent)] [text-shadow:0_0_22px_var(--bengos-glow)]"
            >
              {word}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
