import type { Metadata } from "next";

import { ModuleBranches } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS" };

/**
 * Ekran po zalogowaniu: hologram z odgałęzieniami.
 *
 * ── CO TU JEST I NIC WIĘCEJ ─────────────────────────────────────────────
 * Wielka grafika hologramu (tygrys w kuli z podpisami modułów) jako tło
 * całego ekranu, a pod nią siatka odgałęzień — każdy podpis klikalny,
 * z trasą. Żadnej wyszukiwarki, żadnego paska tożsamości, żadnych kart
 * „Kontynuuj” i „Dla Ciebie” nad siatką. Te rzeczy przeszkadzały w tym,
 * co ten ekran ma robić: pokazać dziewięć drzwi i pozwolić wejść.
 *
 * ── PODPISY SĄ TEKSTEM, NIE OBRAZEM ─────────────────────────────────────
 * Napisy na grafice są wypalonymi pikselami — przeglądarka widzi jeden
 * prostokąt, nie dziewięć słów. Nie da się ich kliknąć, nie da się ich
 * odczytać czytnikiem ekranu. Wersja „obszary klikalne nałożone na obraz”
 * wyglądałaby tak samo i była nieużywalna dla klawiatury, więc nie weszła.
 * Grafika daje hologram, a odgałęzienia są prawdziwym tekstem pod nią:
 * klikalnym, czytanym, dostępnym z `Tab`.
 *
 * ── WYSOKOŚĆ TŁA USTALONA, NIE LOSOWA ───────────────────────────────────
 * Hologram zajmuje górne 46% ekranu i ma własne `min-h`, więc na telefonie
 * nie zjada całego widoku, a na dużym ekranie nie rozciąga się na pół strony.
 */
export default function HomePage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/*
        Tło: hologram na CAŁYM ekranie, pod nim tło motywu, na wierzchu
        gradient schodzący w kolor tła — po nim czyta się siatka.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--bengos-surface)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.menu}
          alt=""
          width={1024}
          height={1024}
          fetchPriority="high"
          className="absolute inset-x-0 top-0 h-[62%] w-full object-cover object-center opacity-55 blur-[1px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--bengos-surface)_0%,transparent_12%,transparent_38%,var(--bengos-surface)_58%,var(--bengos-surface)_100%)]" />
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-[var(--bengos-accent)] opacity-[0.10] blur-3xl" />
        <div className="absolute -right-20 bottom-8 size-80 rounded-full bg-[var(--bengos-warning)] opacity-[0.08] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pb-28 pt-10 md:pb-12">
        <header className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)] shadow-[0_0_56px_-10px_var(--bengos-glow)] sm:size-20">
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
          <p className="mt-4 text-[var(--bengos-size-caption)] uppercase tracking-[0.34em] text-[var(--bengos-text-muted)]">
            {BRAND.name}
          </p>
        </header>

        <div className="mt-10">
          <ModuleBranches />
        </div>
      </div>
    </div>
  );
}
