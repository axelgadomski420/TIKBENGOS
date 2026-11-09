"use client";

import { MainMenu } from "@/components/home/main-menu";
import { UniversalSearch } from "@/components/home/universal-search";
import { BRAND } from "@/lib/brand";

/**
 * Pulpit — tylko menu główne. Bez bramy. Bez logowania.
 * Każdy może klikać moduły i testować.
 */
export function HomeDashboard() {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#0A0E18] px-4 py-6">
      <h1 className="mb-2 text-center text-2xl font-semibold text-[#00F7FF]">
        BENGOS
      </h1>
      <p className="mb-6 text-center text-sm text-[#9FB4D6]">
        {BRAND.tagline}
      </p>

      <UniversalSearch />

      <MainMenu />
    </div>
  );
}
