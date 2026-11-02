"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@bengos/core";

/**
 * Klient API.
 *
 * Trzy rzeczy i nic więcej: składa żądanie, przekłada odpowiedź błędu na
 * współny kształt `ApiError` i pilnuje, żeby żądanie nie wisiało bez końca.
 * Świadomie bez automatycznych powtórzeń — cicha ponowna próba ukrywa przed
 * użytkownikiem to, że coś nie działa, a to jest dokładnie ten błąd, którego
 * ten projekt unika.
 */

const TIMEOUT_MS = 20_000;
const CSRF_COOKIE_NAME = "csrftoken";
const CSRF_HEADER_NAME = "x-csrf-token";

// Buforowany token CSRF (pobrany raz, potem używany)
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Pobiera token CSRF z ciasteczka lub z endpointa /api/auth/csrf
 */
async function getCsrfToken(): Promise<string> {
  // Sprawdź ciasteczko
  if (typeof document !== "undefined") {
    const cookie = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`));
    if (cookie) {
      return cookie.split("=")[1]?.trim() || "";
    }
  }

  // Jeśli nie ma ciasteczka, pobierz z endpointa
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch("/api/auth/csrf", {
      method: "GET",
      credentials: "same-origin",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch CSRF token");
        return res.json();
      })
      .then((data) => {
        // Po pobraniu token powinien być w ciasteczku
        if (typeof document !== "undefined") {
          const cookie = document.cookie
            .split(";")
            .find((c) => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`));
          if (cookie) {
            return cookie.split("=")[1]?.trim() || "";
          }
        }
        return (data as { csrfToken?: string }).csrfToken || "";
      })
      .catch(() => "");
  }

  return csrfTokenPromise;
}

/**
 * Czy żądanie wymaga tokenu CSRF (POST, PATCH, PUT, DELETE)
 */
function needsCsrf(method?: string): boolean {
  return method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
}

export class ApiRequestError extends Error {
  readonly error: ApiError;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.error = error;
  }
}

export function toApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === "object" && "message" in payload) {
    const candidate = payload as Partial<ApiError>;
    return {
      code: candidate.code ?? "internal",
      message: typeof candidate.message === "string" ? candidate.message : "Nieznany błąd.",
      ...(candidate.field ? { field: candidate.field } : {}),
    };
  }
  switch (status) {
    case 401:
      return { code: "unauthorized", message: "Sesja wygasła. Zaloguj się ponownie." };
    case 403:
      return { code: "forbidden", message: "Nie masz uprawnień do tej operacji." };
    case 404:
      return { code: "not_found", message: "Nie znaleziono tego, czego szukasz." };
    case 429:
      return { code: "rate_limited", message: "Zbyt wiele żądań. Spróbuj za chwilę." };
    default:
      return { code: "internal", message: "Coś poszło nie tak po stronie serwera." };
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  csrf?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    // Jeśli żądanie wymaga CSRF i nie podano tokenu, pobierz go
    let csrfToken = options.csrf;
    if (needsCsrf(options.method) && !csrfToken) {
      csrfToken = await getCsrfToken();
    }

    const res = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
      credentials: "same-origin",
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) throw new ApiRequestError(toApiError(res.status, payload));
    return payload as T;
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause;
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new ApiRequestError({ code: "unavailable", message: "Żądanie zostało przerwane." });
    }
    throw new ApiRequestError({
      code: "unavailable",
      message: "Nie można połączyć się z serwerem.",
    });
  } finally {
    clearTimeout(timeout);
  }
}

/* ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████ */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  enabled = true,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(
    (signal: AbortSignal) => loader(signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    load(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof ApiRequestError
            ? cause.error
            : { code: "internal", message: "Nieznany błąd." },
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load, nonce, enabled]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
