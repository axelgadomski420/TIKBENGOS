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
 *
 * ── DLACZEGO CHUNK'I NIE IDĄ Z CACHE (naprawa 2026-11-08) ──────────────
 * Poprzednia wersja trzymała KAŻDY zasób powłoki w jednym worku i oddawała
 * go z cache, gdy tylko tam był:
 *
 *     const cached = await cache.match(request);
 *     if (cached) return cached;          ← oddawał STARY plik
 *
 * Skutek był gorszy niż brak cache’u: przeglądarka dostawała NOWY HTML
 * (nawigacja szła do sieci) i STARE skrypty JavaScript (z cache). Strona
 * wyglądała na nieprzebudowaną mimo poprawnego wdrożenia — i to jest ten
 * objaw, który właściciel zgłaszał po każdej poprawce („napraw, dalej stare”).
 *
 * Teraz są DWIE polityki, bo te zasoby mają różne wymagania:
 *
 *   `/_next/static/` — NAJPIERW SIEĆ, cache tylko jako awaryjne wyjście.
 *   Next.js nadaje tym plikom w nazwie skrót treści (`main-app-fb2915b5….js`),
 *   więc nowa wersja ma ZAWSZE inną nazwę i nie ma czego unieważniać.
 *   Sieć jest tu tania (raz na wersję), a cache tylko ratuje przy braku
 *   połączenia.
 *
 *   Reszta (ikony, manifest, obraz znaku marki) — cache najpierw, bo te pliki
 *   nie zmieniają się przy każdym wdrożeniu, a ich świeżość nie ma znaczenia
 *   dla układu.
 *
 * ── WERSJA CACHE ZMIENIONA, ŻEBY STARY SIĘ SKASOWAŁ ───────────────────
 * `tikbengos-shell-v1` → `v2`. `activate` usuwa każdy cache o innej nazwie,
 * więc po tej zmianie KAŻDA przeglądarka wyrzuca stary worek i pobiera
 * pliki od nowa. To jednorazowy koszt, którego nie dało się uniknąć — inaczej
 * stary `v1` oddawałby stare chunki dalej i poprawka byłaby niewidoczna.
 */

const CACHE = "tikbengos-shell-v2";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `addAll` przerywa całość, gdy jeden adres zawiedzie. Każdy zasób
      // wkładamy osobno, żeby brak jednego pliku nie zablokował instalacji.
      //
      // `"/"` NIE jest tu pobierane: strona główna zależy od stanu sesji
      // i od wersji kodu, więc trzymanie jej kopii było źródłem rozjazdu
      // opisanego w nagłówku pliku. Ratunkiem offline jest `/offline`.
      await Promise.allSettled([cache.add(OFFLINE_URL)]);
      // Nowy worker przejmuje sterowanie od razu, bez czekania na
      // zamknięcie wszystkich kart — inaczej użytkownik z otwartą kartą
      // widziałby starą wersję do końca dnia.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      // `claim` sprawia, że strony otwarte PRZED instalacją nowego workera
      // też przechodzą pod jego kontrolę — bez tego trzeba by zamknąć
      // wszystkie karty, a to jest krok, którego nikt nie wykonuje.
      await self.clients.claim();
    })(),
  );
});

/** Zasoby z nazwą zależną od treści — sieć najpierw, cache jako ratunek. */
function isHashedAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

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

  // ── SKRYPTY I STYLE Z NEXT ────────────────────────────────────────
  // Sieć najpierw. Cache ma sens tylko wtedy, gdy sieci nie ma — a wtedy
  // lepszy stary chunk niż pusty ekran. Świeżość wygrywa, bo nazwa pliku
  // zawiera skrót treści, więc nowa wersja NIE MOŻE trafić pod starą nazwę.
  if (isHashedAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok && response.type === "basic") {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // ── RESZTA POWŁOKI (ikony, manifest, obraz znaku marki) ───────────
  // Cache najpierw: te pliki nie zmieniają się przy każdym wdrożeniu,
  // a pobieranie ich za każdym razem to zmarnowane żądanie.
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
