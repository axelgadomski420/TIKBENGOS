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
        <p className="mt-3 text-[var(--bengos-text-muted)]">
          Po zalogowaniu zobaczysz tu niedokończone projekty, wersje robocze, generacje muzyki
          i otwarte pull requesty.
        </p>
      ) : state.loading ? (
        <p className="mt-3 text-[var(--bengos-text-muted)]" role="status">
          Wczytuję niedokończone prace…
        </p>
      ) : state.error ? (
        <ContinueError error={state.error} onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <p className="mt-3 text-[var(--bengos-text-muted)]">
          Nie masz nic niedokończonego. Gdy zaczniesz wideo, utwór albo projekt, wróci tu,
          żebyś nie musiał go szukać.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {state.data.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex min-h-[var(--bengos-touch-target-min)] flex-col justify-center rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 py-2"
              >
                <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]">
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
      <p>{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-9 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)]"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
