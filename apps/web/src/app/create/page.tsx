import type { Metadata } from "next";
import Link from "next/link";

import { AssistantClient } from "@/components/create/assistant-client";

export const metadata: Metadata = { title: "BENGOS Create" };

/**
 * Ekran asystenta.
 *
 * Asystent czyta kontekst użytkownika, a nie wiedzę ogólną — i dlatego
 * pierwszą rzeczą, którą ten ekran mówi, jest droga pytania: zlecenie
 * odchodzi do modelu (ASSISTANT_LLM_ENDPOINT), odpowiedź wraca zadaniem.
 * Bez modelu panel pokazuje 503 z wyjaśnieniem, a nie zmyśloną odpowiedź.
 *
 * ── JEDNO WYJŚCIE DO USTAWIEŃ KLUCZY ────────────────────────────────────
 * Karta kluczy zostaje: to obietnica z wcześniejszego etapu i działa.
 * Odnośnik prowadzi wprost na ekran kluczy.
 */
export default function CreatePage() {
  return (
    <div className="space-y-6">
      <AssistantClient />

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

      <section aria-labelledby="create-later" className="bengos-surface-card mx-auto max-w-2xl">
        <h2
          id="create-later"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Co dojdzie
        </h2>
        <ul className="mt-2 space-y-1 text-[var(--bengos-text-muted)]">
          <li>Kontekst z Twoich projektów, utworów i wideo — nie z cudzej wiedzy ogólnej</li>
          <li>Generowanie scenariusza wideo i szkicu utworu z jednego opisu</li>
        </ul>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          To są plany, nie funkcje — nie działają jeszcze i nie udają, że działają.
        </p>
      </section>
    </div>
  );
}
