"use client";

import { useRealtime } from "@/lib/realtime-client";
import { useSession } from "@/lib/session-context";

/**
 * Wskaźnik połączenia czasu rzeczywistego.
 *
 * Istnieje z jednego powodu: kanał WebSocket działał po stronie serwera, ale
 * nic go nie otwierało, więc nie było sposobu stwierdzić, czy w ogóle się
 * łączy. Ten element pokazuje stan wprost.
 *
 * Stany są rozróżnione, a nie sprowadzone do „działa / nie działa”:
 * brak sesji to nie to samo co brak konfiguracji, a zerwane połączenie
 * to nie to samo co trwała niedostępność. Użytkownik ma widzieć różnicę.
 *
 * Komunikat idzie przez `role="status"`, więc czytnik ekranu ogłosi zmianę
 * bez przerywania tego, co użytkownik właśnie czyta — `alert` byłby tu
 * za mocny dla informacji, która nie wymaga natychmiastowej reakcji.
 *
 * ── STAN MA ZNAK, NIE TYLKO KOLOR ──────────────────────────────────────
 * Wcześniej jedynym wyróżnikiem stanu był kolor tekstu. Kolor działa tylko
 * dla kogoś, kto odróżnia zieleń od pomarańczu. Znak na początku jest
 * czytelny bez koloru, a dla czytnika jest dekoracją (`aria-hidden`), bo
 * zdanie i tak niesie całą informację.
 */
export function RealtimeIndicator() {
  const { isAuthenticated } = useSession();
  const { status } = useRealtime(isAuthenticated);

  const label = {
    idle: "Kanał czasu rzeczywistego nieaktywny — brak sesji.",
    connecting: "Łączę kanał czasu rzeczywistego…",
    open: "Kanał czasu rzeczywistego połączony.",
    closed: "Kanał czasu rzeczywistego zerwany — próbuję ponownie.",
    unavailable: "Kanał czasu rzeczywistego nieskonfigurowany — brak NEXT_PUBLIC_REALTIME_URL.",
  }[status];

  const tone =
    status === "open"
      ? "text-[var(--bengos-success)]"
      : status === "closed" || status === "unavailable"
        ? "text-[var(--bengos-warning)]"
        : "text-[var(--bengos-text-muted)]";

  const mark =
    status === "open"
      ? "●"
      : status === "connecting"
        ? "◐"
        : status === "closed" || status === "unavailable"
          ? "▲"
          : "○";

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-baseline gap-2 text-[var(--bengos-size-caption)] ${tone}`}
    >
      <span aria-hidden="true">{mark}</span>
      <span>{label}</span>
    </p>
  );
}
