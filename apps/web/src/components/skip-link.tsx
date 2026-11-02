/**
 * Ominięcie nawigacji.
 *
 * Pierwszy element, który dostaje fokus przy tabulacji. Bez tego użytkownik
 * klawiatury przechodzi przez całe menu na każdym ekranie, żeby dotrzeć do
 * treści — przy siedmiu modułach to kilkanaście naciśnięć za każdym razem.
 */
export function SkipLink() {
  return (
    <a
      href="#bengos-main"
      className="absolute left-3 top-3 z-50 -translate-y-24 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 py-2 text-[var(--bengos-text-on-accent)] transition-transform duration-[var(--bengos-motion-fast)] focus:translate-y-0"
    >
      Przejdź do treści
    </a>
  );
}
