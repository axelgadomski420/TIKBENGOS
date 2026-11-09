"use client";

import Link from "next/link";

import { BRANCHES } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

/**
 * Menu główne — logo w centrum, moduły w siatce pod spodem.
 *
 * Orbita na telefonie rozjeżdżała ikony w pionową kolumnę.
 * Siatka jest stabilna na każdym ekranie i zachowuje 44 px cele.
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

  return (
    <div className="flex w-full flex-col items-center gap-8 px-4 py-6">
      {/* Logo */}
      <div className="relative size-48 shrink-0 sm:size-64">
        <div className="bengos-hud flex size-full items-center justify-center">
          <span className="bengos-hud__ring bengos-hud__ring--static inset-0" />
          <span className="bengos-hud__ring bengos-hud__ring--ticks -inset-3" />
          <span className="bengos-hud__ring bengos-hud__ring--arc -inset-5" />
          <span className="flex h-[76%] w-[76%] items-center justify-center overflow-hidden rounded-full border border-[#51689B] bg-[#060A12] shadow-[0_0_100px_-16px_#14809F]">
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

      {/* Moduły — siatka 2 kolumny na telefonie, 5 na większym */}
      <ul className="grid w-full max-w-md grid-cols-2 gap-4 sm:max-w-2xl sm:grid-cols-3 lg:grid-cols-5">
        {items.map((branch) => (
          <li key={branch.label}>
            <Link
              href={branch.href}
              aria-label={branch.label + " — " + branch.description}
              className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[var(--bengos-radius-card)] border border-[#51689B] bg-[#0F1624] p-3 text-center transition-colors hover:border-[#00F7FF] hover:bg-[#152033]"
            >
              <span className="flex size-8 items-center justify-center text-[#00F7FF]">
                <branch.Icon className="size-5" />
              </span>
              <span className="text-xs font-semibold lowercase tracking-[0.06em] text-[#00F7FF]">
                {branch.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
