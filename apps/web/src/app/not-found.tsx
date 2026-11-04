import Link from "next/link";

/**
 * 404, który mówi prawdę.
 *
 * W aplikacji z siedmioma modułami najczęstsza przyczyna tego ekranu to
 * literówka w adresie albo wejście do modułu, który jeszcze nie istnieje —
 * dlatego ekran odsyła do listy modułów, a nie tylko do pulpitu.
 *
 * To osobny stan błędu, a nie ekran modułu w przygotowaniu. Użytkownik musi
 * odróżnić nieistniejący adres od funkcji zaplanowanej na kolejny etap.
 */
export default function NotFound() {
  return (
    <section aria-labelledby="not-found-title" className="mx-auto max-w-2xl">
      <p className="text-[var(--bengos-size-caption)] uppercase tracking-wide text-[var(--bengos-text-muted)]">
        Błąd 404
      </p>
      <h1
        id="not-found-title"
        className="mt-2 text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]"
      >
        Nie znaleziono tej strony
      </h1>
      <p className="mt-3 text-[var(--bengos-text-muted)]">
        Ten adres nie prowadzi do żadnego ekranu. Sprawdź pisownię albo wróć do pulpitu,
        gdzie znajdziesz wszystkie dostępne moduły i ich aktualny stan.
      </p>
      <p className="mt-6">
        <Link
          href="/"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 text-[var(--bengos-text-on-accent)]"
        >
          Wróć do BENGOS Home
        </Link>
      </p>
    </section>
  );
}
