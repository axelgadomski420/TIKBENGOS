"use client";

import { useEffect } from "react";

/**
 * Rejestracja service workera.
 *
 * Rejestrujemy tylko w środowisku produkcyjnym. Rejestracja w trybie
 * developerskim to klasyczna pułapka: worker cache’uje zasoby, których serwer
 * deweloperski Next.js nie serwuje w stabilnych ścieżkach, i psuje podgląd
 * zmian. Brak ikony na ekranie offline to mniejszy problem niż to.
 *
 * Rejestracja jest cicha — brak pliku nie może pokazywać błędu w konsoli
 * użytkownika, który nie ma z tym nic wspólnego.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Brak pliku albo brak uprawnień. Aplikacja działa dalej — ekran
      // offline pokaże to, co już jest w bundlu.
    });
  }, []);

  return null;
}
