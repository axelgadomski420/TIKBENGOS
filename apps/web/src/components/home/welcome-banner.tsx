"use client";

import Link from "next/link";

import { ROLE_LABELS } from "@bengos/core";

import { useSession } from "@/lib/session-context";

/**
 * Pasek tożsamości na pulpicie — pierwsza rzecz po zalogowaniu.
 *
 * ── PO CO TO JEST ────────────────────────────────────────────────────────
 * Po zalogowaniu użytkownik lądował na ekranie, który wyglądał niemal
 * identycznie jak logowanie: ten sam tygrys w tym samym okręgu, ten sam
 * napis BENGOS nad nim. Bez tego paska nie było sposobu odróżnić „jestem
 * w środku” od „jestem na ekranie wejścia” inaczej niż po siatce kafli
 * pod zgięciem — a to jest za późno.
 *
 * Pasek mówi jedno zdanie: „konto jest twoje, oto ono”. Pokazuje nazwę
 * i uchwyt, bo uchwyt zapamiętuje się raz i potem się nim posługuje.
 *
 * ── DLACZEGO TO NIE JEST POWITANIE ZA KAŻDYM RAZEM ─────────────────────
 * Nagłówek stoi tu ZAWSZE (to potwierdzenie tożsamości i pierwsza rzecz,
 * której szuka oko), ale pełne powitanie z odsyłaczem do profilu pojawia
 * się TYLKO raz — gdy w adresie jest `?welcome=1`, czyli bezpośrednio po
 * założeniu konta. Witanie przy każdym wejściu na pulpit przestaje być
 * informacją, a staje się szumem, który trzeba zamykać.
 *
 * ── ROLA PISANA NAZWĄ, NIE IDENTYFIKATOREM ──────────────────────────────
 * `identity.roles` zwraca identyfikatory (`user`, `creator`, …), a brief
 * nazywa role po ludzku („Użytkownik”, „Twórca”). Etykieta idzie z
 * `ROLE_LABELS` w kontrakcie — jednego źródła prawdy, a nie drugiej mapy,
 * która rozjedzie się przy dołożeniu roli.
 */
export function WelcomeBanner() {
  const { identity, isAuthenticated } = useSession();

  // Bez sesji paska nie ma — na pulpicie nie da się wtedy być, a pusty
  // kontener byłby śmieciem w drzewie dostępności.
  if (!isAuthenticated || !identity) return null;

  const shownName = identity.displayName ?? identity.username;
  const extraRoles = identity.roles.filter((role) => role !== "user");

  // Nowe konto wraca z `?welcome=1` — wtedy pasek mówi więcej i daje
  // odsyłacz do profilu. Przy zwykłym wejściu zostaje sam nagłówek.
  const isFreshAccount =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("welcome") === "1";

  return (
    <section aria-labelledby="welcome-heading" className="bengos-rise bengos-surface-card">
      <p className="bengos-eyebrow text-[var(--bengos-accent)]">
        {isFreshAccount ? "Konto gotowe" : "Jesteś w środku"}
      </p>
      <h2
        id="welcome-heading"
        className="mt-1 text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]"
      >
        {isFreshAccount ? `Cześć, ${shownName}.` : shownName}{" "}
        <span className="text-[var(--bengos-text-muted)]">@{identity.username}</span>
      </h2>

      {isFreshAccount ? (
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Jeden uchwyt obsługuje wszystkie moduły — feed, studio, czat, asystenta i dev.
        </p>
      ) : null}

      {extraRoles.length > 0 ? (
        <p className="mt-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Twoje role: {identity.roles.map((role) => ROLE_LABELS[role]).join(" · ")}
        </p>
      ) : null}

      {isFreshAccount ? (
        <p className="mt-4">
          <Link
            href="/profile"
            className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 text-[var(--bengos-accent)] hover:border-[var(--bengos-accent)]"
          >
            Zobacz swój profil
          </Link>
        </p>
      ) : null}
    </section>
  );
}
