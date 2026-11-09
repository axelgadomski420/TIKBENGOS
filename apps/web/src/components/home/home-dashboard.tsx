"use client";

import { useEffect, useState } from "react";

import { MainMenu } from "@/components/home/main-menu";
import { WelcomeBanner } from "@/components/home/welcome-banner";

function FreshHello() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get("welcome") === "1");
  }, []);
  if (!show) return null;
  return (
    <div className="mb-4 w-full max-w-lg">
      <WelcomeBanner />
    </div>
  );
}

/**
 * Pulpit — menu jak na grafice: tygrys w okręgu, moduły dookoła.
 */
export function HomeDashboard() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#05070d] px-3 py-6">
      <FreshHello />
      <MainMenu />
    </div>
  );
}
