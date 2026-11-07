"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Announcement } from "@/components/announcement";
import { completeOAuth } from "@/lib/oauth-client";

/**
 * Dokończenie logowania przez dostawcę — gdy dostawca odsyła na interfejs.
 *
 * ── PO CO DRUGA DROGA POWROTU ───────────────────────────────────────────
 * Właściwy adres zwrotny to `/api/auth/oauth/{dostawca}/callback`, a tę trasę
 * obsługuje przekierowanie w `apps/web/src/app/api/auth/oauth/`. Ten ekran
 * jest zabezpieczeniem na wypadek, gdyby w panelu dostawcy wpisano adres
 * wskazujący na `/auth/callback` — czyli o jeden segment za daleko.
 *
 * Ma to znaczenie praktyczne: przy pierwszym podłączeniu Google bardzo łatwo
 * wpisać adres nie ten, a wtedy użytkownik trafia na ekran, którego nie ma.
 * Ten plik sprawia, że trafia na działający — z komunikatem, jeśli wymiana
 * się nie uda.
 *
 * Token i ciasteczka NIE są tu przechowywane: cała wymiana idzie przez
 * `apiFetch`, a sesja ląduje w ciasteczku HttpOnly ustawionym przez Django.
 */
export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Dokańczam logowanie…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const denied = searchParams.get("error");
    const provider = searchParams.get("provider") ?? "google";

    if (denied || !code || !state) {
      setFailed(true);
      setMessage(
        denied
          ? "Dostawca nie potwierdził logowania. Wróć na ekran logowania i spróbuj ponownie."
          : "Brakuje danych od dostawcy. Wróć na ekran logowania i spróbuj ponownie.",
      );
      return;
    }

    let cancelled = false;
    completeOAuth(provider, code, state)
      .then(() => {
        if (!cancelled) window.location.assign("/");
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setMessage("Nie udało się dokończyć logowania. Wróć na ekran logowania i spróbuj ponownie.");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <section aria-labelledby="auth-callback" className="bengos-surface-card">
        <Announcement message={message} />
        <h1
          id="auth-callback"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Logowanie
        </h1>
        <p className="mt-2 text-[var(--bengos-text-muted)]">{message}</p>
        {failed ? (
          <a
            href="/login"
            className="bengos-touch-target mt-4 inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
          >
            Wróć do logowania
          </a>
        ) : null}
      </section>
    </div>
  );
}
