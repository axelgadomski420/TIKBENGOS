import Link from "next/link";

import { BRANCHES, type Branch } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

/**
 * Orbita modulow — dziewiec wejsc DOOKOLA tygrysa, jak na grafice marki.
 *
 * ── PIERSCIEN TAM, GDZIE JEST MIEJSCA ─────────────────────────────────
 * Komponent rysuje sie od `lg` wzroz: kontener ma wtedy srednice do
 * 36 rem, a promien orbity 44% boku, czyli srodki sasiednich napisow
 * dzieli ponad 15 rem — cel dotykowy 44 px miesci sie z zapasem.
 * Ponizej `lg` ten komponent sie NIE rysuje: tam rzadzi siatka z
 * module-branches.tsx, bo napisy po malym okregu spadalyby ponizej progu
 * celu i sasiednie odnosniki zlewalyby sie w jeden obszar klikniecia.
 *
 * ── POZYCJE LICZY KOD, NIE KLASY ─────────────────────────────────────
 * Kolejnosc idzie za grafika wlasciciela: „chat” od lewej, dalej
 * zgodnie ze wskazowkami zegara. Kat kazdego modulu liczony jest przy
 * renderze z listy BRANCHES, wiec dziesiaty modul to jeden wpis w
 * module-branches.tsx — bez przepisywania pozycji w stylach.
 *
 * ── KAZDY NAPIS JEST ODNOŚNIKIEM ──────────────────────────────────────
 * Ikona i slowo siedza w jednym `<Link>`: klik, Tab i czytnik ekranu
 * prowadza do tego samego celu. Opis z siatki jedzie w `aria-label` —
 * na orbicie nie ma miejsca na pelne zdanie, ale czytnik niczego nie
 * traci. Plakietka „Etap N” zostaje: orbita nie ma prawa udawac, ze
 * wszystko jest gotowe.
 */

/* Kolejnosc zegarowa z grafiki wlasciciela: „chat” od lewej, dalej
 * zgodnie ze wskazowkami zegara. Siatka w module-branches czyta te sama
 * liste w porzadku czytania (od lewego gornego rogu), wiec orbita
 * permutuje ja lokalnie — jedno miejsce prawdy, dwa porzadki wizualne. */
const ORBIT_ORDER = [
  "chat",
  "ustawienia",
  "studio",
  "bridge",
  "dev",
  "profil",
  "market",
  "wyszukiwarka",
  "bengtok",
  "asystent",
] as const;

/* Kat startowy 180 stopni = zachod (lewa strona ekranu), rosnaco zgodnie
 * ze wskazowkami zegara. Promien 44% boku kontenera. */
const START_DEG = 180;
const RADIUS_PCT = 44;

/** Srodek odnosnika numer `index` na okregu — w procentach boku kontenera. */
function orbitPoint(index: number, count: number): { left: string; top: string } {
  const angle = ((START_DEG + (index * 360) / count) * Math.PI) / 180;
  return {
    left: "calc(50% + " + (Math.cos(angle) * RADIUS_PCT).toFixed(1) + "%)",
    top: "calc(50% + " + (Math.sin(angle) * RADIUS_PCT).toFixed(1) + "%)",
  };
}

export function ModuleOrbit() {
  const orbit = ORBIT_ORDER.map((label) => BRANCHES.find((b) => b.label === label)).filter(
    (b): b is Branch => Boolean(b),
  );

  return (
    <section aria-label="Moduły BENGOS" className="hidden lg:block">
      <h2 className="sr-only">Gdzie chcesz wejść</h2>
      <div className="relative mx-auto aspect-square w-full max-w-xl">
        {/* Pierscien prowadzacy oko — ta sama kreskowana mowa co HUD
            na ekranie logowania, wiec oba ekrany mowia jednym jezykiem. */}
        <div
          aria-hidden="true"
          className="absolute inset-[6%] rounded-full border border-dashed border-[var(--bengos-border-strong)]"
        />
        {/* Tygrys w srodku — większy, bliżej kompozycji ze zdjęcia menu. */}
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[42%] -translate-x-1/2 -translate-y-1/2">
          <div className="bengos-hud flex size-full items-center justify-center">
            <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
            <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3" />
            <span className="bengos-hud__ring bengos-hud__ring--arc -inset-5" />
            <span className="flex h-[82%] w-[82%] items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_140px_-24px_var(--bengos-glow)]">
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

        {/* Dziewiec odnosnikow — po jednym na kazdym kierunku okregu. */}
        <ul className="absolute inset-0">
          {orbit.map((branch, index) => (
            <li
              key={branch.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={orbitPoint(index, orbit.length)}
            >
              <Link
                href={branch.href}
                aria-label={branch.label + " — " + branch.description}
                className="group flex min-h-[var(--bengos-touch-target-min)] min-w-[var(--bengos-touch-target-min)] flex-col items-center gap-1 rounded-[var(--bengos-radius-card)] px-2 py-1.5 text-center transition-all duration-[var(--bengos-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)]"
              >
                <span className="relative flex size-10 items-center justify-center rounded-full border border-[var(--bengos-border)]/50 bg-[var(--bengos-surface-raised)]/60 text-[var(--bengos-accent)] transition-colors duration-[var(--bengos-motion-fast)] group-hover:border-[var(--bengos-accent)] group-hover:bg-[var(--bengos-surface-raised)]">
                  <branch.Icon className="size-5" />
                  {branch.stage ? (
                    <span className="absolute -right-1 -top-1 rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface)] px-1 text-[0.55rem] leading-3 text-[var(--bengos-text-muted)]">
                      {branch.stage}
                    </span>
                  ) : null}
                </span>
                <span className="text-lg font-[var(--bengos-weight-semibold)] lowercase tracking-[0.1em] text-[var(--bengos-accent)] drop-shadow-[0_0_12px_var(--bengos-glow)] group-hover:drop-shadow-[0_0_20px_var(--bengos-glow)]">
                  {branch.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}