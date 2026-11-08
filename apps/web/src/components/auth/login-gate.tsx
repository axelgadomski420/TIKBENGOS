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
 * ── MOBILE FIRST: TELEFON JEST PIERWSZY, NIE POMNIEJSZONY ──────────────
 * (Aktualizacja 2026-11-08) Poprzednia wersja była pisana „na desktop
 * i zmniejszana”: okrąg o stałej średnicy `min(64vw,320px)`, odstępy
 * `pt-8`/`py-6`, stopka `pb-10`. Na telefonie 360×640 suma tych wartości
 * przekraczała wysokość ekranu — a przy rejestracji, gdzie dochodzą trzy
 * pola i lista wymagań hasła, PRZYCISK „Utwórz konto” lądował pod zgięciem.
 * Użytkownik musiał przewijać, żeby wysłać formularz, i to jest najgorszy
 * błąd, jaki może mieć ekran logowania.
 *
 * Teraz wymiary liczą się OD WYSOKOŚCI EKRANU, nie od jego szerokości:
 * okrąg ma `min(42dvh, 42vw, 240px)`, więc kurczy się, gdy brakuje pionu,
 * a odstępy pionowe schodzą na `py-3` i stopka na `pb-6`+safe-area.
 * `dvh` (dynamic viewport height), nie `vh`: na telefonie `vh` liczy się
 * od największej wysokości okna (z ukrytym paskiem adresu), więc element
 * wystający poza ekran wygląda na przycięty.
 *
 * ── `env(safe-area-inset-bottom)` W STOPCE ────────────────────────────
 * Od tego zależy, czy napis „rejestracja” da się kliknąć na iPhonie.
 * Bez `safe-area-inset-bottom` przycisk siedzi POD paskiem gestów systemu
 * i użytkownik trafia palcem w gest zamiast w odnośnik — a wtedy myśli,
 * że strona nie działa. Działa tylko z `viewportFit: "cover"`, który
 * ustawia `layout.tsx`; obie rzeczy muszą być naraz.
 *
 * ── NAPISY NA GRAFICE SĄ KLIKALNE ──────────────────────────────────────
 * Zdjęcie właściciela (2026-11-08) ma dokładnie dwa przeznaczenia:
 *   ekran główny — tygrys w świecącym okręgu, nad nim „logowanie”,
 *   pod nim „rejestracja”;
 *   ekran menu   — tygrys mniejszy, a wokół niego podpisy modułów.
 *
 * Na grafice te napisy są WYPALONYMI PIKSELAMI — nie da się ich kliknąć
 * ani odczytać czytnikiem ekranu. Tu stoją jako PRAWDZIWE odnośniki
 * w tych samych miejscach kompozycji, a kliknięcie otwiera formularz
 * w wybranym trybie.
 *
 * ── MENU GŁÓWNE JEST OSOBNYM EKRANEM, NIE DOKLEJKĄ ─────────────────────
 * Ekrany się WYKLUCZAJĄ: albo formularz (logowanie/rejestracja), albo
 * menu z podpisami wokół mniejszego tygrysa. Jeden tygrys na ekran.
 *
 * ── NA WĄSKIM EKRANIE PODPISY IDĄ W SIATKĘ, NIE NA KOŁO ───────────────
 * Koło z siedmioma podpisami działa na ekranie od ~380 px w górę. Poniżej
 * napisy „ustawienia” i „asystent” zachodzą na siebie, bo długość tekstu
 * jest stała, a promień maleje razem z ekranem. Dlatego na wąskim ekranie
 * podpisy schodzą do SIATKI 2 kolumn (ta sama kolejność, te same napisy),
 * a koło wraca od progu `sm`. Siatka nie jest ustępstwem: na telefonie
 * trzyma 44 px celu dotykowego i nie nakłada tekstu na tekst.
 */
type GateMode = "logowanie" | "rejestracja" | "menu";

/*
  Podpisy modułów z grafiki właściciela. KAŻDY prowadzi do rejestracji,
  bo wejście do modułu bez konta i tak wraca na tę bramę — droga w kółko
  wyglądająca na zepsutą. Trasa modułu jedzie w `after`, żeby po założeniu
  konta użytkownik trafił tam, gdzie chciał.
*/
const MENU_FOLDERS: { key: string; label: string; after: string }[] = [
  { key: "bengtok", label: "bengtok", after: "/feed" },
  { key: "studio", label: "studio", after: "/studio" },
  { key: "chat", label: "chat", after: "/chat" },
  { key: "asystent", label: "asystent", after: "/create" },
  { key: "bridge", label: "bridge", after: "/access" },
  { key: "profil", label: "profil", after: "/profile" },
  { key: "ustawienia", label: "ustawienia", after: "/settings" },
];

const GATE_MODES: GateMode[] = ["logowanie", "rejestracja", "menu"];

/** Etykieta trybu — tryb `menu` nazywa się „menu główne”. */
function modeLabel(mode: GateMode): string {
  return mode === "menu" ? "menu główne" : mode;
}

/** Adres trybu: logowanie bez skrótu, rejestracja i menu ze skrótem. */
function modeHref(mode: GateMode): string {
  if (mode === "rejestracja") return "/login#rejestracja";
  if (mode === "menu") return "/login#menu";
  return "/login";
}

/**
 * Adres modułu, do którego użytkownik chciał wejść — z parametru `after`.
 *
 * ── DLACZEGO TYLKO ŚCIEŻKA WEWNĘTRZNA ─────────────────────────────────
 * `after` pochodzi z adresu, więc każdy może w nim wpisać co chce. Gdyby
 * trafiało do przekierowania bez sprawdzenia, dałoby się z tej strony
 * zrobić otwarte przekierowanie na obcą domenę — link wyglądałby na nasz,
 * a prowadził gdzie indziej. Dlatego przyjmujemy WYŁĄCZNIE ścieżkę
 * zaczynającą się od pojedynczego `/`, bez `//` (protokół względny)
 * i bez schematu.
 */
function safeAfter(): string {
  if (typeof window === "undefined") return "/";
  const value = new URLSearchParams(window.location.search).get("after") || "";
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes(":") && !value.includes("\\")) {
    return value;
  }
  return "/";
}

/** Klasa jednego podpisu — wspólna dla koła i siatki, żeby były tym samym. */
const FOLDER_CLASS =
  "bengos-touch-target items-center justify-center rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface)]/85 px-3 py-2 font-[var(--bengos-weight-medium)] lowercase tracking-[0.06em] text-[var(--bengos-size-caption)] text-[var(--bengos-accent)] [text-shadow:0_0_18px_var(--bengos-glow)] backdrop-blur-sm transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-accent)]";

/** Pierścienie HUD wokół znaku — jeden zestaw dla obu ekranów. */
function Hud({ size }: { size: string }) {
  return (
    <div aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className={"bengos-hud flex items-center justify-center " + size}>
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
            className="size-full object-cover object-center"
          />
        </span>
      </div>
    </div>
  );
}

export function LoginGate() {
  const { status, identity } = useSession();
  const [mode, setModeState] = useState<GateMode>("logowanie");

  // Głębokie odnośniki /login#rejestracja i /login#menu (zapisana zakładka,
  // odnośnik z innego ekranu) mają od razu właściwy tryb. Pierwsza klatka
  // pokaże „logowanie” — uniknięcie tego błysku wymagałoby czytania hasha
  // poza Reactem, a koszt obejścia byłby większy niż ta niespójność.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#rejestracja") setModeState("rejestracja");
    if (hash === "#menu") setModeState("menu");
  }, []);

  // Zmiana trybu idzie TAKŻE w adres (replaceState, nie przypisanie do
  // hash — przypisanie odpala hashchange i skok do kotwicy), żeby
  // odświeżenie strony i zapisana zakładka pamiętały tryb.
  const setMode = (next: GateMode) => {
    setModeState(next);
    window.history.replaceState({}, "", modeHref(next));
  };

  if (status === "loading") {
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
    /*
      ── ODSTĘPY LICZĄ SIĘ OD TOKENÓW, NIE OD PIKSELI ───────────────────
      `px-4` zamiast `px-5`, `pt-5` zamiast `pt-8`, `pb-[calc(...)]`
      z safe-area. Na wysokości 640 px (typowy telefon w trybie
      pionowym z paskiem adresu) całość mieści się BEZ przewijania,
      a przy powiększonej typografii rośnie razem z interfejsem.
    */
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
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
      <header className="px-4 pt-5 text-center sm:pt-10">
        <h1 className="text-[clamp(2rem,9vw,5.5rem)] font-[var(--bengos-weight-semibold)] lowercase leading-none tracking-[0.06em] text-[var(--bengos-accent)] [text-shadow:0_0_38px_var(--bengos-glow)]">
          {modeLabel(mode)}
        </h1>
        <p className="bengos-eyebrow mt-2 text-[var(--bengos-text-muted)] sm:mt-3">{BRAND.tagline}</p>
      </header>

      {mode === "menu" ? (
        <>
          {/*
            ── KOŁO (od `sm`) ────────────────────────────────────────────
            Kwadrat, w którym leży znak, ma `min(46dvh,52vw,240px)` — mniejszy
            niż formularzowy, bo dookoła musi zmieścić się siedem podpisów.
            Promień w `cqw` (container query width) zamiast `%`: przy `%`
            napisy uciekały poza krawędź, gdy kontener rósł z ekranem.
          */}
          <nav
            aria-label="Menu główne"
            className="relative mx-auto my-3 hidden size-[min(72dvh,520px)] sm:block"
          >
            <Hud size="size-[min(38dvh,46vw,220px)]" />
            {MENU_FOLDERS.map((folder, index) => {
              const angle = ((-90 + (360 / MENU_FOLDERS.length) * index) * Math.PI) / 180;
              return (
                <Link
                  key={folder.key}
                  href={"/login?after=" + encodeURIComponent(folder.after) + "#rejestracja"}
                  style={{
                    left: 50 + Math.cos(angle) * 42 + "%",
                    top: 50 + Math.sin(angle) * 42 + "%",
                  }}
                  className={"absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap " + FOLDER_CLASS}
                >
                  {folder.label}
                </Link>
              );
            })}
          </nav>

          {/*
            ── SIATKA (poniżej `sm`) ─────────────────────────────────────
            Te same napisy, ta sama kolejność, prawdziwe odnośniki — tylko
            w dwóch kolumnach zamiast na kole. Powód jest w nagłówku pliku:
            przy 360 px promień koła nie mieści „ustawienia” i „asystent”
            obok siebie. Siatka trzyma 44 px celu i nie nakłada tekstu.
          */}
          <nav aria-label="Menu główne" className="mx-auto w-full max-w-md px-4 py-4 sm:hidden">
            <div className="mb-4 flex justify-center">
              <div className="relative flex size-[min(38dvh,52vw,200px)] items-center justify-center">
                <Hud size="size-[70%]" />
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {MENU_FOLDERS.map((folder) => (
                <li key={folder.key}>
                  <Link
                    href={"/login?after=" + encodeURIComponent(folder.after) + "#rejestracja"}
                    className={"flex w-full " + FOLDER_CLASS}
                  >
                    {folder.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="px-4 pb-2 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Wybierz moduł — otworzy się okno rejestracji. Konta jeszcze nie masz.
          </p>
        </>
      ) : (
        <>
          {/*
            ── ZNAK NAD FORMULARZEM ──────────────────────────────────────
            Średnica liczona od WYSOKOŚCI (`dvh`) i `vw` naraz, z sufitem
            240 px. Dzięki temu przy rejestracji (trzy pola, lista wymagań,
            przycisk) wszystko mieści się nad zgięciem, a na desktopie
            tygrys nie rośnie w nieskończoność. `aria-hidden`: tryb niosą
            napisy, obraz jest czystym znakiem marki.
          */}
          <div className="relative mx-auto mt-3 flex size-[min(34dvh,52vw,220px)] items-center justify-center sm:mt-5" aria-hidden="true">
            <Hud size="size-full" />
          </div>

          <div className="mx-auto w-full max-w-sm px-4 pb-2 sm:max-w-md">
            <LoginForm registerMode={mode === "rejestracja"} />
          </div>
        </>
      )}

      {/*
        ── STOPKA Z ODSTĘPEM NA PASEK GESTÓW ─────────────────────────────
        `pb-[max(1.5rem,env(safe-area-inset-bottom))]` — dolny odstęp to
        większa z dwóch wartości: nasze 24 px albo wcięcie systemowe.
        Bez tego na iPhonie napis „rejestracja” siedzi pod paskiem home,
        a kliknięcie w niego cofa użytkownika do ekranu głównego.

        Przyciski są zauważalnie duże (`text-[size-title]`) i mają
        `py-2`, żeby w nie trafić kciukiem. */}
      <footer className="mt-auto px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {GATE_MODES.filter((word) => word !== mode).map((word) => (
            <Link
              key={word}
              href={"/login?after=" + encodeURIComponent(safeAfter()) + (word === "logowanie" ? "" : "#" + word)}
              onClick={() => setMode(word)}
              className="bengos-touch-target px-3 py-2 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)] lowercase tracking-[0.06em] text-[var(--bengos-accent)] [text-shadow:0_0_22px_var(--bengos-glow)]"
            >
              {modeLabel(word)}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
