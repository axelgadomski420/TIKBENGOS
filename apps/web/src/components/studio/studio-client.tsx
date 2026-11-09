"use client";

import { useState } from "react";

import { BRAND } from "@/lib/brand";

/**
 * Studio — centrum twórczości.
 * Wideo, muzyka, posty, projekty kodu.
 * Premium shell gotowy na podłączenie workerów.
 */
const TOOLS = [
  { id: "video", label: "Wideo", desc: "Nagranie, montaż, napisy, publikacja do bengtok." },
  { id: "music", label: "Muzyka", desc: "Generowanie, stemmy, mix, publikacja." },
  { id: "post", label: "Post", desc: "Tekst, obraz, dźwięk — jeden edytor." },
  { id: "code", label: "Kod", desc: "Projekty, agent, pull requesty." },
];

export function StudioClient() {
  const [active, setActive] = useState("video");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--bengos-accent)]">Studio</h1>
        <p className="mt-1 text-[var(--bengos-text-muted)]">
          Twórz wideo, muzykę, posty i kod. Wszystko w jednym miejscu.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActive(tool.id)}
            className={
              "rounded-[var(--bengos-radius-card)] border p-4 text-left transition-colors " +
              (active === tool.id
                ? "border-[var(--bengos-accent)] bg-[var(--bengos-surface-raised)]"
                : "border-[var(--bengos-border)] bg-[var(--bengos-surface)]")
            }
          >
            <span className="block font-semibold text-[var(--bengos-accent)]">{tool.label}</span>
            <span className="mt-1 block text-sm text-[var(--bengos-text-muted)]">{tool.desc}</span>
          </button>
        ))}
      </div>

      <div className="bengos-surface-card min-h-[16rem] p-6">
        <h2 className="text-xl font-medium">{TOOLS.find((t) => t.id === active)?.label}</h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Panel {active} jest gotowy na podłączenie workera. Upload, generowanie i publikacja
          pojawią się tutaj, gdy magazyn i kolejki będą aktywne.
        </p>
        <button
          type="button"
          className="mt-4 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 py-2 font-medium text-[var(--bengos-text-on-accent)]"
        >
          Nowy projekt {TOOLS.find((t) => t.id === active)?.label.toLowerCase()}
        </button>
      </div>

      <p className="text-center text-xs text-[var(--bengos-text-muted)]">{BRAND.tagline}</p>
    </div>
  );
}
