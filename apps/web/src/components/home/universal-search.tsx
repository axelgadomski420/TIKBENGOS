/**
 * Wyszukiwarka uniwersalna.
 *
 * Jedno pole na cztery intencje: „zapytaj, stwórz, znajdź, zakoduj”. Nie
 * rozdzielamy ich na osobne zakładki, bo użytkownik nie wie z góry, czego
 * szuka — wie, co chce zrobić. Rozpoznanie intencji należy do asystenta;
 * interfejs pokazuje tylko podpowiedzi, żeby wynik nie zaskakiwał.
 *
 * Do czasu powstania wyszukiwania w Etapie 5 nie ma tu pola ani przycisku.
 * Kontrolka, która przyjmuje polecenie i nic z nim nie robi, byłaby atrapą.
 *
 * ── TO JEST JEDYNA POWIERZCHNIA NAJWIĘKSZEJ WAGI ───────────────────────
 * Karta stoi na samej górze pulpitu i jako jedyna używa `bengos-surface-hero`
 * oraz `bengos-glow-ring`. Brief pozwala na jedną poświatę na ekran — i to
 * jest właśnie ta jedna. Gdyby drugi element prosił o uwagę równie głośno,
 * żaden nie byłby najważniejszy.
 *
 * Cztery intencje dostały układ dwuwierszowy: etykieta nad przykładem,
 * a nie obok. W jednej linii przykład łamał się przy „utwór do wideo
 * o poranku” i lista traciła równy rytm.
 */
const INTENTS = [
  { label: "Zapytaj", example: "jak działa ten projekt" },
  { label: "Stwórz", example: "utwór do wideo o poranku" },
  { label: "Znajdź", example: "twórcy mówiący o dostępności" },
  { label: "Zakoduj", example: "dodaj filtr do feedu" },
];

export function UniversalSearch() {
  return (
    <section
      aria-labelledby="universal-search-title"
      className="bengos-surface-hero bengos-glow-ring"
    >
      <p className="bengos-eyebrow">Wyszukiwarka uniwersalna</p>
      <h2
        id="universal-search-title"
        className="mt-1 text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]"
      >
        Co chcesz zrobić?
      </h2>
      <p className="mt-2 text-[var(--bengos-text-muted)]">
        Jedno wyszukiwanie obejmie pytania, tworzenie, znajdowanie treści i pracę nad kodem.
        Funkcja powstaje w Etapie 5 — obecnie nie przyjmujemy poleceń.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {INTENTS.map((intent) => (
          <li key={intent.label} className="bengos-tile">
            <span className="font-[var(--bengos-weight-medium)] text-[var(--bengos-accent)]">
              {intent.label}
            </span>
            <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              „{intent.example}”
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
