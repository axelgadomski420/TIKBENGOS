import { NextResponse } from "next/server";

/**
 * Adres zwrotny logowania OAuth — przekierowanie wprost do API.
 *
 * ── PO CO OSOBNA TRASA ──────────────────────────────────────────────────
 * Dostawca odsyła przeglądarkę z kodem pod adres, który musi być
 * IDENTYCZNY w panelu dostawcy i w ustawieniach API. Ten adres wskazuje
 * na aplikację (`{adres}/api/auth/oauth/google/callback`), ale nie ma pod
 * nim strony Next.js — jest punkt końcowy Django.
 *
 * Trasa bierze kod i `state` z adresu i woła API z wnętrza sieci Dockera,
 * po czym odsyła użytkownika na pulpit. Dzięki temu adres w panelu dostawcy
 * nie musi wskazywać na nazwę usługi w Dockerze, której świat nie widzi.
 *
 * ── DLACZEGO NIE PRZEKIEROWANIE PRZEGLĄDARKI NA API ─────────────────────
 * `api:8000` to nazwa w sieci Dockera, nieosiągalna z zewnątrz. Dlatego
 * żądanie wychodzi z serwera Next.js, po wewnętrznej sieci, a przeglądarka
 * dostaje tylko wynik.
 *
 * Błędy wracają jako parametr w adresie, a nie jako strona błędu: ekran
 * logowania jest jedynym miejscem, które wie, co zrobić z odmową, i on ją
 * pokaże po słowach.
 *
 * ── WPIS NA LIŚCIE DOZWOLONYCH PREFIKSÓW PROXY ──────────────────────────
 * Ta trasa przechwytuje `POST` na swój adres, żeby przekazać go dalej
 * do Django. Gdyby nie przechwytywała, żądanie poszłoby do proxy w
 * `src/app/api/[...path]/route.ts` i próbowało wymienić kod drugi raz.
 * Kolejność w Next.js rozstrzyga na korzyść trasy bardziej szczegółowej,
 * więc `POST` trafia tutaj.
 */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL;

type RouteContext = { params: Promise<{ path: string[] }> };

function backToLogin(url: URL, reason: string) {
  const back = new URL("/login", url.origin);
  back.searchParams.set("oauth", reason);
  return NextResponse.redirect(back);
}

async function exchange(
  request: Request,
  url: URL,
  provider: string,
  code: string,
  state: string,
) {
  if (!API_INTERNAL_URL) return backToLogin(url, "brak-konfiguracji");

  const target = `${API_INTERNAL_URL}/v1/auth/oauth/${encodeURIComponent(provider)}/callback?${new URLSearchParams({ code, state }).toString()}`;

  try {
    // Ciasteczka przychodzą z przeglądarki i muszą dojść do Django — w nich
    // jest `state`, bez którego callback nie przejdzie.
    const cookies = request.headers.get("cookie") ?? "";
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookies,
        // Host musi być publiczny: Django porównuje go z `ALLOWED_HOSTS`,
        // a wewnętrzna nazwa usługi nie jest na tej liście.
        host: url.host,
      },
      redirect: "manual",
      cache: "no-store",
    });

    if (!response.ok) {
      return backToLogin(url, response.status === 400 ? "stan" : "odmowa");
    }

    const result = NextResponse.redirect(new URL("/", url.origin));
    // Ciasteczka sesji i CSRF muszą wrócić do przeglądarki — bez tego
    // użytkownik jest zalogowany po stronie serwera, a przeglądarka o tym nie wie.
    for (const cookie of response.headers.getSetCookie()) {
      result.headers.append("set-cookie", cookie);
    }
    return result;
  } catch {
    return backToLogin(url, "blad-sieci");
  }
}

export async function GET(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  const url = new URL(request.url);
  const provider = path[0];
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.get("error")) return backToLogin(url, "odmowa");
  if (!provider || !code || !state) return backToLogin(url, "brak-danych");

  return exchange(request, url, provider, code, state);
}

/**
 * Ta sama wymiana, gdy kod przyjdzie w ciele żądania.
 *
 * Przydaje się, gdy ktoś ustawi u dostawcy adres zwrotny wskazujący na
 * interfejs i ten interfejs sam dokończy wymianę po stronie przeglądarki.
 */
export async function POST(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  const url = new URL(request.url);
  const provider = path[0];

  let code = url.searchParams.get("code") ?? "";
  let state = url.searchParams.get("state") ?? "";

  if (!code || !state) {
    try {
      const body = (await request.json()) as { code?: string; state?: string };
      code = body.code ?? code;
      state = body.state ?? state;
    } catch {
      // Ciało nieparsowalne — zostają wartości z adresu.
    }
  }

  if (!provider || !code || !state) return backToLogin(url, "brak-danych");

  return exchange(request, url, provider, code, state);
}
