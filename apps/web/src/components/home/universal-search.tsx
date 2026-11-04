/**
 * Wyszukiwarka uniwersalna.
 *
 * Jedno pole na cztery intencje: „zapytaj, stwórz, znajdź, zakoduj”. Nie
 * rozdzielamy ich na osobne zakładki, bo użytkownik nie wie z góry, czego
 * szuka — wie, co chce zrobić. Rozpoznanie intencji należy do asystenta;
 * interfejs pokazuje tylko podpowiedzi, żeby wynik nie zaskakiwał.
 *
 * Do czasu powstania wyszukiwania w Etapie 5 nie ma tu pola ani przycisku.
 * Kontrolka, która przyjmuje polecenie i nic z nim nie robi, byłaby atrapa.
 */
const INTENTS = [
  { label: "Zapytaj", example: "jak działa ten projekt" },
  { label: "Stwórz", example: "utwór do wideo o poranku" },
  { label: "Znajdź", example: "twórcy mówiący o dostępności" },
  { label: "Zakoduj", example: "dodaj filtr do feedu" },
];

export function UniversalSearch() {
  return (
    <section aria-labelledby="universal-search-title" className="bengos-surface-card bengos-glow-ring">
      <h1
        id="universal-search-title"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Wyszukiwarka uniwersalna
      </h1>
      <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Jedno wyszukiwanie obejmie pytania, tworzenie, znajdowanie treści i pracę nad kodem.
        Funkcja powstaje w Etapie 5 — obecnie nie przyjmujemy poleceń.
      </p>

      <ul className="mt-4 space-y-2">
        {INTENTS.map((intent) => (
          <li key={intent.label}>
            <span className="text-[var(--bengos-accent)]">{intent.label}</span>
            {" · "}
            <span className="text-[var(--bengos-text-muted)]">{intent.example}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
