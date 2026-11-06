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
 *
 * ── PIERWSZA POZYCJA JEST FAKTEM, RESZTA ZAPOWIEDZIĄ ────────────────────
 * „Działa teraz” i „zadziała w późniejszym etapie” wyglądały identycznie,
 * mimo że znaczą coś zupełnie innego. Teraz pierwsza pozycja jest oznaczona
 * jako stan bieżący, a pozostałe noszą numer etapu — widać różnicę przed
 * przeczytaniem zdania, nie po.
 */
const ITEMS: { text: string; stage: number | null }[] = [
  {
    text: "Cały interfejs: motywy, ustawienia dostępności i nawigacja",
    stage: null,
  },
  {
    text: "Feed — wideo, które już obejrzałeś, będzie dostępne bez sieci",
    stage: 2,
  },
  {
    text: "Czat — kolejka wiadomości do wysłania po odzyskaniu połączenia",
    stage: 4,
  },
];

export default function OfflinePage() {
  return (
    <div className="bengos-rise mx-auto max-w-2xl">
      <p className="bengos-eyebrow">Bez sieci</p>
      <h1 className="mt-2 text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)]">
        Nie ma połączenia
      </h1>
      <p className="mt-3 text-[var(--bengos-text-muted)]">
        Aplikacja działa dalej — motywy, ustawienia i nawigacja są dostępne bez sieci. Treści,
        które wymagają serwera, pojawią się po odzyskaniu połączenia.
      </p>

      <section aria-labelledby="offline-what" className="bengos-surface-card mt-6">
        <h2
          id="offline-what"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Co działa, a co nie
        </h2>
        <ul className="mt-3 -mx-2">
          {ITEMS.map((item) => (
            <li key={item.text}>
              <div className="bengos-row flex min-h-[var(--bengos-touch-target-min)] items-center gap-3 px-2" >
                <span
                  aria-hidden="true"
                  className={
                    item.stage === null
                      ? "text-[var(--bengos-success)]"
                      : "text-[var(--bengos-text-muted)]"
                  }
                >
                  {item.stage === null ? "●" : "○"}
                </span>
                <span className="flex-1">{item.text}</span>
                <span className="bengos-eyebrow shrink-0">
                  {item.stage === null ? "teraz" : `Etap ${item.stage}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="offline-realtime" className="bengos-surface-card mt-6">
        <h2
          id="offline-realtime"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Stan kanału czasu rzeczywistego
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Kanał potrzebuje sieci, więc offline nie będzie połączony. Ten wskaźnik mówi,
          czy aplikacja próbuje się połączyć po odzyskaniu sieci.
        </p>
        <div className="mt-3">
          <RealtimeIndicator />
        </div>
      </section>

      <p className="mt-6">
        <Link
          href="/"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
        >
          Wróć do BENGOS Home
        </Link>
      </p>
    </div>
  );
}
