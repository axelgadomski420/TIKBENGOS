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
 */
const REASONS = ["obserwujesz", "podobny temat", "nowy dla Ciebie"] as const;

export function ForYouCard() {
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
          Rekomendacje będą oparte na zainteresowaniach, nie na czasie oglądania.
        </p>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {REASONS.map((item) => (
          <li key={item} className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[var(--bengos-text-muted)]">
        Rekomendacje pojawią się po Etapie 2, razem z feedem. Wtedy każda będzie miała jawny
        powód i działający filtr — obecnie nie pokazujemy zmyślonych treści.
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
