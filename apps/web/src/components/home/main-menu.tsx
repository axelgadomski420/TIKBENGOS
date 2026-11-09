"use client";

import Link from "next/link";

import { BRANCHES } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

/**
 * Menu główne BENGOS — przepisane od zera.
 *
 * Duży tygrys w centrum, moduły dookoła w równym kole.
 * Działa bez logowania. Zero bramy. Zero wycieków.
 * Na telefonie i desktopie ten sam układ.
 */
const ORDER = [
  "chat",
  "ustawienia",
  "studio",
  "bridge",
  "dev",
  "profil",
  "market",
  "wyszukiwarka",
  "bengtok",
  "asystent",
];

export function MainMenu() {
  const items = ORDER.map((label) => BRANCHES.find((b) => b.label === label)).filter(Boolean) as typeof BRANCHES;

  const count = items.length;
  const radius = 38;

  return (
    <div className="relative flex min-h-[80vh] w-full items-center justify-center px-4 py-8">
      {/* Poświata */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F7FF] opacity-[0.06] blur-3xl"
      />

      {/* Kontener orbity */}
      <div className="relative aspect-square w-full max-w-lg">
        {/* Pierścień */}
        <div
          aria-hidden="true"
          className="absolute inset-[8%] rounded-full border border-dashed border-[#51689B]"
        />

        {/* Logo w centrum */}
        <div className="absolute left-1/2 top-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2">
          <div className="bengos-hud flex size-full items-center justify-center">
            <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
            <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3" />
            <span className="bengos-hud__ring bengos-hud__ring--arc -inset-5" />
            <span className="flex h-[78%] w-[78%] items-center justify-center overflow-hidden rounded-full border border-[#51689B] bg-[#060A12] shadow-[0_0_120px_-20px_#14809F]">
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

        {/* Moduły dookoła */}
        {items.map((branch, i) => {
          const angle = ((180 + (i * 360) / count) * Math.PI) / 180;
          const left = 50 + Math.cos(angle) * radius;
          const top = 50 + Math.sin(angle) * radius;
          return (
            <Link
              key={branch.label}
              href={branch.href}
              aria-label={branch.label + " — " + branch.description}
              className="absolute flex min-h-[44px] min-w-[44px] flex-col items-center gap-1 text-center -translate-x-1/2 -translate-y-1/2"
              style={{ left: left + "%", top: top + "%" }}
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-[#51689B] bg-[#0F1624] text-[#00F7FF]">
                <branch.Icon className="size-4" />
              </span>
              <span className="text-sm font-semibold lowercase tracking-[0.08em] text-[#00F7FF] drop-shadow-[0_0_8px_#14809F]">
                {branch.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
