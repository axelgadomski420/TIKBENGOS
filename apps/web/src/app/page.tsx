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
 * ── NAGŁÓWEK EKRANU ────────────────────────────────────────────────────
 * Ekran miał wcześniej samą wyszukiwarkę, bez tytułu widocznego dla oka.
 * Powłoka pokazuje znak w pasku u góry, ale nagłówek pierwszego stopnia
 * należy do TREŚCI, nie do powłoki — a bez niego czytnik ekranu wchodzi
 * w pulpit bez informacji, gdzie jest, i nie da się po nim skakać klawiszem
 * `h`. Dodajemy więc `h1`, wizualnie dyskretny, ale prawdziwy.
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

      <UniversalSearch />
      <IdentityBar />

      <div className="grid gap-4 md:grid-cols-2">
        <CreateNowCard />
        <ContinueCard />
      </div>

      <ForYouCard />
      <AccessibilityCard />
      <ModuleBranches />
    </div>
  );
}
