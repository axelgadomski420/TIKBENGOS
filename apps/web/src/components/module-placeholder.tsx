import Link from "next/link";

/**
 * Ekran dla modułu, który jeszcze nie istnieje.
 *
 * Ten komponent jest tu celowo i jest ważniejszy niż wygląda. Brief zakazuje
 * tworzenia fałszywych integracji, a Etap 1 nie zawiera Feed, Studio, Chat,
 * Create, Dev ani Access. Alternatywą byłyby atrapy — przyciski, które nic
 * nie robią, i karty z pustymi danymi. To jest gorsze niż „jeszcze tego nie
 * ma”, bo odbiera zaufanie do reszty aplikacji.
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
    <section aria-labelledby={`module-${name}`} className="mx-auto max-w-2xl">
      <p className="text-[var(--bengos-size-caption)] uppercase tracking-wide text-[var(--bengos-text-muted)]">
        Moduł w przygotowaniu
      </p>
      <h1
        id={`module-${name}`}
        className="mt-2 text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]"
      >
        BENGOS {name}
      </h1>
      <p className="mt-3 text-[var(--bengos-text-muted)]">{description}</p>

      <div className="bengos-surface-card mt-6">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Ten ekran powstaje w Etapie {stage}
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Nic tu jeszcze nie działa i nie udajemy, że działa. Poniżej jest dokładnie to, co
          ten moduł będzie robił.
        </p>
        <ul className="mt-4 space-y-2">
          {planned.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-[var(--bengos-accent)]">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6">
        <Link
          href="/"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] px-4 text-[var(--bengos-accent)]"
        >
          Wróć do BENGOS Home
        </Link>
      </p>
    </section>
  );
}
