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
        {/* Tygrys w srodku — ten sam okrag HUD co na ekranie logowania. */}
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[30%] -translate-x-1/2 -translate-y-1/2">
          <div className="bengos-hud flex size-full items-center justify-center">
            <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
            <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-2" />
            <span className="bengos-hud__ring bengos-hud__ring--arc -inset-4" />
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
                className="group flex min-h-[var(--bengos-touch-target-min)] min-w-[var(--bengos-touch-target-min)] flex-col items-center gap-1.5 rounded-[var(--bengos-radius-card)] px-2 py-2 text-center transition-colors duration-[var(--bengos-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)]"
              >
                <span className="relative flex size-12 items-center justify-center rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)] text-[var(--bengos-accent)] transition-colors duration-[var(--bengos-motion-fast)] group-hover:border-[var(--bengos-accent)]">
                  <branch.Icon className="size-6" />
                  {branch.stage ? (
                    <span className="absolute -right-1 -top-1 rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface)] px-1 text-[0.625rem] leading-4 text-[var(--bengos-text-muted)]">
                      {branch.stage}
                    </span>
                  ) : null}
                </span>
                <span className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)] lowercase tracking-[0.06em] text-[var(--bengos-accent)]">
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