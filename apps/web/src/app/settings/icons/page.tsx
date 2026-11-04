import type { Metadata } from "next";

import { IconsPanel } from "@/components/settings/icons-panel";

export const metadata: Metadata = { title: "Ikony aplikacji" };

/**
 * Ekran ikon PWA.
 *
 * Istnieje dlatego, że brak ikon jest realnym brakiem wdrożenia: manifest je
 * wymienia, instalacja PWA ich szuka, a nikt tego nie widzi, dopóki nie spróbuje
 * zainstalować aplikacji na telefonie. Ekran nazywa problem i podaje jedyne
 * wyjście — wygenerowanie plików poza repozytorium.
 */
export default function IconsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
          Ikony aplikacji
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Manifest PWA wskazuje trzy pliki ikon i instalacja ich szuka. Ten ekran pokazuje,
          których plików brakuje i czym je wygenerować.
        </p>
      </header>

      <IconsPanel />
    </div>
  );
}
