"use client";

import Link from "next/link";

import { ROLE_LABELS } from "@bengos/core";

import { useSession } from "@/lib/session-context";

/**
 * Pasek tożsamości.
 *
 * Pokazuje rolę tylko wtedy, gdy użytkownik ma więcej niż jedną — dla
 * zwykłego konta napis „Użytkownik” jest szumem, który nic nie wnosi.
 */
export function IdentityBar() {
  const { identity, isAuthenticated } = useSession();

  if (!isAuthenticated || !identity) {
    return (
      <section aria-label="Tożsamość" className="bengos-surface-card flex flex-wrap items-center gap-3">
        <p className="flex-1">
          Nie jesteś zalogowany. Możesz się rozejrzeć, ale tworzenie, czat i kod wymagają konta.
        </p>
        <Link
          href="/login"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 text-[var(--bengos-text-on-accent)]"
        >
          Zaloguj się
        </Link>
      </section>
    );
  }

  const extraRoles = identity.roles.filter((role) => role !== "user");
  const shownName = identity.displayName ?? identity.username;

  return (
    <section aria-label="Tożsamość" className="bengos-surface-card flex flex-wrap items-center gap-3">
      <div className="flex-1">
        <p className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          {shownName}
        </p>
        <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          @{identity.username}
          {extraRoles.length > 0
            ? ` · ${extraRoles.map((role) => ROLE_LABELS[role]).join(", ")}`
            : ""}
        </p>
      </div>

      <Link
        href="/studio"
        className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
      >
        Twórz
      </Link>
      <Link
        href="/profile"
        className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
      >
        Profil
      </Link>
    </section>
  );
}
