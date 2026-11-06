import Link from "next/link";

/**
 * Ekran dla modułu, który jeszcze nie istnieje.
 *
 * Ten komponent jest tu celowo i jest ważniejszy niż wygląda. Brief zakazuje
 * tworzenia fałszywych integracji, a Etap 1 nie zawiera Feed, Studio, Chat,
 * Create, Dev ani Access. Alternatywą byłyby atrapy — przyciski, które nic
 * nie robią, i karty z pustymi danymi. To jest gorsze niż „jeszcze tego nie
 * ma”, bo odbiera zaufanie do reszty aplikacji.
 *
 * ── TEN EKRAN MA BYĆ DOBRY, NIE TYLKO UCZCIWY ──────────────────────────
 * Uczciwość bez formy wygląda jak awaria: nagłówek, akapit i lista punktów
 * to układ, który czyta się jak komunikat błędu. Moduł w przygotowaniu jest
 * normalnym stanem tej aplikacji, więc jego ekran ma własną hierarchię:
 * podpis etapu nad nazwą, lista planu w kaflach zamiast punktów, i jedno
 * wyraźne wyjście. Użytkownik ma wyjść z tego ekranu z wiedzą, co tu będzie,
 * a nie z poczuciem, że trafił na zepsutą stronę.
 *
 * Lista planu jest `ul` z kaflami, nie listą punktowaną z myślnikami —
 * myślnik na początku linii czyta się jako wyliczenie w notatce, a nie
 * jako zapowiedź funkcji.
 */
export function ModulePlaceholder({
  name,
  stage,
  description,
  planned,
}: {
  name: string;
  stage: number;
  description: string;
  planned: string[];
}) {
  return (
    <section aria-labelledby={`module-${name}`} className="bengos-rise mx-auto max-w-2xl">
      <p className="bengos-eyebrow">Etap {stage} — moduł w przygotowaniu</p>
      <h1
        id={`module-${name}`}
        className="mt-2 text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]"
      >
        BENGOS {name}
      </h1>
      <p className="mt-3 text-[var(--bengos-text-muted)]">{description}</p>

      <section aria-labelledby={`plan-${name}`} className="bengos-surface-card mt-6">
        <h2
          id={`plan-${name}`}
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Co ten moduł będzie robił
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Nic tu jeszcze nie działa i nie udajemy, że działa. Poniżej jest dokładnie to, co
          ten moduł będzie robił po ukończeniu Etapu {stage}.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {planned.map((item) => (
            <li
              key={item}
              className="flex min-h-[var(--bengos-touch-target-min)] items-center rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 py-2 text-[var(--bengos-size-caption)]"
            >
              <span className="text-[var(--bengos-accent)]" aria-hidden="true">
                •{" "}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6">
        <Link
          href="/"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
        >
          Wróć do BENGOS Home
        </Link>
      </p>
    </section>
  );
}
