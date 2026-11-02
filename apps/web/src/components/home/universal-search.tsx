"use client";

import { useId, useRef, useState } from "react";

/**
 * Wyszukiwarka uniwersalna.
 *
 * Jedno pole na cztery intencje: „zapytaj, stwórz, znajdź, zakoduj”. Nie
 * rozdzielamy ich na osobne zakładki, bo użytkownik nie wie z góry, czego
 * szuka — wie, co chce zrobić. Rozpoznanie intencji należy do asystenta;
 * interfejs pokazuje tylko podpowiedzi, żeby wynik nie zaskakiwał.
 */
const INTENTS = [
  { label: "Zapytaj", example: "jak działa ten projekt" },
  { label: "Stwórz", example: "utwór do wideo o poranku" },
  { label: "Znajdź", example: "twórcy mówiący o dostępności" },
  { label: "Zakoduj", example: "dodaj filtr do feedu" },
];

export function UniversalSearch() {
  const [value, setValue] = useState("");
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-labelledby={`${inputId}-title`} className="bengos-surface-card bengos-glow-ring">
      <h1 id={`${inputId}-title`} className="bengos-visually-hidden">
        Wyszukiwarka uniwersalna
      </h1>

      <label
        htmlFor={inputId}
        className="block text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Co chcesz zrobić?
      </label>
      <p id={hintId} className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Jedno pole na wszystko: pytanie, tworzenie, wyszukiwanie i pracę nad kodem.
      </p>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          // Rozpoznanie intencji należy do Etapu 5. Do tego czasu pole nie
          // wysyła niczego i nie udaje, że wysłało.
          event.preventDefault();
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          name="intent"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby={hintId}
          placeholder="Napisz zdanie — od pomysłu do muzyki, wideo, rozmowy i kodu"
          enterKeyHint="go"
          autoComplete="off"
          className="min-h-[var(--bengos-touch-target-min)] flex-1 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-4 text-[var(--bengos-text)] placeholder:text-[var(--bengos-text-muted)]"
        />
        <button
          type="submit"
          className="bengos-touch-target rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-5 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Ruszaj
        </button>
      </form>

      <ul className="mt-4 flex flex-wrap gap-2">
        {INTENTS.map((intent) => (
          <li key={intent.label}>
            <button
              type="button"
              onClick={() => {
                setValue(intent.example);
                inputRef.current?.focus();
              }}
              className="min-h-9 rounded-full border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)] transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-border-strong)] hover:text-[var(--bengos-text)]"
            >
              <span className="text-[var(--bengos-accent)]">{intent.label}</span>
              {" · "}
              {intent.example}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
