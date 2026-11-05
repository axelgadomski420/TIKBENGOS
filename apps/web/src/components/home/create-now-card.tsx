import Link from "next/link";

/**
 * Karta „Stwórz teraz”.
 *
 * Cztery wejścia, każde do innego modułu, ale wszystkie wyglądają jak jedna
 * karta. To jest cała idea TIKBENGOS w jednym komponencie: cztery osobne
 * aplikacje nie są tu widoczne — widać cztery rzeczy, które można zrobić.
 *
 * ── DLACZEGO WŁASNE KAFLE, A NIE GOTOWA KARTA ─────────────────────────
 * Wcześniej każda pozycja była ramką w ramce: karta z obramowaniem,
 * a w niej cztery kolejne obramowane prostokąty. Trzy poziomy krawędzi
 * obok siebie odbierają hierarchię — oko nie wie, co jest pojemnikiem,
 * a co treścią. Teraz karta jest jedna, a pozycje oddziela linia, nie ramka.
 *
 * Opis idzie pod etykietą, nie obok — na wąskim ekranie obok siebie łamałby
 * się w dwie linie i rozjeżdżał wysokości pozycji.
 */
const OPTIONS = [
  { href: "/studio/video", label: "Wideo", description: "Nagraj albo wgraj, dodaj napisy, opublikuj" },
  { href: "/studio/music", label: "Muzyka", description: "Opisz utwór, poczekaj, przypisz do wideo" },
  { href: "/studio/post", label: "Post", description: "Tekst, wideo albo dźwięk — z opisem dla ekranu bez obrazu" },
  { href: "/studio/project", label: "Projekt kodu", description: "Opisz funkcję, zobacz plan, zatwierdź pull request" },
];

export function CreateNowCard() {
  return (
    <section aria-labelledby="create-now" className="bengos-surface-card">
      <h2
        id="create-now"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Stwórz teraz
      </h2>

      {/*
        Lista, nie stos ramek. `-mx-2` wyrównuje strefę naciśnięcia do krawędzi
        karty, żeby cel dotykowy był większy niż sam tekst — bez tego palec
        trafia w literę, a nie w wiersz.
      */}
      <ul className="mt-3 -mx-2">
        {OPTIONS.map((option) => (
          <li key={option.href}>
            <Link
              href={option.href}
              className="group flex min-h-[var(--bengos-touch-target-min)] flex-col justify-center rounded-[var(--bengos-radius-control)] px-2 py-2.5 transition-colors duration-[var(--bengos-motion-fast)] hover:bg-[var(--bengos-surface-sunken)]"
            >
              <span className="flex items-baseline gap-2 font-[var(--bengos-weight-medium)]">
                {option.label}
                {/*
                  Strzałka pojawia się dopiero przy najechaniu i tylko na
                  urządzeniach ze wskaźnikiem — na dotyku nie ma stanu
                  najechania, więc element nigdy by się nie pokazał.
                */}
                <span
                  aria-hidden="true"
                  className="ml-auto text-[var(--bengos-accent)] opacity-0 transition-opacity duration-[var(--bengos-motion-fast)] group-hover:opacity-100"
                >
                  →
                </span>
              </span>
              <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {option.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
