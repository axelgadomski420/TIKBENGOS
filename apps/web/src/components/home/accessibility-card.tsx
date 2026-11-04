"use client";

import Link from "next/link";
import { useState } from "react";

import { Announcement } from "@/components/announcement";
import { usePreferences } from "@/lib/preferences-context";

/**
 * Karta dostępności na pulpicie.
 *
 * Brief wymaga, żeby dostępność nie była dodatkiem — więc ma własną kartę na
 * głównym ekranie, obok tworzenia i feedu, a nie schowaną w ustawieniach.
 * Przełączniki działają od razu i są zapamiętywane lokalnie, bo to
 * preferencje wyświetlania, a nie operacje wymagające serwera.
 */
export function AccessibilityCard() {
  const { accessibility, setAccessibility } = usePreferences();
  const [announcement, setAnnouncement] = useState("");

  const toggles = [
    {
      key: "captionsEnabled" as const,
      label: "Napisy",
      description: "Włączone domyślnie — nagranie bez napisów jest niekompletne.",
    },
    {
      key: "ttsEnabled" as const,
      label: "Czytanie na głos",
      description: "Posty, czat i interfejs mogą być czytane.",
    },
    {
      key: "sttEnabled" as const,
      label: "Pisanie głosem",
      description: "Zamiana mowy na tekst w polach wpisywania.",
    },
    {
      key: "morseAlertsEnabled" as const,
      label: "Morse przez wibracje",
      description: "Kluczowe alerty jako wzór wibracji.",
    },
  ];

  return (
    <section aria-labelledby="accessibility-card" className="bengos-surface-card">
      <Announcement message={announcement} />
      <div className="flex flex-wrap items-center gap-3">
        <h2
          id="accessibility-card"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Dostępność
        </h2>
        <Link
          href="/settings#accessibility"
          className="ml-auto text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]"
        >
          Wszystkie ustawienia
        </Link>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {toggles.map((toggle) => (
          <li key={toggle.key} className="flex items-start gap-3">
            <input
              id={`toggle-${toggle.key}`}
              type="checkbox"
              checked={accessibility[toggle.key]}
              onChange={(event) => {
                const enabled = event.target.checked;
                setAccessibility({ [toggle.key]: enabled });
                setAnnouncement(`${toggle.label}: ${enabled ? "włączone" : "wyłączone"}.`);
              }}
              className="mt-1 size-5 shrink-0 accent-[var(--bengos-accent)]"
            />
            <label htmlFor={`toggle-${toggle.key}`} className="cursor-pointer">
              <span className="block font-[var(--bengos-weight-medium)]">{toggle.label}</span>
              <span className="block text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {toggle.description}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Kanały działają w Etapie 4. Przełączniki już teraz zapisują Twoją decyzję, żeby moduły
        wchodziły z ustawieniem, którego oczekujesz — a nie z domyślnym.
      </p>
    </section>
  );
}
