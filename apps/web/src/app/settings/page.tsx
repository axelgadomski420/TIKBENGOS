import type { Metadata } from "next";
import Link from "next/link";

import { LOCALES, PERMISSIONS, ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from "@bengos/core";
import { THEMES, THEME_LABELS } from "@bengos/ui";

import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Ustawienia" };

/**
 * Ustawienia — wspólne dla całej aplikacji.
 *
 * Sekcje są tu po to, żeby ekran nie był jedną długą listą bez struktury.
 * Kolejność idzie od tego, co dotyczy wszystkich, do tego, co dotyczy
 * pojedynczego modułu.
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
          Ustawienia
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Wspólne dla całego TIKBENGOS. To, co tu ustawisz, działa w każdym module — nie ma
          osobnych ustawień dla feedu, czatu i studia.
        </p>
      </header>

      <SettingsForm themes={THEMES} themeLabels={THEME_LABELS} locales={LOCALES} />

      <section id="api-keys" aria-labelledby="api-keys-title" className="bengos-surface-card">
        <h2 id="api-keys-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Klucze API
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Klucze do modeli językowych, usług muzycznych i GitHuba wpisujesz tutaj. Nigdy nie
          trafiają do repozytorium. Zapisany klucz jest szyfrowany i pokazywany dokładnie raz —
          potem widać już tylko jego ostatnie znaki.
        </p>
        <Link
          href="/settings/keys"
          className="bengos-touch-target mt-4 inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
        >
          Zarządzaj kluczami
        </Link>
      </section>

      <section id="roles" aria-labelledby="roles-title" className="bengos-surface-card">
        <h2 id="roles-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Role i uprawnienia
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Role nadaje administrator. Uprawnienia są sprawdzane po nazwie, więc dołożenie roli nie
          wymaga zmiany w modułach.
        </p>
        <ul className="mt-4 space-y-3">
          {ROLES.map((role) => (
            <li
              key={role}
              className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 py-3"
            >
              <p className="font-[var(--bengos-weight-medium)]">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {ROLE_PERMISSIONS[role].length === PERMISSIONS.length
                  ? "Wszystkie uprawnienia"
                  : ROLE_PERMISSIONS[role].join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section id="privacy" aria-labelledby="privacy-title" className="bengos-surface-card">
        <h2 id="privacy-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Prywatność i zgody
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Kamera, mikrofon i dostęp do GitHuba wymagają Twojej osobnej zgody, niezależnie od
          tego, jaką masz rolę. Zgodę możesz odwołać w każdej chwili — moduł, który jej
          potrzebował, po prostu przestaje działać.
        </p>
      </section>
    </div>
  );
}
