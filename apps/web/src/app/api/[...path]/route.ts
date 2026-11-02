const ALLOWED_PREFIXES = [
  "/auth",
  "/users",
  "/feed",
  "/music",
  "/chat",
  "/ai",
  "/git",
  "/access",
  "/settings",
  "/jobs",
];

/**
 * Proxy do API.
 *
 * Istnieje z jednego powodu: dzięki niemu ciasteczko sesji zostaje w tej samej
 * domenie co interfejs. Bez tego trzeba by włączyć CORS, ustawić politykę
 * `SameSite=None` i pilnować listy dozwolonych źródeł w każdym środowisku —
 * trzy rzeczy, które z czasem rozjeżdżają się niezauważalnie.
 *
 * Lista dozwolonych prefiksów nie jest ozdobą: bez niej to proxy byłoby
 * otwartym przekierowaniem na dowolny adres podany w ścieżce.
 */
async function proxy(request: Request, segments: string[]): Promise<Response> {
  const base = process.env.API_INTERNAL_URL;
  if (!base) {
    return Response.json(
      { code: "internal", message: "Brak adresu API w konfiguracji. Ustaw API_INTERNAL_URL." },
      { status: 503 },
    );
  }

  const joined = `/${segments.join("/")}`;
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => joined === prefix || joined.startsWith(`${prefix}/`),
  );
  if (!allowed) {
    return Response.json(
      { code: "not_found", message: "Nieznana ścieżka API." },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const target = `${base}/v1/${segments.join("/")}${url.search}`;

  const headers = new Headers(request.headers);
  // Nagłówki opisujące połączenie z proxy, a nie z API. Przekazane dalej
  // wprowadzają serwer w błąd co do prawdziwego pochodzenia żądania.
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });

    // Przepisz nagłówki jawnie, aby przenosić ciasteczka sesji niezawodnie
    const responseHeaders = new Headers(upstream.headers);
    
    // Usuń set-cookie z nagłówków
    responseHeaders.delete("set-cookie");
    
    // Dodaj ciasteczka z powrotem z upstream.headers.getSetCookie()
    const setCookieValues = upstream.headers.getSetCookie();
    for (const cookie of setCookieValues) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { code: "unavailable", message: "Nie można połączyć się z serwerem." },
      { status: 503 },
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export const POST = GET;
export const PATCH = GET;
export const PUT = GET;
export const DELETE = GET;
