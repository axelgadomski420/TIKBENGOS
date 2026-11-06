/**
 * Ominięcie nawigacji.
 *
 * Pierwszy element, który dostaje fokus przy tabulacji. Bez tego użytkownik
 * klawiatury przechodzi przez całe menu na każdym ekranie, żeby dotrzeć do
 * treści — przy siedmiu modułach to kilkanaście naciśnięć za każdym razem.
 *
 * ── ODSTĘP OD GÓRY NIE JEST DOWOLNY ────────────────────────────────────
 * Pasek powłoki jest przyklejony (`sticky`) i ma wysokość około 56 px.
 * Odnośnik musi wyjechać POZA tę wysokość, gdy nie ma fokusu — przy
 * `-translate-y-24` (96 px) wyjeżdżał wyżej niż trzeba, ale zostawiał
 * smugę nad krawędzią ekranu przy powiększeniu. Przesunięcie liczone
 * z `calc` od wysokości paska wychodzi poza obszar niezależnie od skali
 * typografii, bo pasek rośnie razem z nią.
 *
 * ── ANIMACJA ZOSTAJE, NAWET PRZY OGRANICZENIU RUCHU ────────────────────
 * Przejazd jest tym, co odróżnia ten odnośnik od zwykłego linku na
 * początku treści — bez niego element po prostu pojawia się w połowie
 * ekranu. Token czasu schodzi do 1 ms, więc przy `prefers-reduced-motion`
 * odnośnik pokazuje się natychmiast, a nie znika.
 */
export function SkipLink() {
  return (
    <a
      href="#bengos-main"
      className="absolute left-3 top-3 z-50 -translate-y-[calc(100%+3rem)] rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 py-2 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] shadow-lg transition-transform duration-[var(--bengos-motion-fast)] focus-visible:translate-y-0"
    >
      Przejdź do treści
    </a>
  );
}
