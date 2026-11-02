import type { Metadata } from "next";
import Link from "next/link";

import { RealtimeIndicator } from "@/components/realtime-indicator";

export const metadata: Metadata = { title: "Bez połączenia" };

/**
 * Ekran bez połączenia.
 *
 * Jedna zasada: nie udajemy treści. Aplikacja instalowalna offline musi
 * powiedzieć, co jest niedostępne i dlaczego, a nie pokazywać pustego ekranu
 * albo — gorzej — nieaktualne dane bez ostrzeżenia.
 *
 * Lista mówi, co dzieje się offline TERAZ, a co dopiero będzie. „Cały
 * interfejs” jest tu prawdą: powłoka, motywy i nawigacja renderują się
 * z bundla, więc offline nie jest to pusta strona.
 */
const ITEMS = [
  "Teraz offline działa cały interfejs: motywy, ustawienia dostępności i nawigacja",
  "Feed zacznie działać offline po Etapie 2 — wideo, które już obejrzałeś, będzie dostępne bez sieci",
  "Czat z kolejką wiadomości do wysłania po odzyskaniu połączenia — Etap 4",
];

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
        Nie ma połączenia
      </h1>
      <p className="mt-3 text-[var(--bengos-text-muted)]">
        Aplikacja działa dalej — motywy, ustawienia i nawigacja są dostępne bez sieci. Treści,
        które wymagają serwera, pojawią się po odzyskaniu połączenia.
      </p>

      <div className="bengos-surface-card mt-6">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Co działa, a co nie
        </h2>
        <ul className="mt-4 space-y-2">
          {ITEMS.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-[var(--bengos-accent)]">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bengos-surface-card mt-6">
        <h2 className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Stan kanału czasu rzeczywistego
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Kanał potrzebuje sieci, więc offline nie będzie połączony. Ten wskaźnik mówi,
          czy aplikacja próbuje się połączyć po odzyskaniu sieci.
        </p>
        <div className="mt-3">
          <RealtimeIndicator />
        </div>
      </div>

      <p className="mt-6">
        <Link
          href="/"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] px-4 text-[var(--bengos-accent)]"
        >
          Wróć do BENGOS Home
        </Link>
      </p>
    </div>
  );
}
