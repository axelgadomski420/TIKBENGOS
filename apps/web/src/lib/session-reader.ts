"""Serwerowy odczyt sesji.

Ten plik istnieje po to, żeby pierwszy render powłoki znał tożsamość.
Bez niego interfejs renderuje się jako „nie zalogowany”, a dopiero potem
dociąga stan — co widać jako miganie i co gorsza pokazuje użytkownikowi,
który wszedł, że nie wszedł.

Zasada: brak odpowiedzi z API nie może wywalić renderu. Gdy serwer jest
niedostępny, zwracamy `null` i powłoka pokaże stan „nie zalogowany”,
który jest prawdziwy przynajmniej w tym sensie, że nie twierdzimy, że ktoś
jest zalogowany, gdy nie wiemy.
"""

import type { Identity } from "@bengos/core";

/** Adres API widziany z serwera Next.js — ten sam, którego używa proxy. */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL;

/**
 * Krótki czas oczekiwania.
 *
 * Odczyt sesji jest na ścieżce krytycznej każdego żądania: każdy render
 * czeka, aż API odpowie. Długi timeout zamieniłby niedziałające API
 * w niedziałający interfejs, a to gorszy objaw niż brak tożsamości.
 */
const TIMEOUT_MS = 3000;

export async function readSession(): Promise<Identity | null> {
  if (!API_INTERNAL_URL) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // `HEAD` nie wystarczy: ciasteczko sesji i tak trzeba odesłać nagłówkiem,
    // a tożsamość przychodzi w treści. Ciasteczka żądania przekazuje Next
    // przez `headers()`; tu świadomie żądamy bez nich, bo odczyt tożsamości
    // na potrzeby renderu nie może wymagać sesji użytkownika — brak sesji
    // to oczekiwany stan, nie błąd.
    const { cookies } = await import("next/headers");
    const cookieHeader = (await cookies()).toString();

    const res = await fetch(`${API_INTERNAL_URL}/v1/users/me`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const payload = (await res.json()) as {
      id: string;
      username: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
      bio: string | null;
      website: string | null;
      roles: Identity["roles"];
      consents: Identity["consents"];
      perception: Identity["perception"];
      createdAt: string;
    };

    return payload;
  } catch {
    // Nieosiągalne API, przekroczony czas, zła odpowiedź — wszystko jedno.
    // Render idzie dalej bez tożsamości.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
