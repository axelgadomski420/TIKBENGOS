"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@bengos/core";

/**
 * Klient API.
 *
 * Cztery rzeczy i nic więcej: składa żądanie, przekłada odpowiedź błędu na
 * wspólny kształt `ApiError`, pilnuje, żeby żądanie nie wisiało bez końca,
 * i dokłada token CSRF do żądań zapisujących. Świadomie bez automatycznych
 * powtórzeń — cicha ponowna próba ukrywa przed użytkownikiem to, że coś nie
 * działa, a to jest dokładnie ten błąd, którego ten projekt unika.
 */

const TIMEOUT_MS = 20_000;
const CSRF_COOKIE_NAME = "csrftoken";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * Token CSRF jest pobierany raz i trzymany w pamięci, ale NIE na zawsze.
 * Django rotuje token przy logowaniu i wylogowaniu, a stary token po rotacji
 * jest odrzucany — bufor bez unieważnienia dawałby 403 na pierwszym żądaniu
 * po każdym zalogowaniu.
 */
let cachedToken: string | null = null;

/** Czyści bufor. Wywoływane po rotacji tokenu po stronie serwera. */
export function resetCsrfToken(): void {
  cachedToken = null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  const value = match.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export async function csrfToken(): Promise<string | null> {
  // Ciasteczko ma pierwszeństwo: jeżeli istnieje, jest aktualne.
  const fromCookie = readCookie(CSRF_COOKIE_NAME);
  if (fromCookie) {
    cachedToken = fromCookie;
    return fromCookie;
  }
  if (cachedToken) return cachedToken;

  // Ciasteczka nie ma, bo nie było jeszcze żadnego żądania do Django.
  // Endpoint `GET /v1/csrf` je ustawia — proxy przepuszcza go, bo `/csrf`
  // dochodzi do `/v1/` razem z routerem.
  try {
    const res = await fetch("/api/csrf", { credentials: "same-origin" });
    if (!res.ok) return null;
    const payload = (await res.json()) as { csrfToken?: string };
    const token = readCookie(CSRF_COOKIE_NAME) ?? payload.csrfToken ?? null;
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
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
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    // django-ninja pakuje błąd raz pod `detail`, raz pod `message` —
    // w zależności od tego, czy rzucił HttpError, czy walidacja schematu.
    // Interfejs czyta oba kształty, bo nie może zgadywać, który dostał.
    const detail = record.detail;
    if (typeof detail === "string") {
      return { code: codeForStatus(status), message: detail };
    }
    if (detail && typeof detail === "object") {
      const nested = detail as Record<string, unknown>;
      if (Array.isArray(nested)) {
        const first = nested[0] as Record<string, unknown> | undefined;
        return {
          code: "bad_request",
          message: typeof first?.msg === "string" ? first.msg : "Serwer odrzucił te dane.",
          ...(Array.isArray(first?.loc) && typeof first.loc[first.loc.length - 1] === "string"
            ? { field: first.loc[first.loc.length - 1] as string }
            : {}),
        };
      }
    }
    if (typeof record.message === "string") {
      return {
        code: (record.code as ApiError["code"]) ?? codeForStatus(status),
        message: record.message,
        ...(typeof record.field === "string" ? { field: record.field } : {}),
      };
    }
  }
  return { code: codeForStatus(status), message: messageForStatus(status) };
}

function codeForStatus(status: number): ApiError["code"] {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 429:
      return "rate_limited";
    case 503:
      return "unavailable";
    default:
      return "internal";
  }
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Serwer odrzucił te dane.";
    case 401:
      return "Sesja wygasła. Zaloguj się ponownie.";
    case 403:
      return "Nie masz uprawnień do tej operacji.";
    case 404:
      return "Nie znaleziono tego, czego szukasz.";
    case 409:
      return "Ta nazwa albo adres email jest już zajęty.";
    case 429:
      return "Zbyt wiele żądań. Spróbuj za chwilę.";
    case 503:
      return "Serwer jest chwilowo niedostępny.";
    default:
      return "Coś poszło nie tak po stronie serwera.";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  csrf?: string | null;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  // Żądania zapisujące dokładają token same, gdy wywołanie go nie podało.
  // Wywołujący nadal może przekazać własny — wtedy wygrywa jego wartość.
  const csrf = SAFE_METHODS.includes(method) ? null : (options.csrf ?? (await csrfToken()));

  try {
    const res = await fetch(path, {
      method,
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
      credentials: "same-origin",
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      // Rotacja tokenu: Django odrzuca stary i ustawia nowy. Bez wyczyszczenia
      // bufora każde kolejne żądanie wracałoby tu samo.
      if (res.status === 403) resetCsrfToken();
      throw new ApiRequestError(toApiError(res.status, payload));
    }
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

/* ─────────────────── Zasoby ze stanem: ładowanie i błąd ──────────── */

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
