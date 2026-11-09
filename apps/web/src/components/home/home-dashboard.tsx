"use client";

import { MainMenu } from "@/components/home/main-menu";

/**
 * Pulpit — menu jak na grafice: tygrys w okręgu, moduły dookoła.
 */
export function HomeDashboard() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#05070d] px-3 py-6">
      <MainMenu />
    </div>
  );
}
