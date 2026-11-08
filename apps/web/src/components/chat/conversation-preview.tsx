import Link from "next/link";

/**
 * Podgląd układu rozmowy — bez ani jednej wiadomości.
 *
 * ── PO CO PUSTY UKŁAD, A NIE TYLKO OPIS ─────────────────────────────────
 * Ekran zastępczy z listą planów mówi, CO powstanie. Nie mówi, jak to będzie
 * wyglądać — a to jest pytanie, na które właściciel produktu chce znać
 * odpowiedź wcześniej niż w Etapie 4. Ten komponent pokazuje szkielet
 * rozmowy: nagłówek, miejsce na wiadomości, pole do pisania.
 *
 * ── CZYM TO NIE JEST ────────────────────────────────────────────────────
 * Nie jest atrapą: nie ma tu ANI JEDNEJ zmyślonej wiadomości, żadnego
 * wymyślonego kontaktu i żadnego przycisku, który udaje działanie. Wszystko,
 * co widać, jest albo opisem tego, co przyjdzie, albo prawdziwym stanem
 * pustym. Pole do pisania jest wyłączone i mówi wprost dlaczego — pole,
 * które przyjmuje tekst i nic z nim nie robi, byłoby dokładnie tym, czego
 * brief zabrania.
 *
 * ── DLACZEGO WARTO TO ZOBACZYĆ TERAZ ────────────────────────────────────
 * Układ dwóch kolumn na szerokim ekranie i jednej na telefonie to decyzja,
 * którą trudno cofnąć po napisaniu logiki. Zobaczenie jej na tym etapie
 * kosztuje jeden komponent, a nie przepisanie modułu.
 */
export function ConversationPreview() {
  return (
    <section
      aria-labelledby="chat-layout"
      className="bengos-rise bengos-surface-card mx-auto max-w-2xl"
    >
      <p className="bengos-eyebrow">Układ, który przyjdzie w Etapie 4</p>
      <h2
        id="chat-layout"
        className="mt-1 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Rozmowa
      </h2>
      <p className="mt-2 text-[var(--bengos-text-muted)]">
        Poniżej jest szkielet ekranu rozmowy. Nie ma w nim żadnych wiadomości, bo żadnych
        nie ma — pokazujemy tylko, gdzie będą i jak będzie się po nich poruszać.
      </p>

      <div className="mt-4 grid gap-2">
        {/* Nagłówek rozmowy — nazwa i obecność. */}
        <div className="flex min-h-[var(--bengos-touch-target-min)] items-center gap-3 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 py-2">
          <span
            aria-hidden="true"
            className="size-9 shrink-0 rounded-full border border-dashed border-[var(--bengos-border-strong)]"
          />
          <span className="min-w-0 flex-1">
            <span className="block font-[var(--bengos-weight-medium)]">Nazwa rozmowy</span>
            <span className="block text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Obecność i licznik nieprzeczytanych dojdą razem z Etapem 4
            </span>
          </span>
        </div>

        {/*
          Pole wiadomości. `aria-disabled` zamiast `disabled` na kontenerze,
          bo to nie jest kontrolka, a obszar — a `disabled` na obszarze nie
          mówi czytnikowi nic sensownego.
        */}
        <div
          aria-disabled="true"
          className="rounded-[var(--bengos-radius-control)] border border-dashed border-[var(--bengos-border)] px-3 py-6 text-center"
        >
          <p className="text-[var(--bengos-text-muted)]">
            Tu pojawią się wiadomości — Twoje i rozmówcy, z czasem i stanem wysłania.
          </p>
          <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Wątek jest pusty, bo czat nie ma jeszcze żadnej logiki po stronie serwera.
          </p>
        </div>

        {/* Pole do pisania — wyłączone, z wyjaśnieniem. */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="chat-compose-preview" className="sr-only">
            Pole wiadomości w przygotowaniu
          </label>
          <input
            id="chat-compose-preview"
            type="text"
            disabled
            placeholder="Pisanie wiadomości dojdzie w Etapie 4"
            className="min-h-[var(--bengos-touch-target-min)] min-w-0 flex-1 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 text-[var(--bengos-text-muted)] disabled:opacity-70"
          />
          <button
            type="button"
            disabled
            className="bengos-touch-target rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 text-[var(--bengos-text-muted)] disabled:opacity-60"
          >
            Wyślij
          </button>
        </div>
      </div>

      <p className="mt-4 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Napisy, czytanie na głos, podgląd migowy i alerty Morse'a dołączą per rozmowa — każda
        z tych rzeczy osobno, do włączenia i wyłączenia.
      </p>

      <p className="mt-3">
        <Link
          href="/access"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
        >
          Co dołoży moduł Access
        </Link>
      </p>
    </section>
  );
}
