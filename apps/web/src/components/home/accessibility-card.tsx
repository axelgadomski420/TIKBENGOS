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
 *
 * ── CAŁA KARTA JEST CELEM NACISNIĘCIA ──────────────────────────────────
 * Wcześniej klikalna była wyłącznie etykieta obok kwadracika, a sam
 * kwadracik był osobnym, ciasnym celem. Teraz etykieta z opisem jest
 * `label` obejmującym cały wiersz — palec trafia w wiersz, nie w literę,
 * a klawiatura i czytnik ekranu zachowują jedno pole wyboru na pozycję.
 *
 * ── ZAZNACZENIE JEST WIDOCZNE BEZ KOLORU ──────────────────────────────
 * Wiersz włączonej opcji dostaje podświetloną powierzchnię. Kolor samego
 * ptaszka działa tylko wtedy, gdy ktoś odróżnia akcent od tła; powierzchnia
 * pod całym wierszem działa niezależnie od tego.
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {toggles.map((toggle) => {
          const on = accessibility[toggle.key];
          return (
            <li key={toggle.key}>
              <label
                htmlFor={`toggle-${toggle.key}`}
                className={`flex min-h-[var(--bengos-touch-target-min)] cursor-pointer items-start gap-3 rounded-[var(--bengos-radius-control)] border px-3 py-2 transition-colors duration-[var(--bengos-motion-fast)] ${
                  on
                    ? "border-[var(--bengos-border-strong)] bg-[var(--bengos-surface-sunken)]"
                    : "border-[var(--bengos-border)]"
                }`}
              >
                <input
                  id={`toggle-${toggle.key}`}
                  type="checkbox"
                  checked={on}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setAccessibility({ [toggle.key]: enabled });
                    setAnnouncement(`${toggle.label}: ${enabled ? "włączone" : "wyłączone"}.`);
                  }}
                  className="mt-1 size-5 shrink-0 accent-[var(--bengos-accent)]"
                />
                <span>
                  <span className="block font-[var(--bengos-weight-medium)]">{toggle.label}</span>
                  <span className="block text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                    {toggle.description}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Kanały działają w Etapie 4. Przełączniki już teraz zapisują Twoją decyzję, żeby moduły
        wchodziły z ustawieniem, którego oczekujesz — a nie z domyślnym.
      </p>
    </section>
  );
}
