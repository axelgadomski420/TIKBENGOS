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

  return (
    <p role="status" aria-live="polite" className={`text-[var(--bengos-size-caption)] ${tone}`}>
      {label}
    </p>
  );
}
