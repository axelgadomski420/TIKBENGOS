"use client";

import Link from "next/link";

/**
 * Ekran błędu krytycznego.
 *
 * Pokazuje się wtedy, gdy render ekranu się wywalił. Nie pokazujemy stosu
 * wywołań ani treści wyjątku — w środowisku produkcyjnym to wyciek, nie
 * informacja. Pokazujemy natomiast, że dane użytkownika są nienaruszone, bo
 * to pierwsza obawa każdego, kto widzi ten ekran.
 *
 * Błąd renderowania nie daje podstaw do sprawdzenia stanu konta ani plików,
 * dlatego komunikat ogranicza się do znanego zakresu i prowadzi do wyjścia.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="mx-auto max-w-2xl py-12">
      <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
        Ten ekran się nie wczytał
      </h1>
      <p className="mt-3 text-[var(--bengos-text-muted)]">
        Wystąpił błąd podczas wyświetlania tej strony. Możesz ponowić jej wczytanie albo
        wrócić do pulpitu. Nie mamy podstaw, żeby na tym ekranie potwierdzać stan Twoich danych.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Spróbuj ponownie
        </button>
        <Link
          href="/"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
        >
          Wróć do BENGOS Home
        </Link>
      </div>
    </div>
  );
}
