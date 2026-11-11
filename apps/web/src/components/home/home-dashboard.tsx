"use client";

import Link from "next/link";
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
    <div className="absolute left-1/2 top-3 z-20 w-[min(100%,24rem)] -translate-x-1/2 px-3">
      <WelcomeBanner />
    </div>
  );
}

/** Ekran startowy. Logo jest znakiem, odnośniki wychodzą z kuli. */
export function HomeDashboard() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-black px-2">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,170,190,0.16),transparent_58%)]"
      />
      <FreshHello />
      <Link
        href="/login"
        className="absolute right-4 top-4 z-20 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-[#9eefff]/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7ef6ff]"
      >
        Konto
      </Link>
      <MainMenu />
    </div>
  );
}
