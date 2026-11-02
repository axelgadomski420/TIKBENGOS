import type { Metadata } from "next";
import Link from "next/link";

import { ProviderCredentials } from "@/components/settings/provider-credentials";

export const metadata: Metadata = { title: "Klucze API" };

/**
 * Ekran kluczy.
 *
 * Dwie sekcje, bo to dwie różne rzeczy i mieszanie ich było błędem:
 *
 * 1. Klucze dostawców — którymi TIKBENGOS loguje się do OpenAI, GitHuba,
 *    ElevenLabs i reszty. Każdy użytkownik ma własne i widzi tylko swoje.
 * 2. Klucze TIKBENGOS — którymi Twoje narzędzia logują się do nas.
 *
 * Reguła jest jedna dla obu: klucz pokazuje się dokładnie raz, przy zapisie,
 * i nigdy potem. Serwer nie ma endpointu, który go zwraca.
 */
export default function ApiKeysPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
          Klucze API
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Twoje klucze do zewnętrznych dostawców. Są szyfrowane na serwerze, nigdy nie
          opuszczają go w odpowiedzi, a zapisany klucz pokazuje się raz — potem widać
          już tylko jego początek i ostatnie cztery znaki.
        </p>
      </header>

      <ProviderCredentials />

      <section id="bengos-keys" aria-labelledby="bengos-keys-title" className="bengos-surface-card">
        <h2 id="bengos-keys-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Klucze TIKBENGOS dla Twoich narzędzi
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          To osobna rzecz od listy powyżej. Tu wystawiasz klucze, którymi Twoje skrypty,
          bot i aplikacja mobilna logują się do TIKBENGOS. Model i zasada jednorazowego
          pokazania są gotowe po stronie API — ten ekran dołącza do nich razem z modułem,
          który takich kluczy potrzebuje. Do tego czasu nic tu nie zapisuje i nie udaje,
          że zapisało.
        </p>
      </section>

      <p>
        <Link
          href="/settings"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] px-2 text-[var(--bengos-accent)]"
        >
          Wróć do ustawień
        </Link>
      </p>
    </div>
  );
}
