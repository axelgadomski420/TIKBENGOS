const ALLOWED_PREFIXES = [
  "/csrf",
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
] as const;

function isAllowedPath(path: string[]): boolean {
  const joined = `/${path.join("/")}`;
  return ALLOWED_PREFIXES.some((prefix) => joined === prefix || joined.startsWith(`${prefix}/`));
}

/**
 * Proxy do API.
 *
 * Utrzymujemy same-origin sesję i CSRF, więc nie włączamy CORS. Różne HTTP
 * metody muszą mieć własne handlery, bo eksportowanie `POST = GET` powodowało
 * błędne przekierowanie wszystkich zapisujących żądań do tej samej ścieżki
 * i zamydlało problemy z metodą HTTP.
 */
async function proxy(request: Request, segments: string[]): Promise<Response> {
  const base = process.env.API_INTERNAL_URL;
  if (!base) {
    return Response.json(
      { code: "internal", message: "Brak adresu API w konfiguracji. Ustaw API_INTERNAL_URL." },
      { status: 503 },
    );
  }

  if (!isAllowedPath(segments)) {
    return Response.json(
      { code: "not_found", message: "Nieznana ścieżka API." },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const target = new URL(`${base}/v1/${segments.join("/")}${url.search}`);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const body = ["GET", "HEAD", "OPTIONS"].includes(request.method)
    ? undefined
    : await request.clone().arrayBuffer();

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      credentials: "same-origin",
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("set-cookie");

    const setCookieValues = upstream.headers.getSetCookie?.() ?? [];
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

export async function POST(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function OPTIONS(request: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  if (!isAllowedPath(path)) {
    return Response.json({ code: "not_found", message: "Nieznana ścieżka API." }, { status: 404 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token, x-csrf-token",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
