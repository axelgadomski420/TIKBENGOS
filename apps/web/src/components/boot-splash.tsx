"use client";

import { useEffect, useState } from "react";

import { BRAND } from "@/lib/brand";

/**
 * Zasłona startowa — widoczna raz na sesję, nie na każdym wejściu.
 *
 * ── DLACZEGO NIE SAM CSS ────────────────────────────────────────────────
 * Wersja czysto CSS pokazywała się przy KAŻDYM przejściu między modułami.
 * Aplikacja po stronie klienta nie przeładowuje dokumentu, ale Next montuje
 * zasłonę przy każdym wejściu na nowy ekran — więc użytkownik przechodzący
 * z pulpitu do feedu widział ją ponownie. Sekunda na wejście w każdy moduł
 * to nie powitanie, to opóźnienie.
 *
 * ── WARUNEK POKAZANIA JEST JEDEN ────────────────────────────────────────
 * Wchodzi tylko przy pierwszym wejściu w tej sesji (`sessionStorage`).
 * Zamknięcie karty czyści znacznik, więc kolejna wizyta znowu pokaże znak
 * — i o to chodzi.
 *
 * ── `sessionStorage` MOŻE RZUCIĆ ───────────────────────────────────────
 * W trybie prywatnym i przy zablokowanych ciasteczkach dostęp rzuca
 * `SecurityError`. To nie jest powód, żeby ekran nie wstał — dlatego każde
 * odwołanie jest w `try`, a brak dostępu znaczy „pokaż zasłonę”.
 *
 * ── ZNIKA PRZEZ KLASĘ, NIE PRZEZ `display` ──────────────────────────────
 * Zasłona zdejmuje się animacją CSS (`.bengos-boot--hide` w `boot.css`),
 * a nie przez warunkowe renderowanie. Powód: `display: none` zabiera element
 * z drzewa w jednej klatce i przejście nie ma czego animować. Zmiana klasy
 * zostawia go w drzewie do końca animacji.
 *
 * ── CZASY MUSZĄ SIĘ ZGADZAĆ Z `boot.css` ────────────────────────────────
 * 1100 ms to czas, w którym zasłona stoi, 260 ms to animacja wyjścia.
 * Rozjazd między tym plikiem a arkuszem zostawiłby element na ekranie po
 * zniknięciu albo uciąłby animację w połowie.
 */
const SESSION_KEY = "bengos-boot-shown";
const HOLD_MS = 1100;
const FADE_MS = 260;

function alreadyShown(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Brak dostępu do magazynu sesji nie jest błędem — znaczy tylko, że
    // zasłona pokaże się ponownie przy następnym wejściu.
  }
}

export function BootSplash() {
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (alreadyShown()) {
      setMounted(false);
      return;
    }
    markShown();

    const fadeAt = setTimeout(() => setFading(true), HOLD_MS);
    const removeAt = setTimeout(() => setMounted(false), HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(fadeAt);
      clearTimeout(removeAt);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className={`bengos-boot${fading ? " bengos-boot--hide" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND.logo} alt="" className="bengos-boot-mark" />
      <p className="bengos-boot-name">BENGOS</p>
      <div className="bengos-boot-bar" />
    </div>
  );
}
