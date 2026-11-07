"use client";

import Link from "next/link";

import { ROLE_LABELS } from "@bengos/core";

import { useSession } from "@/lib/session-context";

/**
 * Pasek tożsamości.
 *
 * Pokazuje rolę tylko wtedy, gdy użytkownik ma więcej niż jedną — dla
 * zwykłego konta napis „Użytkownik” jest szumem, który nic nie wnosi.
 *
 * ── NAZWA JEST NAJWIĘKSZYM ELEMENTEM, ALE NIE NAGŁÓWKIEM ────────────────
 * Imię stoi wyżej niż reszta tekstu w karcie, bo odpowiada na pytanie
 * „kto tu jest” zanim użytkownik zada je sobie sam. Nie jest jednak
 * nagłówkiem `h2` — nagłówki opisują strukturę ekranu, a nazwa użytkownika
 * strukturą nie jest. Czytnik ekranu ma dostać sekcję „Tożsamość”
 * z `aria-label`, a nie kolejny nagłówek w spisie treści.
 *
 * ── BEZ SESJI: JEDNO WYJŚCIE ──────────────────────────────────────────
 * Stan bez konta mówi wprost, co wolno bez zalogowania, i daje jedno
 * wyjście: logowanie. Drugi odnośnik do pulpitu byłby tu zbędny, bo
 * użytkownik właśnie na pulpicie stoi.
 */
export function IdentityBar() {
  const { identity, isAuthenticated } = useSession();

  if (!isAuthenticated || !identity) {
    return (
      <section
        aria-label="Tożsamość"
        className="bengos-surface-card flex flex-wrap items-center gap-x-4 gap-y-3"
      >
        <div className="min-w-0 flex-1">
          <p className="bengos-eyebrow">Nie zalogowano</p>
          <p className="mt-1 text-[var(--bengos-text-muted)]">
            Możesz się rozejrzeć po module. Tworzenie, czat i praca nad kodem wymagają konta —
            jedno dla całego BENGOS.
          </p>
        </div>
        <Link
          href="/login"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Zaloguj się
        </Link>
      </section>
    );
  }

  const extraRoles = identity.roles.filter((role) => role !== "user");
  const shownName = identity.displayName ?? identity.username;

  return (
    <section
      aria-label="Tożsamość"
      className="bengos-surface-card flex flex-wrap items-center gap-x-4 gap-y-3"
    >
      <div className="min-w-0 flex-1">
        {/*
          `truncate` na nazwie jest tu konieczne, a nie kosmetyczne: nazwa
          użytkownika ma limit 150 znaków w modelu, a karta ma stałą
          szerokość. Bez ucięcia długa nazwa rozepchnęłaby przyciski poza
          ekran na telefonie — a `title` zostawia do niej dostęp.
        */}
        <p
          className="truncate text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
          title={shownName}
        >
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
        className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
      >
        Twórz
      </Link>
      <Link
        href="/profile"
        className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 hover:border-[var(--bengos-border-strong)]"
      >
        Profil
      </Link>
    </section>
  );
}
