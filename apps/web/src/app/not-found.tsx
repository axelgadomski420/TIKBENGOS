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
 *
 * ── DWA WYJŚCIA DLA DWÓCH PRZYCZYN ─────────────────────────────────────
 * Literówka w adresie i wejście na ekran z późniejszego etapu to dwa różne
 * zdarzenia, a jeden odnośnik do pulpitu nie odpowiada na oba. Drugi prowadzi
 * wprost do listy modułów, gdzie widać, co istnieje i na jakim jest etapie.
 *
 * ── ZNAK MARKI NAD TRESCIĄ ─────────────────────────────────────────────
 * 404 jest jedynym ekranem, na którym użytkownik nie ma żadnego kontekstu
 * — nagłówek powłoki zostaje, ale treść pod nim jest pusta. Znak nad
 * nagłówkiem mówi, że to nadal ta aplikacja, a nie losowa strona błędu.
 */
const LOGO = "https://i.ibb.co/bMZh3YJs/C57-AC4-F4-7-D83-4-F5-D-890-F-00-BB1-F79-D6-F3.jpg";

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-title" className="bengos-rise mx-auto max-w-2xl py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO}
        alt=""
        width={72}
        height={72}
        className="size-18 rounded-full object-cover object-top"
        style={{ boxShadow: "0 0 36px -12px var(--bengos-glow)" }}
      />
      <p className="bengos-eyebrow mt-4">Błąd 404</p>
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
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Wróć do BENGOS Home
        </Link>
        <Link
          href="/#branches"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
        >
          Zobacz listę modułów
        </Link>
      </div>
    </section>
  );
}
