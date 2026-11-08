import type { Metadata } from "next";

import { UniversalSearch } from "@/components/home/universal-search";
import { IdentityBar } from "@/components/home/identity-bar";
import { ModuleBranches } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS — pulpit" };

/**
 * BENGOS Home — pulpit sterowania.
 *
 * ── MENU JEST PIERWSZE, NIE OSTATNIE ────────────────────────────────────
 * Kolejność idzie od intencji do wejścia:
 *   1. nagłówek z grafiką menu jako tłem — nastrój, nie plik do przewijania,
 *   2. wyszukiwarka uniwersalna — jedno pole na wszystko,
 *   3. pasek tożsamości — kim jesteś,
 *   4. DZIEWIĘĆ WEJŚĆ — napisy jako prawdziwy tekst, każdy klikalny.
 *
 * ── NAPISY SĄ W KODZIE, NIE W GRAFICE ───────────────────────────────────
 * Grafika menu ma podpisy wypalone w pliku, więc dla przeglądarki jest
 * jednym prostokątem — nie da się z nich zrobić odnośników ani odczytać
 * ich czytnikiem ekranu. Dlatego grafika jest TŁEM (nastrój), a dziewięć
 * napisów stoi pod nią jako prawdziwy tekst w siatce `ModuleBranches`:
 * klikalny, dostępny z klawiatury i czytany przez czytnik.
 *
 * ── GRAFIKA JEST TŁEM, NIE OBRAZEM W TREŚCI ─────────────────────────────
 * Jako element w treści zajmowała kwadrat 1024×1024 i na telefonie zjadała
 * cały pierwszy ekran. Jako tło nagłówka daje nastrój i nie zabiera miejsca
 * temu, co ma działać.
 */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="bengos-visually-hidden">BENGOS — pulpit</h1>

      <section className="bengos-rise bengos-rise-1 relative isolate overflow-hidden rounded-[var(--bengos-radius-card)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.menu}
            alt=""
            width={1024}
            height={1024}
            fetchPriority="high"
            className="size-full object-cover object-center opacity-40 blur-[1px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--bengos-surface-raised)_72%,var(--bengos-surface-raised)_100%)]" />
        </div>

        <div className="flex min-h-[13rem] flex-col justify-end px-5 pb-5 pt-24">
          <p className="text-[var(--bengos-size-caption)] uppercase tracking-[0.3em] text-[var(--bengos-text-muted)]">
            {BRAND.name}
          </p>
          <p className="mt-1 text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]">
            Osiem modułów, jedno konto
          </p>
          <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Wybierz, gdzie wchodzisz — albo zapytaj w polu poniżej.
          </p>
        </div>
      </section>

      <div className="bengos-rise bengos-rise-2">
        <UniversalSearch />
      </div>

      <div className="bengos-rise bengos-rise-3">
        <IdentityBar />
      </div>

      <div className="bengos-rise bengos-rise-4">
        <ModuleBranches />
      </div>
    </div>
  );
}
