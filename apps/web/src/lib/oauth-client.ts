"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";

/**
 * Klient logowania przez dostawcę zewnętrznego.
 *
 * ── DWA ADRESY ZWROTNE, KTÓRE ŁATWO POMYLIĆ ─────────────────────────────
 * Logowanie OAuth ma dwa adresy zwrotne i leżą w dwóch różnych miejscach:
 *
 * 1. `redirect_uri` u dostawcy — dokąd dostawca odsyła PRZEGLĄDARKĘ
 *    z kodem. To adres z `OAUTH_REDIRECT_BASE` w ustawieniach API, czyli
 *    `{adres aplikacji}/api/auth/oauth/google/callback`.
 *
 * 2. `redirect_uri` w wymianie kodu — co serwer podaje dostawcy, żeby
 *    dostać token. Musi być IDENTYCZNY z pierwszym, inaczej Google
 *    odpowiada `redirect_uri_mismatch`.
 *
 * Pierwszy musi trafiać do API, a nie do interfejsu: pod tym adresem nie ma
 * żadnej strony Next.js. Dlatego trasa w `apps/web` przepisuje ten prefiks
 * wprost do Django.
 *
 * ── LISTA DOSTAWCÓW POCHODZI Z SERWERA ──────────────────────────────────
 * Przyciski rysuje lista z `GET /api/auth/oauth/providers`. Dzięki temu
 * ekran nie pokazuje przycisku dla dostawcy, którego serwer nie obsługuje —
 * nie ma tu żadnej stałej z nazwami dostawców.
 */

export interface OAuthProvider {
  id: string;
  label: string;
  configured: boolean;
}

/** Lista dostawców dostępnych na tym serwerze. */
export function useOAuthProviders(): { providers: OAuthProvider[] } {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<OAuthProvider[]>("/api/auth/oauth/providers")
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        // Brak listy to nie awaria ekranu — formularz z hasłem działa dalej.
        // Pokazujemy zero przycisków zewnętrznych, a nie komunikat błędu nad
        // czymś, co nie jest potrzebne do zalogowania się.
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { providers };
}

/**
 * Zaczyna logowanie: prosi serwer o adres autoryzacji i przechodzi pod niego.
 *
 * `window.location.assign`, a nie `fetch` z przekierowaniem: potrzebujemy
 * pełnego przejścia, bo dostawca ustawia własne ciasteczka i wraca osobnym
 * adresem. Żądanie w tle nie przeniosłoby tego.
 */
export function useOAuthStart() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const start = useCallback(async (provider: string) => {
    setBusy(provider);
    setError(null);
    try {
      const { authorizeUrl } = await apiFetch<{ authorizeUrl: string }>(
        `/api/auth/oauth/${provider}/start`,
        { method: "POST" },
      );
      window.location.assign(authorizeUrl);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się zacząć logowania." },
      );
      setBusy(null);
    }
  }, []);

  return { start, busy, error };
}

/**
 * Kończy logowanie: wymienia kod na sesję.
 *
 * `code` i `state` idą w adresie, bo tak czyta je django-ninja
 * — patrz `oauth_callback` w `services/api/accounts/oauth.py`.
 */
export async function completeOAuth(
  provider: string,
  code: string,
  state: string,
): Promise<void> {
  const query = new URLSearchParams({ code, state }).toString();
  await apiFetch(`/api/auth/oauth/${provider}/callback?${query}`, { method: "POST" });
}
