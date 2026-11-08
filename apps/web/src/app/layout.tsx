import type { Metadata, Viewport } from "next";

import "@bengos/ui/styles.css";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { SessionProvider } from "@/providers/session-provider";

/**
 * Powłoka aplikacji.
 *
 * Montuje style design systemu, preferencje użytkownika, powłokę z nawigacją
 * i rejestrację service workera.
 *
 * ── ZASŁONA STARTOWA USUNIĘTA (naprawa 2026-11-08, noc) ────────────────
 * Stał tu `<BootSplash />` — zasłona `position: fixed; inset: 0; z-index: 9999`
 * z `packages/ui/src/boot.css`, rysująca tego samego tygrysa (`BRAND.logo`),
 * którego rysuje brama logowania.
 *
 * Skutek był widoczny na każdym zrzucie z telefonu i wyglądał jak awaria
 * układu, choć był awarią KOLEJNOŚCI:
 *   1. zasłona zajmowała cały ekran i rysowała TYGRYSA Z NAPISEM BENGOS,
 *   2. brama logowania renderowała się POD nią — czyli drugi tygrys,
 *      w tym samym miejscu,
 *   3. formularz stał pod zasłoną i dziedziczył jej układ (`flex-column`
 *      z `align-items: center`), dlatego był wąskim paskiem przy lewej
 *      krawędzi, a nie kartą na całą szerokość telefonu.
 *
 * Wniosek, który trzeba było wyciągnąć: zasłona nie może rysować tego samego
 * znaku co pierwszy ekran pod nią. Dopóki rysowała, użytkownik widział
 * dwie kopie tygrysa, a formularz wciśnięty w pasek — dokładnie to, co
 * zgłaszał właściciel jako „dalej to samo” po każdej poprawce.
 *
 * ── DLACZEGO USUNIĘCIE JEST BEZPIECZNE ────────────────────────────────
 * Powód istnienia zasłony był jeden: biały prostokąt, zanim CSS dojedzie.
 * Ale `<body>` ma już `bg-[var(--bengos-surface)]`, a `:root` w `styles.css`
 * ustawia `background: var(--bengos-surface)` PRZED pierwszym malowaniem —
 * więc ciemne tło jest od pierwszej klatki i zasłona nie ma czego zasłaniać.
 * `BootSplash` znika z drzewa razem z importem `@bengos/ui/boot.css`;
 * sam arkusz zostaje w pakiecie (nie kasujemy plików), ale nikt go nie ładuje.
 *
 * ── SESJA NIE JEST CZYTANA W TYM PLIKU ────────────────────────────────
 * Wcześniej stało tu `const identity = await readSession()`, czyli żądanie
 * do API PRZED wyrenderowaniem drzewa. Skutek był cichy i kosztowny: serwer
 * wstawał, a na każde żądanie dokumentu odpowiadał `200` z `content-length: 0`.
 * Przeglądarka dostawała pusty HTML i pokazywała białą stronę.
 * Tożsamość dociąga teraz `SessionProvider` po stronie klienta.
 *
 * ── `suppressHydrationWarning` NA `html` ──────────────────────────────
 * Motyw ustawia przeglądarka (zapis użytkownika albo ustawienie systemu),
 * a serwer o nim nie wie. Bez tego React zgłaszałby rozjazd hydracji.
 */
export const metadata: Metadata = {
  title: {
    default: "BENGOS",
    template: "%s — BENGOS",
  },
  description: "Jeden społecznościowy system operacyjny.",
  applicationName: "BENGOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BENGOS", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

/**
 * `colorScheme` jest tu, a nie w arkuszu, żeby przeglądarka nie zdążyła
 * namalować jasnego tła, zanim wczyta CSS. Ciemny motyw jest domyślny.
 *
 * `viewportFit: "cover"` jest WYMAGANE dla `env(safe-area-inset-*)` — bez
 * niego stopka logowania na iPhonie siedzi pod paskiem gestów i nie da się
 * w nią trafić.
 */
export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#0A0E18",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="min-h-dvh bg-[var(--bengos-surface)] text-[var(--bengos-text)] antialiased">
        <PreferencesProvider>
          <SessionProvider initialIdentity={null}>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </PreferencesProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
