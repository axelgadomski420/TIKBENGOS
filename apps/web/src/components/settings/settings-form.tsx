"use client";

import { useId } from "react";

import type { LocaleDefinition } from "@bengos/core";
import type { ThemeName } from "@bengos/ui";

import { usePreferences } from "@/lib/preferences-context";

export function SettingsForm({
  themes,
  themeLabels,
  locales,
}: {
  themes: readonly ThemeName[];
  themeLabels: Record<ThemeName, string>;
  locales: LocaleDefinition[];
}) {
  const { theme, setTheme, locale, setLocale, accessibility, setAccessibility } = usePreferences();
  const languageId = useId();

  return (
    <>
      <section id="language" aria-labelledby="language-title" className="bengos-surface-card">
        <h2 id="language-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Język
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Język interfejsu i format regionalny są osobne — tak jak w ustawieniach telefonu.
          Możesz mieć interfejs po polsku i datę w formacie amerykańskim albo odwrotnie.
        </p>

        <div className="mt-4">
          <label htmlFor={languageId} className="block font-[var(--bengos-weight-medium)]">
            Język interfejsu
          </label>
          <select
            id={languageId}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            className="mt-1 min-h-[var(--bengos-touch-target-min)] w-full max-w-sm rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
          >
            {locales.map((item) => (
              <option key={item.tag} value={item.tag} disabled={!item.complete}>
                {item.nativeName}
                {item.complete ? "" : " — tłumaczenie w przygotowaniu"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Języki bez pełnego katalogu komunikatów są widoczne, ale nieaktywne. Ukrycie ich
            byłoby prostsze i mniej uczciwe.
          </p>
        </div>
      </section>

      <section id="appearance" aria-labelledby="appearance-title" className="bengos-surface-card">
        <h2 id="appearance-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Wygląd
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Ciemny motyw jest domyślny, ale nie wymuszony — wybór należy do Ciebie i jest
          zapamiętywany także wtedy, gdy zmieni się ustawienie systemowe Twojego urządzenia.
        </p>

        <fieldset className="mt-4 border-0 p-0">
          <legend className="sr-only">Motyw</legend>
          <div className="flex flex-wrap gap-2">
            {themes.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={theme === item}
                onClick={() => setTheme(item)}
                className={`min-h-[var(--bengos-touch-target-min)] rounded-[var(--bengos-radius-control)] border px-4 transition-colors duration-[var(--bengos-motion-fast)] ${
                  theme === item
                    ? "border-[var(--bengos-accent)] text-[var(--bengos-accent)] font-[var(--bengos-weight-medium)]"
                    : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"
                }`}
              >
                {themeLabels[item]}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section id="accessibility" aria-labelledby="accessibility-title" className="bengos-surface-card">
        <h2 id="accessibility-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Dostępność
        </h2>

        <ul className="mt-4 space-y-4">
          <AccessibilityToggle
            id="accessibility-mode"
            label="Tryb dostępności"
            description="Większa typografia, większe cele dotykowe i luźniejszy układ. Włącza też większy odstęp liter i wyrazów."
            checked={accessibility.accessibilityMode}
            onChange={(value) => setAccessibility({ accessibilityMode: value })}
          />
          <AccessibilityToggle
            id="high-contrast"
            label="Wysoki kontrast"
            description="Osobny motyw, nie nakładka. Podnosi kontrast wszystkich par kolorów powyżej progu AA z zapasem."
            checked={accessibility.highContrast}
            onChange={(value) => setAccessibility({ highContrast: value })}
          />
          <AccessibilityToggle
            id="reduced-motion"
            label="Ograniczony ruch"
            description="Animacje są skracane do jednej milisekundy, a nie wyłączane. Funkcja zostaje, ruch znika."
            checked={accessibility.reducedMotion}
            onChange={(value) => setAccessibility({ reducedMotion: value })}
          />
          <AccessibilityToggle
            id="perception-text"
            label="Tryb tylko tekst"
            description="Każde wideo ma napisy, transkrypcję i opis — ekran bez obrazu niesie wszystko."
            checked={accessibility.perception === "text-only"}
            onChange={(value) => setAccessibility({ perception: value ? "text-only" : "both" })}
          />
        </ul>
      </section>
    </>
  );
}

function AccessibilityToggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <li className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 shrink-0 accent-[var(--bengos-accent)]"
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="block font-[var(--bengos-weight-medium)]">{label}</span>
        <span className="block text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          {description}
        </span>
      </label>
    </li>
  );
}
