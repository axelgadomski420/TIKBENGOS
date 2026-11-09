"use client";

import { MainMenu } from "@/components/home/main-menu";

/**
 * Pulpit — menu jak na grafice: tygrys w okręgu, moduły dookoła.
 */
export function HomeDashboard() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center bg-[#0A0E18] px-4 py-8">
      <MainMenu />
    </div>
  );
}
