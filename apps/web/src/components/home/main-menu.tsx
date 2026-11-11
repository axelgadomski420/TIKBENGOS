"use client";

import Link from "next/link";

import { BRANCHES } from "@/components/home/module-branches";

/**
 * Menu jak na grafice: kula z tygrysem i napisy dookoła.
 * Obraz jest tłem. Napisy są prawdziwymi odnośnikami w tych samych miejscach.
 */
const SPOTS: Record<string, { x: number; y: number }> = {
  ustawienia: { x: 18, y: 27 },
  studio: { x: 32, y: 14 },
  bridge: { x: 70, y: 13 },
  dev: { x: 90, y: 33 },
  profil: { x: 88, y: 57 },
  wyszukiwarka: { x: 72, y: 84 },
  bengtok: { x: 42, y: 91 },
  asystent: { x: 20, y: 80 },
  chat: { x: 10, y: 55 },
};

export function MainMenu() {
  const items = Object.keys(SPOTS)
    .map((label) => BRANCHES.find((branch) => branch.label === label))
    .filter((branch) => branch !== undefined);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(100%,46rem)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/orbit.jpg"
        alt=""
        width={1024}
        height={1024}
        className="size-full select-none object-contain"
      />
      {items.map((branch) => {
        const spot = SPOTS[branch.label];
        if (!spot) return null;
        return (
          <Link
            key={branch.label}
            href={branch.href}
            aria-label={branch.label + " — " + branch.description}
            className="absolute flex min-h-12 min-w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-3 text-center text-sm font-semibold lowercase tracking-[0.12em] text-transparent hover:text-[#7ef6ff] focus-visible:text-[#7ef6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7ef6ff] sm:text-base"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            {branch.label}
          </Link>
        );
      })}
    </div>
  );
}
