"use client";

import { useState } from "react";

import Link from "next/link";

/**
 * Marketplace — katalog premium.
 * Presety, dźwięki, szablony, modele, projekty kodu.
 * Filtry + siatka gotowa na dane z API.
 */
const KINDS = [
  { id: "", label: "Wszystko" },
  { id: "preset", label: "Presety" },
  { id: "sound", label: "Dźwięki" },
  { id: "music", label: "Muzyka" },
  { id: "video-template", label: "Szablony wideo" },
  { id: "code-project", label: "Projekty kodu" },
];

export function MarketClient() {
  const [kind, setKind] = useState("");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-[var(--bengos-accent)]">Marketplace</h1>
        <p className="mt-1 max-w-2xl text-[var(--bengos-text-muted)]">
          Presety, dźwięki, szablony wideo, modele i projekty kodu. Jedno konto, jedna tożsamość.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={
              "rounded-full border px-4 py-1.5 text-sm transition-colors " +
              (kind === k.id
                ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                : "border-[var(--bengos-border)] hover:border-[var(--bengos-accent)]")
            }
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="bengos-surface-card min-h-[20rem] p-6 text-center">
        <h2 className="text-xl font-medium">Katalog</h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          {kind ? `Filtr: ${KINDS.find((k) => k.id === kind)?.label}` : "Wszystkie pozycje"}
        </p>
        <p className="mt-4 text-sm text-[var(--bengos-text-muted)]">
          Pozycje pojawią się tutaj, gdy twórcy opublikują assety ze Studio.
          Płatność na razie manualna — interfejs mówi o tym wprost.
        </p>
        <Link
          href="/studio"
          className="mt-6 inline-block rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 py-2 font-medium text-[var(--bengos-text-on-accent)]"
        >
          Stwórz w Studio
        </Link>
      </div>
    </div>
  );
}
