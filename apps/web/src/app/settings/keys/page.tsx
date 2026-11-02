import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Klucze API" };

/**
 * Ekran kluczy API.
 *
 * Reguła jest jedna i nie podlega negocjacji: klucz pokazuje się dokładnie
 * raz, przy zapisie, i nigdy potem. Serwer nie ma endpointu, który go zwraca,
 * a interfejs nie ma gdzie go pokazać. To nie ostrożność — to jedyny sposób,
 * żeby wyciek klucza wymagał dostępu do bazy, a nie do ekranu.
 */
export default function ApiKeysPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
          Klucze API
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Klucze są szyfrowane i nigdy nie opuszczają serwera w odpowiedzi. Zapisany klucz
          pokazuje się raz — potem widać już tylko jego ostatnie cztery znaki.
        </p>
      </header>

      <section aria-labelledby="keys-title" className="bengos-surface-card">
        <h2 id="keys-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Zarządzanie kluczami powstaje w Etapie 5
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Model kluczy i jego reguły są już opisane w kontrakcie, ale zapisywanie i używanie
          kluczy uruchomi się razem z modułami, które z nich korzystają. Do tego czasu ten ekran
          nic nie zapisuje i nie udaje, że zapisał.
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
