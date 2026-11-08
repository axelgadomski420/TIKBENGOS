"use client";

import Link from "next/link";

import { ROLE_LABELS } from "@bengos/core";

import { useSession } from "@/lib/session-context";

/**
 * Powitanie po założeniu konta.
 *
 * ── PO CO TO JEST ────────────────────────────────────────────────────────
 * Rejestracja kończyła się przeładowaniem na pulpit i ciszą. Użytkownik
 * nie wiedział, czy konto naprawdę powstało, ani jakim uchwytem się loguje —
 * a uchwyt zapamiętuje się raz i potem się nim posługuje. Ten pasek mówi
 * jedno zdanie: „konto jest twoje, oto ono”.
 *
 * ── DLACZEGO TO NIE WITA ZA KAŻDYM RAZEM ────────────────────────────────
 * Widnieje tylko wtedy, gdy w adresie jest `?welcome=1`, czyli dokładnie
 * raz — bezpośrednio po założeniu konta. Pasek, który wita przy każdym
 * wejściu na pulpit, przestaje być informacją i staje się szumem, który
 * trzeba zamykać.
 *
 * ── ROLA PISANA NAZWĄ, NIE IDENTYFIKATOREM ──────────────────────────────
 * `effective_roles()` zwraca identyfikatory (`user`, `creator`, …), a brief
 * nazywa role po ludzku („Użytkownik”, „Twórca”). Etykieta idzie z
 * `ROLE_LABELS` w kontrakcie — jednego źródła prawdy, a nie drugiej mapy,
 * która rozjedzie się przy dołożeniu roli.
 */
export function WelcomeBanner() {
  const { identity, isAuthenticated } = useSession();

  if (!isAuthenticated || !identity) return null;

  const shownName = identity.displayName ?? identity.username;
  const extraRoles = identity.roles.filter((role) => role !== "user");

  return (
    <section aria-labelledby="welcome-heading" className="bengos-rise bengos-surface-card">
      <p className="bengos-eyebrow text-[var(--bengos-accent)]">Konto gotowe</p>
      <h2
        id="welcome-heading"
        className="mt-1 text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]"
      >
        Cześć, {shownName}.
      </h2>
      <p className="mt-1 text-[var(--bengos-text-muted)]">
        Logujesz się jako{" "}
        <span className="font-[var(--bengos-weight-medium)]">@{identity.username}</span>. Jeden
        uchwyt obsługuje wszystkie moduły — feed, studio, czat, asystenta i dev.
      </p>

      {extraRoles.length > 0 ? (
        <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Twoje role: {identity.roles.map((role) => ROLE_LABELS[role]).join(" · ")}
        </p>
      ) : null}

      <p className="mt-4">
        <Link
          href="/profile"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 text-[var(--bengos-accent)] hover:border-[var(--bengos-accent)]"
        >
          Zobacz swój profil
        </Link>
      </p>
    </section>
  );
}
