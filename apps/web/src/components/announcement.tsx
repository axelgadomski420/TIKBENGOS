/**
 * Komunikat dla czytnika ekranu po działaniu użytkownika.
 *
 * Region istnieje także przed pierwszą zmianą. Dzięki temu czytnik rejestruje
 * go raz, a później ogłasza zmianę tekstu zamiast odkrywać nowy element.
 * Treść jest ukryta wizualnie, bo stan kontrolki już pokazuje wynik na ekranie.
 */
export function Announcement({ message }: { message: string }) {
  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="bengos-visually-hidden">
      {message}
    </p>
  );
}
