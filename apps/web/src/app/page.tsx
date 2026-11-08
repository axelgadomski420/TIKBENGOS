import type { Metadata } from "next";

import { UniversalSearch } from "@/components/home/universal-search";
import { IdentityBar } from "@/components/home/identity-bar";
import { ModuleBranches } from "@/components/home/module-branches";

/**
 * BENGOS Home — pulpit sterowania.
 *
 * ── MENU JEST PIERWSZE, NIE OSTATNIE ────────────────────────────────────
 * Poprzednia wersja stawiała na górze grafikę menu jako zwykły obraz,
 * a dziewięć kafli wypychała na sam dół — czyli menu, po które użytkownik
 * przyszedł, było ostatnie, a jego obrazek pierwszy. To było odwrócenie
 * znaczenia: ozdoba przed rzeczą.
 *
 * Teraz kolejność idzie od intencji do wejścia:
 *   1. grafika menu jako TŁO nagłówka (nastrój, nie plik do przewijania),
 *   2. wyszukiwarka — jedno pole na pytanie, tworzenie, szukanie i kod,
 *   3. pasek tożsamości — kim jesteś,
 *   4. DZIEWIĘĆ WEJŚĆ — dokąd możesz iść.
 *
 * ── GRAFIKA JEST TŁEM, NIE OBRAZEM W TREŚCI ─────────────────────────────
 * Jako element w treści zajmowała kwadrat 1024×1024 i na telefonie zjadała
 * cały pierwszy ekran. Jako tło nagłówka daje nastrój i nie zabiera miejsca
 * temu, co ma działać.
 *
 * ── KARTY PULPITU ZOSTAJĄ WYCOFANE, NIE USUNIĘTE ────────────────────────
 * „Stwórz teraz”, „Kontynuuj”, „Dla Ciebie” i „Dostępność” stoją teraz
 * bezpośrednio w menu — bo każde z nich JEST jednym z dziewięciu wejść.
 * Trzymanie ich osobno i obok nich siatki tych samych celów dawałoby dwa
 * menu na jednym ekranie, czyli bałagan. Komponenty zostają w repo i wracają,
 * gdy będą miały własną treść do pokazania.
 *
 * ── RYTM WEJŚCIA ───────────────────────────────────────────────────────
 * Trzy elementy, nie siedem. Krótsza kolejność czyta się jako kompozycja;
 * dłuższa zaczyna być zwłoką.
 */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="bengos-visually-hidden">BENGOS — pulpit</h1>

      {/*
        Nagłówek z grafiką menu w tle. Obraz jest rozmyty i przygaszony,
        a na nim gradient, po którym czytają się napisy — dlatego treść
        poniżej nie konkuruje z obrazem o uwagę.

        `alt=""` jest poprawne: nazwy modułów są wypalone w obrazie, ale
        prawdziwe, klikalne wejścia stoją niżej jako siatka. Opis obrazka
        kazałby czytnikowi odczytać te same słowa dwa razy.
      */}
      <section className="bengos-rise bengos-rise-1 relative isolate overflow-hidden rounded-[var(--bengos-radius-card)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_HOME} alt="" className="size-full object-cover object-center opacity-40 blur-[1px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--bengos-surface-raised)_72%,var(--bengos-surface-raised)_100%)]" />
        </div>

        <div className="flex min-h-[13rem] flex-col justify-end px-5 pb-5 pt-24">
          <p className="text-[var(--bengos-size-caption)] uppercase tracking-[0.3em] text-[var(--bengos-text-muted)]">
            BENGOS
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

/**
 * Adres grafiki menu — przepisany z `@/lib/brand`, ale wciągnięty tu
 * bezpośrednio, bo `home` i `login` mają różne zadania i nie chcą być
 * mylone: `BRAND.home` to spis modułów (tło nagłówka), a `BRAND.login`
 * to kompozycja logowania (tło ekranu startowego).
 */
const BRAND_HOME = "https://i.ibb.co/TxDg2pFH/44747202-085-E-42B8-BE50-EF91CAF448-F1.jpg";
