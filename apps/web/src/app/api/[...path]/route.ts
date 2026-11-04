const ALLOWED_PREFIXES = [
  // `/csrf` jest tu konieczne, a nie ozdobne. `csrfToken()` w
  // `@/lib/api-client` woła `GET /api/csrf`, żeby dostać ciasteczko, gdy
  // jeszcze go nie ma — czyli dokładnie przy pierwszym wejściu na stronę.
  // Bez tej pozycji proxy odpowiadało 404, token nie dochodził, a każde
  // żądanie zapisujące leciało do Django bez `X-CSRF-Token` i wracało 403.
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
 *
 * ── NAGŁÓWEK `Host` MUSI ZOSTAĆ ZACHOWANY ───────────────────────────────
 * Poprzednia wersja robiła `headers.delete("host")`. Skutek: `fetch` do
 * `http://api:8000` ustawiał własny nagłówek `Host: api:8000`, a Django
 * porównuje go z `ALLOWED_HOSTS`. Na tej liście są tylko adres publiczny
 * i nazwy `trycloudflare.com` — `api:8000` tam nie ma, więc Django zwracał
 * `400 Bad Request` na KAŻDE wywołanie API z interfejsu: rejestrację,
 * logowanie, zgody, klucze dostawców.
 *
 * Objaw był mylący, bo `api-client` zamienia każdy nieoczekiwany kształt
 * odpowiedzi na jeden komunikat: „Nie można połączyć się z serwerem”.
 * Wyglądało to na brak sieci, a było odrzuceniem przez `ALLOWED_HOSTS`.
 *
 * Teraz nagłówek `Host` jest PRZEPISYWANY na host, pod którym przyszło
 * żądanie z przeglądarki. Django widzi więc `poetry-thumbs-fitness-did.
 * trycloudflare.com` albo `92.5.154.243` — czyli wartość, która naprawdę
 * jest na `ALLOWED_HOSTS`. To ten sam mechanizm, którego używa `header_up
 * Host {$DOMAIN}` w `infra/Caddyfile` przy trasach API.
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

  // ── Host: zachowujemy tożsamość przeglądarki ────────────────────────
  // `request.headers.get("host")` to host, pod którym żądanie przyszło
  // (np. nazwa `trycloudflare.com` albo adres IP). Wysyłamy go dalej, żeby
  // Django mógł go porównać z `ALLOWED_HOSTS`.
  //
  // Jeżeli z jakiegoś powodu hosta nie ma w nagłówkach żądania, bierzemy go
  // z adresu URL — to ten sam host, tylko zapisany inaczej. Bez tego
  // `fetch` ustawiłby `api:8000` i wrócilibyśmy do `400`.
  const publicHost = request.headers.get("host") ?? url.host;
  headers.set("host", publicHost);

  // Nagłówki opisujące połączenie z proxy, a nie z API. Przekazane dalej
  // wprowadzają serwer w błąd co do prawdziwego pochodzenia żądania.
  // `host` NIE jest tu usuwany — patrz komentarz wyżej.
  headers.delete("connection");
  headers.delete("content-length");

  // `X-Forwarded-*` mówią API, że żądanie przyszło przez proxy. Django
  // z nich nie korzysta przy sprawdzaniu `ALLOWED_HOSTS`, ale są potrzebne,
  // gdy zażądamy kiedyś poprawnego adresu zwrotnego albo wykrywania HTTPS.
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  headers.set("x-forwarded-host", publicHost);

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

    // Przepisz nagłówki jawnie, aby przenosić ciasteczka sesji niezawodnie.
    //
    // `Headers` gubi `Set-Cookie` przy zwykłym kopiowaniu — dlatego
    // usuwamy i dodajemy pojedyncze ciasteczka osobno, przez `getSetCookie()`.
    // Bez tego Django ustawiał `csrftoken` oraz `sessionid`, a przeglądarka
    // nie dostawała żadnego z nich.
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("set-cookie");
    for (const cookie of upstream.headers.getSetCookie()) {
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
