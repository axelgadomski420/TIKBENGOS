"use client";

import Link from "next/link";

/**
 * Czyste menu główne BENGOS.
 *
 * Tygrys w centrum, moduły po okręgu — jak na grafice.
 * Pozycje liczone od środka kwadratowego kontenera.
 * Na telefonie kontener ma max-width i nie wychodzi poza ekran.
 */

const MODULES = [
  { label: "chat", href: "/chat" },
  { label: "ustawienia", href: "/settings" },
  { label: "studio", href: "/studio" },
  { label: "bridge", href: "/access" },
  { label: "dev", href: "/dev" },
  { label: "profil", href: "/profile" },
  { label: "wyszukiwarka", href: "/#search" },
  { label: "bengtok", href: "/feed" },
  { label: "asystent", href: "/create" },
];

export function CleanMenu() {
  const count = MODULES.length;
  const radius = 38;

  return (
    <div className="relative mx-auto aspect-square w-[min(92vw,420px)]">
      {/* Poświata */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 opacity-10 blur-3xl"
      />

      {/* Pierścień */}
      <div
        aria-hidden
        className="absolute inset-[6%] rounded-full border border-dashed border-cyan-700/60"
      />

      {/* Tygrys */}
      <div className="absolute left-1/2 top-1/2 size-[48%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex size-full items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-cyan-600/40" />
          <span className="absolute -inset-3 rounded-full border border-dashed border-cyan-400/50" />
          <span className="absolute -inset-5 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400" />
          <span className="flex size-[78%] items-center justify-center overflow-hidden rounded-full border border-cyan-800 bg-black shadow-[0_0_80px_-12px_#22d3ee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.jpg"
              alt="BENGOS"
              width={1024}
              height={1024}
              className="size-full object-cover"
            />
          </span>
        </div>
      </div>

      {/* Moduły */}
      {MODULES.map((mod, i) => {
        const angle = ((180 + (i * 360) / count) * Math.PI) / 180;
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;
        return (
          <Link
            key={mod.label}
            href={mod.href}
            className="absolute flex min-h-[40px] min-w-[40px] items-center justify-center text-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="text-[11px] font-semibold lowercase tracking-wider text-cyan-300 drop-shadow-[0_0_8px_#0891b2] sm:text-sm">
              {mod.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
