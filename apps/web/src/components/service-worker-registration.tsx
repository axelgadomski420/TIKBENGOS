"use client";

import { useEffect } from "react";

/**
 * Rejestracja service workera — WYŁĄCZONA (naprawa 2026-11-08, noc).
 *
 * ── DLACZEGO WYŁĄCZONA ──────────────────────────────────────────────────
 * Service worker cache’ował poprzednią wersję interfejsu i podawał ją
 * zamiast tego, co stało na serwerze. Skutek opisywał właściciel jako
 * „napraw, dalej stare” po KAŻDEJ poprawce — i miał rację, bo przeglądarka
 * naprawdę pokazywała kod sprzed wdrożenia.
 *
 * Dowód był w logach, nie w domysłach: po wdrożeniu z `--no-cache` plik
 * `/sw.js` zwracał `200`, a `grep -c 'bengos-boot'` na serwerze dawał `0`
 * — a użytkownik dalej widział ekran z zasłoną, której w kodzie nie było.
 * Przeglądarka rysowała HTML z cache’u workera, nie z sieci.
 *
 * ── CO ZA TO PŁACIMY ────────────────────────────────────────────────────
 * Jedną rzecz: ekran `/offline` nie pojawi się automatycznie bez połączenia.
 * Aplikacja i tak go ma pod adresem, a Next serwuje go normalnie — więc
 * użytkownik offline dostanie stronę, tylko bez przechwycenia nawigacji.
 *
 * To jest świadoma wymiana: PWA offline nie jest warte tego, żeby właściciel
 * nie mógł zobaczyć własnej aplikacji. Wcześniej priorytet był odwrotny
 * i kosztował kilka godzin diagnozy stanu, który nie istniał.
 *
 * ── JAK WRÓCIĆ ──────────────────────────────────────────────────────────
 * Odkomentować rejestrację niżej. Warunek: `public/sw.js` musi mieć
 * podniesioną wersję `CACHE` (obecnie `tikbengos-shell-v2`) PRZY KAŻDYM
 * wdrożeniu zmieniającym kod, albo worker znowu zacznie podawać stare pliki.
 * Bez tego mechanizmu PWA i szybkie wdrożenia wykluczają się nawzajem.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // ── WYREJESTROWANIE STARYCH WORKERÓW ────────────────────────────────
    // Sama rezygnacja z rejestracji nie wystarcza: u użytkowników, którzy
    // już mają workera, zostaje on w przeglądarce i dalej cache’uje. Dlatego
    // ten komponent AKTYWNIE go usuwa — i czyści jego magazyn, bo sam wpis
    // o rejestracji nie zabiera plików z cache’u.
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .catch(() => {
        // Brak dostępu nie jest błędem — aplikacja działa dalej.
      });

    if (typeof caches !== "undefined") {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {
          // Jak wyżej: brak dostępu do Cache API nie zatrzymuje aplikacji.
        });
    }

    // Rejestracja wyłączona — powód w nagłówku pliku. Gdyby wracała,
    // stałoby tu:
    //   void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
