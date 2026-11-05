"use client";

import Link from "next/link";

import type { ApiError } from "@bengos/core";

import { apiFetch, useAsync } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

interface ContinueItem {
  id: string;
  kind: "video" | "music" | "post" | "pull-request";
  title: string;
  href: string;
  updatedAt: string;
}

const KIND_LABELS: Record<ContinueItem["kind"], string> = {
  video: "Wideo",
  music: "Muzyka",
  post: "Post",
  "pull-request": "Pull request",
};

/**
 * Karta „Kontynuuj”.
 *
 * Najważniejsza karta na pulpicie i dlatego jedyna, która ma własny stan
 * pusty oraz własne ponowienie. Pula niedokończonej pracy to cała wartość
 * pulpitu: użytkownik, który wraca, chce zobaczyć, co zostawił, a nie
 * kolejny raz to samo wideo.
 *
 * ── STANY MAJĄ WSPÓLNY KSZTAŁT ─────────────────────────────────────────
 * Ładowanie, pustka i błąd to trzy odpowiedzi na to samo pytanie, więc stoją
 * w tym samym miejscu i mają tę samą wagę typograficzną. Wcześniej były
 * zwykłym akapitem, przez co „Wczytuję…” wyglądało jak treść, którą ktoś
 * zdążył napisać. Teraz stan ma podpis i zdanie — widać, że to odpowiedź
 * systemu, a nie dane.
 *
 * `role="status"` jest na wszystkich trzech, bo każda z nich zmienia się
 * w odpowiedzi na akcję użytkownika (wejście na ekran, ponowienie).
 */
export function ContinueCard() {
  const { isAuthenticated } = useSession();

  const state = useAsync<ContinueItem[]>(
    (signal) => apiFetch<ContinueItem[]>("/api/feed/continue", { signal }),
    [isAuthenticated],
    isAuthenticated,
  );

  return (
    <section aria-labelledby="continue" className="bengos-surface-card">
      <h2
        id="continue"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Kontynuuj
      </h2>

      {!isAuthenticated ? (
        <StateBlock
          eyebrow="Wymaga konta"
          text="Po zalogowaniu zobaczysz tu niedokończone projekty, wersje robocze, generacje muzyki i otwarte pull requesty."
          action={{ href: "/login", label: "Zaloguj się" }}
        />
      ) : state.loading ? (
        <StateBlock eyebrow="Wczytuję" text="Zbieram niedokończone prace…" />
      ) : state.error ? (
        <ContinueError error={state.error} onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <StateBlock
          eyebrow="Pusto"
          text="Nie masz nic niedokończonego. Gdy zaczniesz wideo, utwór albo projekt, wróci tu, żebyś nie musiał go szukać."
          action={{ href: "/studio", label: "Zacznij coś" }}
        />
      ) : (
        <ul className="mt-3 -mx-2">
          {state.data.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex min-h-[var(--bengos-touch-target-min)] flex-col justify-center rounded-[var(--bengos-radius-control)] px-2 py-2.5 transition-colors duration-[var(--bengos-motion-fast)] hover:bg-[var(--bengos-surface-sunken)]"
              >
                <span className="bengos-eyebrow text-[var(--bengos-accent)]">
                  {KIND_LABELS[item.kind]}
                </span>
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Wspólny kształt odpowiedzi systemu: podpis, zdanie i opcjonalne wyjście.
 *
 * Wyjście jest tu istotne z tego samego powodu, dla którego `error.tsx` ma
 * przycisk ponowienia: stan bez drogi wyjścia to ślepy zaułek. Pustka bez
 * „zacznij coś” zostawia użytkownika z informacją i bez ruchu.
 */
function StateBlock({
  eyebrow,
  text,
  action,
}: {
  eyebrow: string;
  text: string;
  action?: { href: string; label: string };
}) {
  return (
    <div role="status" className="mt-3">
      <p className="bengos-eyebrow">{eyebrow}</p>
      <p className="mt-1 text-[var(--bengos-text-muted)]">{text}</p>
      {action ? (
        <Link
          href={action.href}
          className="bengos-touch-target mt-2 inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Błąd z ponowieniem. Nie chowamy go w cichy komunikat — jeżeli dane się nie
 * wczytały, użytkownik ma to wiedzieć i mieć czym spróbować ponownie.
 * „Coś poszło nie tak” bez przycisku to ślepy zaułek.
 */
function ContinueError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-3 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-4 py-3"
    >
      <p className="bengos-eyebrow text-[var(--bengos-danger)]">Nie udało się wczytać</p>
      <p className="mt-1">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-[var(--bengos-touch-target-min)] rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)]"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
