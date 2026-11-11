"use client";

import Image from "next/image";
import Link from "next/link";

import { BRANCHES } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

/**
 * Ekran startowy: czyste logo w środku, odnośniki wychodzą z kuli.
 * Napisy są tekstem, nie fragmentem grafiki.
 */
const PLACES = [
  { label: "chat", angle: 188 },
  { label: "ustawienia", angle: 228 },
  { label: "studio", angle: 262 },
  { label: "bridge", angle: 298 },
  { label: "dev", angle: 334 },
  { label: "profil", angle: 10 },
  { label: "wyszukiwarka", angle: 52 },
  { label: "bengtok", angle: 92 },
  { label: "asystent", angle: 142 },
] as const;

function point(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: 50 + Math.cos(rad) * radius,
    y: 50 + Math.sin(rad) * radius,
  };
}

export function MainMenu() {
  const nodes = PLACES.flatMap((place) => {
    const branch = BRANCHES.find((item) => item.label === place.label);
    if (!branch) return [];
    return [{ ...place, href: branch.href, description: branch.description }];
  });

  return (
    <nav aria-label="Wejścia BENGOS" className="bengos-orbit relative aspect-square w-full max-w-[min(100%,44rem)]">
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(126,246,255,0.22)" strokeWidth="0.15" />
        {nodes.map((node) => {
          const from = point(node.angle, 31.2);
          const to = point(node.angle, 41);
          return (
            <line
              key={node.label}
              className={"spoke spoke-" + node.label}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(126,246,255,0.38)"
              strokeWidth="0.22"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[64%] -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -inset-[6%] rounded-full border border-[#7ef6ff]/25 motion-safe:animate-[spin_64s_linear_infinite]" />
        <Image
          src={BRAND.logo}
          alt="BENGOS"
          width={1024}
          height={1024}
          priority
          unoptimized
          className="relative size-full object-contain drop-shadow-[0_0_48px_rgba(0,200,220,0.28)]"
        />
      </div>

      {nodes.map((node) => {
        const spot = point(node.angle, 46);
        const long = node.label.length > 10;
        return (
          <Link
            key={node.label}
            href={node.href}
            data-spoke={node.label}
            aria-label={node.label + ". " + node.description}
            className={
              "absolute z-10 flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center whitespace-nowrap px-1 font-medium lowercase text-[#d8fbff] transition-colors hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7ef6ff] " +
              (long
                ? "text-[clamp(0.68rem,2vw,0.95rem)] tracking-[0.04em]"
                : "text-[clamp(0.78rem,2.3vw,1.05rem)] tracking-[0.16em]")
            }
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            {node.label}
          </Link>
        );
      })}

      <style>{`
        .bengos-orbit a {
          text-shadow: 0 0 14px rgba(0, 210, 230, 0.45);
        }
        ${nodes
          .map(
            (node) =>
              `.bengos-orbit:has(a[data-spoke="${node.label}"]:hover) .spoke-${node.label},
               .bengos-orbit:has(a[data-spoke="${node.label}"]:focus-visible) .spoke-${node.label} {
                 stroke: #7ef6ff;
                 stroke-width: 0.45;
               }`,
          )
          .join("\n")}
      `}</style>
    </nav>
  );
}
