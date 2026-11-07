import type { Metadata } from "next";
import Link from "next/link";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Create" };

/**
 * Ekran asystenta.
 *
 * Plan jest tu ułożony od tego, czym asystent JEST, do tego, skąd bierze
 * wiedzę — bo to drugie jest w tym projekcie decyzją, nie szczegółem.
 * Asystent ma czytać kontekst użytkownika, a nie wiedzę ogólną, i to jest
 * pierwsza rzecz, którą ekran mówi po nagłówku.
 *
 * ── JEDNO WYJŚCIE DO USTAWIEŃ KLUCZY ────────────────────────────────────
 * Czwarta pozycja planu mówi o kluczach do modeli. Bez odnośnika byłaby to
 * obietnica bez drogi — użytkownik dowiedziałby się, że klucze wpisuje się
 * w ustawieniach, i musiałby ich szukać sam. Odnośnik prowadzi wprost na
 * ekran kluczy, który już działa.
 */
export default function CreatePage() {
  return (
    <div className="space-y-6">
      <ModulePlaceholder
        name="Create"
        stage={5}
        description="Asystent AI: pomysły, scenariusze, muzyka, kod. Warstwa asystenta to django-ai-assistant z TIKAL — przenoszony jako zależność, nie jako skopiowany kod."
        planned={[
          "Asystent kontekstowy w całej aplikacji, nie osobny czat w osobnym oknie",
          "Kontekst z Twoich projektów, utworów i wideo — nie z cudzej wiedzy ogólnej",
          "Generowanie scenariusza wideo i szkicu utworu z jednego opisu",
          "Klucze do modeli wpisywane w ustawieniach, szyfrowane, nigdy w repozytorium",
        ]}
      />

      <section aria-labelledby="create-keys" className="bengos-surface-card mx-auto max-w-2xl">
        <h2
          id="create-keys"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Klucze do modeli
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Asystent korzysta z Twoich kluczy do dostawców, nie z naszych. Klucz pokazuje się
          dokładnie raz, przy zapisie, i nigdy potem — serwer nie ma endpointu, który go
          zwraca. Adres dostawcy pochodzi z katalogu, nigdy z formularza.
        </p>
        <Link
          href="/settings/keys"
          className="bengos-touch-target mt-4 inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
        >
          Zarządzaj kluczami
        </Link>
      </section>
    </div>
  );
}
