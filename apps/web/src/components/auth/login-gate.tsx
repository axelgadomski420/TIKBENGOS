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
 * ── SŁOWO U GÓRY TO TRYB, SŁOWO NA DOLE TO PRZYCISK ────────────────────
 * Grafika marki ma dokładnie dwa słowa: „logowanie” u góry i „rejestracja”
 * na dole. Ekran robi z nich system: górne słowo mówi, w KTÓRYM trybie
 * się jest, dolne ten tryb PRZEŁĄCZA. Wcześniej na ekranie były jeszcze
 * zakładki i drugi tytuł na karcie formularza — trzy rzeczy powtarzały
 * to samo, więc żadna nie mówiła nic wyraźnie. Teraz jedno słowo = jedna
 * odpowiedzialność, dokładnie jak na grafice.
 *
 * ── REJESTRACJA PRZEZ SKRÓT, NIE PRZEZ DRUGI FORMULARZ ────────────────
 * Odnośnik „rejestracja” prowadzi na /login#rejestracja; formularz czyta
 * skrót przy montażu i przełącza tryb. Jedna implementacja formularza,
 * dwa wejścia.
 *
 * (Aktualizacja 2026-11-08: skrót czyta teraz TA brama i przekazuje tryb
 * formularzowi propsem, a dolne słowo jest przyciskiem — przełącza tryb
 * od razu, bez przeładowania. Głęboki odnośnik /login#rejestracja dalej
 * działa, bo skrót czytany jest przy montażu.)
 *
 * ── ROZMIAR JAK NA GRAFICE, NIE MINIATURA ─────────────────────────────
 * Na grafice marki kula z tygrysem DOMINUJE nad kompozycją — to oś, wokół
 * której wszystko stoi. Wcześniejszy okrąg miał 144 px i był ozdobą.
 * Teraz średnica liczy się od szerokości ekranu — min(64vw, 320px) — więc
 * na telefonie tygrys zajmuje dwie trzecie szerokości jak na grafice,
 * a na dużym ekranie nie rośnie w nieskończoność. Nagłówek idzie w parze:
 * clamp(2.75rem, 11vw, 5.5rem), bo „logowanie” ma być pierwszą rzeczą,
 * którą oko znajduje na ekranie.
 *
 * ── TRZY EKRANY STARTU: LOGOWANIE, REJESTRACJA, MENU GŁÓWNE ───────────
 * (Aktualizacja 2026-11-08, po południu) Właściciel pokazał zdjęcie strony
 * startowej: poza „logowaniem” i „rejestracją” stoi na niej „menu główne”
 * — osobny ekran przełączany tak jak rejestracja, z podfolderami
 * („ustawienia”, „chat”, „asystent” i dalej) dookoła loga. Brama ma więc
 * trzy tryby; dolny pasek pokazuje dwa słowa, którymi ekran nie jest.
 * Podfoldery prowadzą do modułów prawdziwymi trasami — brama i tak staje
 * na drodze, więc pod kołem stoi jedno zdanie prawdy: moduły otwierają
 * się po zalogowaniu. „dev” na kole nie ma miejsca: to wejście za
 * uprawnieniem repo.connect, a brama nie zna uprawnień przybysza.
 */
type GateMode = "logowanie" | "rejestracja" | "menu";

/*
  Podfoldery menu głównego — te same trasy i podpisy, których po zalogowaniu
  używa nagłówek powłoki (app-shell.tsx). Jedna wspólna lista byłaby
  piękniejsza, ale nagłówek filtruje wejścia uprawnieniami zalogowanego,
  a brama żadnych uprawnień nie zna — dlatego stoją tu dwie listy, każda
  z własnym powodem. „dev” celowo pominięty: wejście za uprawnieniem
  repo.connect, a zapraszanie przybysza do drzwi, których może nie mieć,
  jest gorsze niż ich brak.
 */
const MENU_FOLDERS: { href: string; label: string }[] = [
  { href: "/feed", label: "bengtok" },
  { href: "/studio", label: "studio" },
  { href: "/chat", label: "chat" },
  { href: "/create", label: "asystent" },
  { href: "/access", label: "bridge" },
  { href: "/profile", label: "profil" },
  { href: "/settings", label: "ustawienia" },
];

/* Trzy słowa strony startowej; dolny pasek pokazuje te, którymi nie jest. */
const GATE_MODES: GateMode[] = ["logowanie", "rejestracja", "menu"];

export function LoginGate() {
  const { status, identity } = useSession();
  const [mode, setModeState] = useState<GateMode>("logowanie");

  // Głębokie odnośniki /login#rejestracja i /login#menu (zapisana zakładka,
  // odnośnik z innego ekranu) mają od razu właściwy tryb. Pierwsza klatka
  // pokaże „logowanie” — uniknięcie tego błysku wymagałoby czytania hasha
  // poza Reactem, a koszt tego obejścia jest większy niż sama
  // krótkotrwała niespójność.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#rejestracja") {
      setModeState("rejestracja");
    }
    if (hash === "#menu") {
      setModeState("menu");
    }
  }, []);

  // Dolne słowa przełączają tryb. Adres idzie w parze ze stanem
  // (replaceState, nie przypisanie do hash — przypisanie odpala hashchange
  // i skok do kotwicy), żeby odświeżenie strony i zapisana zakładka
  // pamiętały tryb.
  const setMode = (next: GateMode) => {
    setModeState(next);
    if (next === "logowanie") {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      return;
    }
    window.history.replaceState({}, "", next === "rejestracja" ? "#rejestracja" : "#menu");
  };

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

      {/* Górne słowo — wielki cyjan trybu, jak na grafice marki. */}
      <header className="px-5 pt-8 text-center sm:pt-12">
        <h1 className="text-[clamp(2.75rem,11vw,5.5rem)] font-[var(--bengos-weight-semibold)] lowercase leading-none tracking-[0.06em] text-[var(--bengos-accent)] [text-shadow:0_0_38px_var(--bengos-glow)]">
          {mode === "menu" ? "menu główne" : mode}
        </h1>
        <p className="bengos-eyebrow mt-3 text-[var(--bengos-text-muted)]">{BRAND.tagline}</p>
      </header>

      {mode === "menu" ? (
        <>
          {/*
            Ekran „menu główne”: logo pośrodku, podfoldery na kole wokół —
            układ ze zdjęcia właściciela. Tygrys jest tu mniejszy niż na
            ekranach logowania i rejestracji (46vw zamiast 64vw), bo
            dookoła musi zmieścić się siedem podfolderów: na zdjęciu logo
            jest osią, wokół której krążą podpisy, a nie kulą wypełniającą
            cały ekran.
          */}
          <nav aria-label="Menu główne" className="relative mx-auto my-4 size-[min(92vw,520px)]">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 flex size-[min(46vw,240px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            >
              <div className="bengos-hud flex size-full items-center justify-center">
                <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
                <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-4" />
                <span className="bengos-hud__ring bengos-hud__ring--arc -inset-9" />
                <span className="flex h-[80%] w-[80%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_96px_-16px_var(--bengos-glow)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BRAND.logo}
                    alt=""
                    width={1024}
                    height={1024}
                    className="size-full object-cover object-center"
                  />
                </span>
              </div>
            </div>
            {/*
              Podfoldery DOOKOŁA loga. Kąt liczony z indeksu (pierwszy
              na godzinie dwunastej, dalej równe łuki co 360/7), pozycja
              idzie stylem inline, bo Tailwind nie ma klas dla współrzędnych
              policzonych z kosinusa i sinusa. Promień to 42% boku
              kontenera — zostawia między pierścieniami HUD a podfolderami
              wolne pole, nic się nie dotyka, a koło czyta się od razu.
            */}
            {MENU_FOLDERS.map((folder, index) => {
              const angle = ((-90 + (360 / MENU_FOLDERS.length) * index) * Math.PI) / 180;
              return (
                <Link
                  key={folder.href}
                  href={folder.href}
                  style={{ left: (50 + Math.cos(angle) * 42) + "%", top: (50 + Math.sin(angle) * 42) + "%" }}
                  className="bengos-touch-target absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface)]/85 px-3 py-1.5 font-[var(--bengos-weight-medium)] lowercase tracking-[0.06em] text-[var(--bengos-size-caption)] text-[var(--bengos-accent)] [text-shadow:0_0_18px_var(--bengos-glow)] backdrop-blur-sm"
                >
                  {folder.label}
                </Link>
              );
            })}
          </nav>
          {/*
            Jedno zdanie prawdy: brama i tak staje na trasie modułu, więc
            kliknięcie podfolderu wróci tutaj. Bez tego zdania klik
            wyglądałby na martwy; ze zdaniem jest zaproszeniem
            do zalogowania.
          */}
          <p className="px-5 pb-2 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Moduły otwierają się po zalogowaniu.
          </p>
        </>
      ) : (
        <>
          {/*
            Tygrys w świecącym okręgu — oś kompozycji, jak na grafice. Całość
            jest dekoracją (aria-hidden): nazwę i działanie niosą napisy,
            obraz w kole jest czystym znakiem marki z pustym altem.
          */}
          <div className="flex items-center justify-center px-5 py-6" aria-hidden="true">
            <div className="flex size-[min(64vw,320px)] items-center justify-center">
              <div className="bengos-hud flex size-full items-center justify-center">
                <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
                <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-4" />
                <span className="bengos-hud__ring bengos-hud__ring--arc -inset-9" />
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
          </div>

          <div className="mx-auto w-full max-w-sm px-5 pb-2 sm:max-w-md">
            <LoginForm registerMode={mode === "rejestracja"} />
          </div>
        </>
      )}

      {/*
        Dolne słowo — przełącznik trybu. U góry stoi tryb obecny, więc na
        dole stoi jego przeciwieństwo: na ekranie logowania „rejestracja”,
        na ekranie rejestracji „logowanie”. To przycisk, nie odnośnik —
        przełącza stan bez przeładowania.

        (Aktualizacja 2026-11-08, po południu: trybów jest trzy, więc na
        dole stoją DWA słowa — te, którymi ekran nie jest. Zasada bez
        zmian: górne słowo mówi, gdzie się jest, dolne przenoszą.)
      */}
      <footer className="mt-auto px-5 pb-10 pt-4 text-center">
        <div className="flex items-center justify-center gap-8">
          {GATE_MODES.filter((word) => word !== mode).map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => setMode(word)}
              className="bengos-touch-target inline-flex items-center justify-center px-4 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)] lowercase tracking-[0.06em] text-[var(--bengos-accent)] [text-shadow:0_0_22px_var(--bengos-glow)]"
            >
              {word === "menu" ? "menu główne" : word}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
