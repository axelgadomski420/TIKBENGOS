import type { Metadata } from "next";

import { ConsentSettings } from "@/components/settings/consent-settings";
import { SettingsForm } from "@/components/settings/settings-form";
import { LOCALES } from "@bengos/core";
import { THEMES, THEME_LABELS } from "@bengos/ui";

export const metadata: Metadata = { title: "Ustawienia" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Ustawienia</h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">Wygląd, język i Twoje klucze do modeli.</p>
      </header>
      <SettingsForm themes={THEMES} themeLabels={THEME_LABELS} locales={LOCALES} />
      <section className="bengos-surface-card">
        <h2 className="text-xl font-medium">Klucze API</h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Grok, Gemini, OpenAI, Claude i reszta. Wkładasz własny klucz i wybierasz model z listy. Adresu nie wpisujesz.
        </p>
        <a
          href="/settings/keys"
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-[var(--bengos-border)] px-4"
        >
          Otwórz klucze
        </a>
      </section>
      <ConsentSettings />
    </div>
  );
}
