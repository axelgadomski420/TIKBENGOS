"use client";

import { BRANCHES } from "@/components/home/module-branches";
import { BRAND } from "@/lib/brand";

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

export function MainMenu() {
  const nodes = PLACES.flatMap((place) => {
    const branch = BRANCHES.find((item) => item.label === place.label);
    if (!branch) return [];
    return [{ ...place, href: branch.href, description: branch.description }];
  });

  return (
    <nav className="orbit" aria-label="Wejścia BENGOS">
      {nodes.map((node) => (
        <span key={node.label} className="orbit-spoke" style={{ ["--a" as string]: `${node.angle}deg` }} />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND.logo} alt="BENGOS" width={1024} height={1024} className="orbit-mark" />
      {nodes.map((node) => (
        <a
          key={node.label}
          href={node.href}
          className={node.label.length > 10 ? "orbit-arm orbit-arm--long" : "orbit-arm"}
          style={{ ["--a" as string]: `${node.angle}deg` }}
          aria-label={node.label + ". " + node.description}
        >
          {node.label}
        </a>
      ))}
    </nav>
  );
}
