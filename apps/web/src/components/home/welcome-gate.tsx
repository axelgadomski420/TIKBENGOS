"use client";

import { useEffect, useState } from "react";

import { WelcomeBanner } from "@/components/home/welcome-banner";

/**
 * Pasek powitania pokazywany RAZ, bezpośrednio po założeniu konta.
 *
 * ── DLACZEGO OSOBNY KOMPONENT, A NIE `useSearchParams` NA STRONIE ───────
 * `useSearchParams()` w komponencie serwerowym wymaga `Suspense`, a jego
 * brak w Next.js 15 przerywa build komunikatem o brakującej granicy.
 * Zamiast dokładać `Suspense` wokół całego pulpitu, ten komponent czyta
 * adres po stronie przeglądarki w `useEffect` — bezpiecznie, bo wartość
 * nie wpływa na pierwszy render, a więc nie ma niezgodności hydracji.
 *
 * ── POWÓD ZNIKA Z ADRESU PO ODCZYTANIU ──────────────────────────────────
 * `replaceState` usuwa `?welcome=1`, żeby odświeżenie strony nie pokazywało
 * powitania po zdarzeniu, którego już nie ma. Ten sam wzorzec co przy
 * `?oauth=` na ekranie logowania.
 */
export function WelcomeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") !== "1") return;
    setShow(true);
    window.history.replaceState({}, "", "/");
  }, []);

  if (!show) return null;
  return <WelcomeBanner />;
}
