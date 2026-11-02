"use client";

/**
 * Ekran błędu krytycznego.
 *
 * Pokazuje się wtedy, gdy render ekranu się wywalił. Nie pokazujemy stosu
 * wywołań ani treści wyjątku — w środowisku produkcyjnym to wyciek, nie
 * informacja. Pokazujemy natomiast, że dane użytkownika są nienaruszone, bo
 * to pierwsza obawa każdego, kto widzi ten ekran.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
        Ten ekran się nie wczytał
      </h1>
      <p className="mt-3 text-[var(--bengos-text-muted)]">
        Coś poszło nie tak po naszej stronie. Twoje konto, posty i pliki są nienaruszone —
        nic nie zostało utracone.
      </p>

      <button
        type="button"
        onClick={reset}
        className="bengos-touch-target mt-6 inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
