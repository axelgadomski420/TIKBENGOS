import type { Metadata } from "next";
import Link from "next/link";

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
 *
 * ── PLAN W KAFLACH, JAK W POZOSTAŁYCH MODUŁACH ──────────────────────────
 * Ten ekran był jedynym, który wypisywał plan listą punktowaną z myślnikami.
 * Efekt był taki, że Profile czytał się jak notatka, a nie jak ekran modułu —
 * mimo że opisuje dokładnie ten sam rodzaj zapowiedzi co Feed czy Studio.
 * Teraz używa tego samego układu co reszta, więc „moduł w przygotowaniu”
 * wygląda w całej aplikacji tak samo.
 *
 * Zdanie o etapie też było ucięte — kończyło się na „co ten ekran będzie
 * zawierał”, bez dokończenia myśli. Tu jest pełne.
 */
const PLANNED = [
  "Profil publiczny: nazwa, awatar, biografia, witryna, liczniki",
  "Twoja twórczość: wideo, utwory, posty, projekty kodu",
  "Ustawienia asystenta",
  "Historia aktywności i osiągnięcia",
];

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="bengos-eyebrow">Etap 2 rozbudowuje ten ekran</p>
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
          co ten ekran będzie zawierał po ukończeniu Etapu 2.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {PLANNED.map((item) => (
            <li
              key={item}
              className="flex min-h-[var(--bengos-touch-target-min)] items-center rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 py-2 text-[var(--bengos-size-caption)]"
            >
              <span className="text-[var(--bengos-accent)]" aria-hidden="true">
                •{" "}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p>
        <Link
          href="/settings"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
        >
          Przejdź do ustawień
        </Link>
      </p>
    </div>
  );
}
