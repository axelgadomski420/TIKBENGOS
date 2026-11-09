"use client";

import { MainMenu } from "@/components/home/main-menu";
import { BRAND } from "@/lib/brand";

/**
 * Pulpit — logo + siatka modułów. Bez wyszukiwarki na górze,
 * żeby nie rozjeżdżała układu na telefonie.
 */
export function HomeDashboard() {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#0A0E18] px-4 py-6">
      <h1 className="mb-1 text-center text-2xl font-semibold text-[#00F7FF]">
        BENGOS
      </h1>
      <p className="mb-4 text-center text-sm text-[#9FB4D6]">
        {BRAND.tagline}
      </p>
      <MainMenu />
    </div>
  );
}
