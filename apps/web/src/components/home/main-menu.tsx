"use client";

import Link from "next/link";

import { BRANCHES } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

/**
 * Menu główne — dokładnie jak na grafice właściciela.
 *
 * Duży tygrys w świecącym okręgu, moduły dookoła po okręgu.
 * Pozycje liczone procentowo od środka kontenera o stałym aspect-ratio,
 * więc nie rozjeżdżają się w pionową kolumnę.
 */
const ORDER = [
  "chat",
  "ustawienia",
  "studio",
  "bridge",
  "dev",
  "profil",
  "wyszukiwarka",
  "bengtok",
  "asystent",
];

export function MainMenu() {
  const items = ORDER.map((label) => BRANCHES.find((b) => b.label === label)).filter(Boolean) as typeof BRANCHES;
  const count = items.length;
  const radius = 42;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {/* Poświata */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F7FF] opacity-[0.08] blur-3xl"
      />

      {/* Pierścień zewnętrzny */}
      <div
        aria-hidden="true"
        className="absolute inset-[4%] rounded-full border border-dashed border-[#51689B]"
      />

      {/* Tygrys w centrum */}
      <div className="absolute left-1/2 top-1/2 size-[52%] -translate-x-1/2 -translate-y-1/2">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-5" />
          <span className="flex h-[78%] w-[78%] items-center justify-center overflow-hidden rounded-full border border-[#51689B] bg-[#060A12] shadow-[0_0_120px_-16px_#14809F]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo}
              alt="BENGOS"
              width={1024}
              height={1024}
              className="size-full object-cover object-center"
            />
          </span>
        </div>
      </div>

      {/* Moduły po okręgu */}
      {items.map((branch, i) => {
        const angle = ((180 + (i * 360) / count) * Math.PI) / 180;
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;
        return (
          <Link
            key={branch.label}
            href={branch.href}
            aria-label={branch.label + " — " + branch.description}
            className="absolute flex min-h-[44px] min-w-[44px] flex-col items-center justify-center text-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="text-xs font-semibold lowercase tracking-[0.1em] text-[#00F7FF] drop-shadow-[0_0_10px_#14809F] sm:text-sm">
              {branch.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
