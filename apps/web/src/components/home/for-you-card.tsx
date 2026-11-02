"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Karta „Dla Ciebie”.
 *
 * Brief mówi wprost: rekomendacje oparte na zainteresowaniach, nie tylko na
 * czasie oglądania. Interfejs to pokazuje, bo użytkownik ma prawo wiedzieć,
 * dlaczego widzi to, co widzi — i mieć nad tym kontrolę. Stąd jawny filtr
 * powodu rekomendacji zamiast jednego nieprzejrzystego rankingu.
 */
const REASONS = ["obserwujesz", "podobny temat", "nowy dla Ciebie"] as const;

export function ForYouCard() {
  const [reason, setReason] = useState<(typeof REASONS)[number]>("obserwujesz");

  return (
    <section aria-labelledby="for-you" className="bengos-surface-card">
      <div className="flex flex-wrap items-center gap-3">
        <h2
          id="for-you"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Dla Ciebie
        </h2>
        <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Wybrane na podstawie tego, czym się interesujesz — nie tego, jak długo patrzysz.
        </p>
      </div>

      <div role="group" aria-label="Powód rekomendacji" className="mt-4 flex flex-wrap gap-2">
        {REASONS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={reason === item}
            onClick={() => setReason(item)}
            className={`min-h-9 rounded-full border px-3 text-[var(--bengos-size-caption)] transition-colors duration-[var(--bengos-motion-fast)] ${
              reason === item
                ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)]"
                : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[var(--bengos-text-muted)]">
        Rekomendacje pojawią się po Etapie 2, razem z feedem. Filtr jest gotowy już teraz,
        bo bez niego rekomendacja jest nieprzejrzysta, a nieprzejrzystej nie wpuszczamy.
      </p>

      <p className="mt-3">
        <Link
          href="/feed"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] px-2 text-[var(--bengos-accent)]"
        >
          Przejdź do feedu
        </Link>
      </p>
    </section>
  );
}
