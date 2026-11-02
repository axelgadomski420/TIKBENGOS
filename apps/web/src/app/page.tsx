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
 */
export default function HomePage() {
  return (
    <div className="space-y-6">
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
