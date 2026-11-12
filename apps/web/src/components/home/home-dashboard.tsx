"use client";

import Link from "next/link";

import { MainMenu } from "@/components/home/main-menu";

/** Jedyny ekran startowy: logo i odnośniki, które z niego wychodzą. */
export function HomeDashboard() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-black">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,170,190,0.18),transparent_58%)]"
      />
      <Link
        href="/login"
        className="absolute right-4 top-4 z-20 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-[#9eefff]/80 hover:text-white"
      >
        Konto
      </Link>
      <MainMenu />
    </div>
  );
}
