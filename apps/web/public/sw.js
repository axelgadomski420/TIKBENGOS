/*
 * Service worker TIKBENGOS.
 *
 * Dwa zadania i nic więcej:
 *
 * 1. PRZEKAZAĆ NAWIGACJĘ DO SIECI. Gdy sieci nie ma, pokazać ekran
 *    „Nie ma połączenia” — statyczny dokument bez treści udających dane.
 * 2. DORĘCZYĆ OFFLINE TO, CO ZOSTAŁO JUŻ POBRANE (skrypty, style, czcionki,
 *    ikony). Świeżość danych z API ma znaczenie, więc te odpowiedzi są
 *    pobierane z sieci, a cache jest tylko dla zasobów powłoki.
 *
 * Świadomie NIE cache’ujemy odpowiedzi `/api/`, żadnej trasy modułu ani
 * HTML-i. Cache’owany feed pokazywałby treści, których już nie ma — a to jest
 * dokładnie ten rodzaj kłamstwa, którego ten projekt nie popełnia.
 */

const CACHE = "tikbengos-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `addAll` przerywa całość, gdy jeden adres zawiedzie. Każdy zasób
      // wkładamy osobno, żeby brak jednego pliku nie zablokował instalacji.
      await Promise.allSettled([cache.add(OFFLINE_URL), cache.add("/")]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API nigdy nie idzie z cache — dane mają być prawdziwe albo wcale.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return offline ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Powłoka: najpierw cache, potem sieć z uzupełnieniem cache’u.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
