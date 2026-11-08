import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "BENGOS Marketplace" };

/**
 * Katalog marketplace.
 *
 * Filtry po stronie serwera (parametry w adresie).
 * Cena w groszach — konwersja do wyświetlania w jednym miejscu.
 * Płatność na razie manual — interfejs mówi o tym wprost.
 */
export default function MarketPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-[var(--bengos-weight-semibold)] tracking-tight text-[var(--bengos-text)]">
          Marketplace
        </h1>
        <p className="max-w-2xl text-[var(--bengos-text-muted)]">
          Presety, dźwięki, szablony wideo, modele i projekty kodu stworzone w Studio.
          Jedno konto, jedna tożsamość.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {["Wszystko", "preset", "sound", "music", "video-template", "code-project"].map((k) => (
          <Link
            key={k}
            href={k === "Wszystko" ? "/market" : `/market?kind=${k}`}
            className="bengos-touch-target rounded-full border border-[var(--bengos-border)] px-4 py-1.5 text-sm transition-colors hover:border-[var(--bengos-accent)] hover:text-[var(--bengos-accent)]"
          >
            {k}
          </Link>
        ))}
      </div>

      <section className="bengos-surface-card mx-auto max-w-2xl text-center">
        <h2 className="text-xl font-[var(--bengos-weight-medium)]">Katalog powstaje</h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Modele i endpointy są gotowe. Po wdrożeniu magazynu obiektów i decyzji o płatnościach
          pojawią się pierwsze przedmioty. Na razie rozliczenie ręczne (provider: manual).
        </p>
        <Link
          href="/studio"
          className="bengos-touch-target mt-6 inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-6 py-3 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Stwórz coś w Studio
        </Link>
      </section>
    </div>
  );
}
