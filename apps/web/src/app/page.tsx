import type { Metadata } from "next";

import { UniversalSearch } from "@/components/home/universal-search";
import { IdentityBar } from "@/components/home/identity-bar";
import { CreateNowCard } from "@/components/home/create-now-card";
import { ContinueCard } from "@/components/home/continue-card";
import { ForYouCard } from "@/components/home/for-you-card";
import { AccessibilityCard } from "@/components/home/accessibility-card";
import { ModuleBranches } from "@/components/home/module-branches";

export const metadata: Metadata = { title: "BENGOS Home" };

/**
 * BENGOS Home — pulpit sterowania, nie feed.
 *
 * Różnica jest zasadnicza i wynika wprost z briefu: feed pokazuje treść,
 * pulpit pokazuje intencję. Użytkownik nie przewija tu w poszukiwaniu czegoś
 * do obejrzenia — przychodzi z pomysłem i ma zobaczyć, którą drogą go
 * zrealizować. Dlatego wyszukiwarka jest na samej górze, wejścia do tworzenia
 * są widoczne bez przewijania, a feed jest jedną kartą wśród pięciu.
 *
 * ── RYTM WEJŚCIA ───────────────────────────────────────────────────────
 * Elementy wchodzą jeden po drugim, w kolejności czytania. Kolejność jest
 * tu nośnikiem informacji, nie ozdobą: najpierw pytanie („co chcesz
 * zrobić?”), potem kim jesteś, potem co możesz zrobić, i dopiero na końcu
 * gdzie wejść. Opóźnienia są krótkie i kończą się na piątej pozycji — dalej
 * przestałyby być rytmem, a zaczęłyby być zwłoką.
 *
 * Przy `prefers-reduced-motion` token czasu schodzi do 1 ms, więc rytm
 * zostaje zachowany jako funkcja i przestaje być widoczny dla oka.
 */
export default function HomePage() {
  return (
    <div className="space-y-6">
      {/*
        Tytuł jest dla czytnika ekranu, nie dla oka — znak i nazwa stoją
        już w pasku u góry, a powtórzenie ich tutaj byłoby szumem. Klasa
        `bengos-visually-hidden` zostawia treść w drzewie dostępności:
        `display: none` usunęłoby ją razem z informacją o strukturze.
      */}
      <h1 className="bengos-visually-hidden">BENGOS Home — pulpit</h1>

      <div className="bengos-rise bengos-rise-1">
        <UniversalSearch />
      </div>

      <div className="bengos-rise bengos-rise-2">
        <IdentityBar />
      </div>

      <div className="bengos-rise bengos-rise-3 grid gap-4 md:grid-cols-2">
        <CreateNowCard />
        <ContinueCard />
      </div>

      <div className="bengos-rise bengos-rise-4 space-y-6">
        <ForYouCard />
        <AccessibilityCard />
      </div>

      <div className="bengos-rise bengos-rise-5">
        <ModuleBranches />
      </div>
    </div>
  );
}
