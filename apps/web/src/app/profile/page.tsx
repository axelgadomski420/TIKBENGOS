import type { Metadata } from "next";

import { ProfileIdentity } from "@/components/profile/profile-identity";

export const metadata: Metadata = { title: "BENGOS Profile" };

/**
 * Ekran profilu.
 *
 * Moduł należy do Etapu 2, więc jego pełna treść — twórczość, projekty,
 * osiągnięcia — jeszcze nie istnieje. Jest jednak jedna rzecz, która należy
 * do Etapu 1 i już działa: tożsamość z sesji. Pokazujemy ją, żeby dało się
 * sprawdzić, że logowanie naprawdę działa, a nie tylko nie zwraca błędu.
 *
 * Reszta jest wypisana jako plan, bo taki jest stan — nie ma tu atrapy
 * liczników ani zmyślonych danych.
 */
export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-[var(--bengos-size-caption)] uppercase tracking-wide text-[var(--bengos-text-muted)]">
          Etap 2 rozbudowuje ten ekran
        </p>
        <h1 className="mt-2 text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
          BENGOS Profile
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Tożsamość, twórczość, projekty i ustawienia asystenta. Jedno konto dla wszystkich
          modułów — rola i zgody, nie drugie konto.
        </p>
      </header>

      <ProfileIdentity />

      <section aria-labelledby="profile-plan" className="bengos-surface-card">
        <h2
          id="profile-plan"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Co dołoży Etap 2
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Nic z tego jeszcze nie działa i nie udajemy, że działa. Poniżej jest dokładnie to,
          co ten ekran będzie zawierał.
        </p>
        <ul className="mt-4 space-y-2">
          {[
            "Profil publiczny: nazwa, awatar, biografia, witryna, liczniki",
            "Twoja twórczość: wideo, utwory, posty, projekty kodu",
            "Ustawienia asystenta",
            "Historia aktywności i osiągnięcia",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-[var(--bengos-accent)]">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
