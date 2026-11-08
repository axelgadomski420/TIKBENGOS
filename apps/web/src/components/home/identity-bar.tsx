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
 * ── AWATAR Z LITERY, GDY NIE MA ZDJĘCIA ────────────────────────────────
 * Karta była wcześniej samym tekstem i wyglądała jak notatka, a nie jak
 * miejsce, w którym jesteś. Kółko z pierwszą literą nazwy pełni rolę
 * awatara, gdy użytkownik nie ma wgranej grafiki — nie udaje zdjęcia,
 * pokazuje literę. Gdy `avatarUrl` istnieje, pokazujemy obraz.
 *
 * ── TARCZE ZE ZNAKAMI PRZY AKCJACH ─────────────────────────────────────
 * „Twórz” i „Profil” to jedyne akcje na tej karcie, a były samym tekstem
 * w prostokącie. Teraz mają tarczę ze znakiem — ten sam język co menu
 * główne, obie nawigacje i karta „Stwórz teraz”.
 */

type IconProps = { className?: string };

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconStudio({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="m16 10 4-2.5v9L16 14" />
    </svg>
  );
}

function IconProfile({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="9" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

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
          className="bengos-touch-target inline-flex gap-2 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Zaloguj się
        </Link>
      </section>
    );
  }

  const extraRoles = identity.roles.filter((role) => role !== "user");
  const shownName = identity.displayName ?? identity.username;
  const initial = shownName.trim().charAt(0).toUpperCase() || "?";

  return (
    <section
      aria-label="Tożsamość"
      className="bengos-surface-card flex flex-wrap items-center gap-x-4 gap-y-3"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)] text-[var(--bengos-accent)]"
      >
        {identity.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={identity.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
      </span>

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
        className="bengos-touch-target gap-2 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 hover:border-[var(--bengos-border-strong)]"
      >
        <IconStudio className="size-4" />
        Twórz
      </Link>
      <Link
        href="/profile"
        className="bengos-touch-target gap-2 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 hover:border-[var(--bengos-border-strong)]"
      >
        <IconProfile className="size-4" />
        Profil
      </Link>
    </section>
  );
}
