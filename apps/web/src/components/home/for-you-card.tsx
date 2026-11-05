import Link from "next/link";

/**
 * Karta „Dla Ciebie”.
 *
 * Brief mówi wprost: rekomendacje oparte na zainteresowaniach, nie tylko na
 * czasie oglądania. Interfejs to pokazuje, bo użytkownik ma prawo wiedzieć,
 * dlaczego widzi to, co widzi — i mieć nad tym kontrolę. Stąd jawny filtr
 * powodu rekomendacji zamiast jednego nieprzejrzystego rankingu.
 *
 * Przed uruchomieniem rekomendacji kryteria są opisem, nie filtrem. Przycisk
 * zmieniający wyłącznie własną etykietę sugerowałby działające wyniki.
 *
 * ── TRZY KRYTERIA JAKO ZNACZNIKI ──────────────────────────────────────
 * Wypisane po przecinku w jednym wierszu wyglądały jak resztka zdania.
 * Jako osobne pigułki czytają się jak to, czym są: zestaw kryteriów, który
 * będzie można włączać i wyłączać. Pigułka nie udaje działającej kontrolki —
 * nie ma tu `button`, tylko znak, bo wyników jeszcze nie ma.
 */
const REASONS = ["obserwujesz", "podobny temat", "nowy dla Ciebie"] as const;

export function ForYouCard() {
  return (
    <section aria-labelledby="for-you" className="bengos-surface-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2
          id="for-you"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Dla Ciebie
        </h2>
        <Link
          href="/feed"
          className="ml-auto text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]"
        >
          Przejdź do feedu
        </Link>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {REASONS.map((item) => (
          <li
            key={item}
            className="rounded-full border border-[var(--bengos-border)] px-3 py-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]"
          >
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[var(--bengos-text-muted)]">
        Rekomendacje pojawią się po Etapie 2, razem z feedem. Wtedy każda będzie miała jawny
        powód i działający filtr — obecnie nie pokazujemy zmyślonych treści.
      </p>
    </section>
  );
}
