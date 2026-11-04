import type { Metadata, Viewport } from "next";

import "@bengos/ui/styles.css";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { SessionProvider } from "@/providers/session-provider";
import { readSession } from "@/lib/session-reader";

/**
 * Powłoka aplikacji.
 *
 * Ten plik montuje cztery rzeczy, bez których reszta interfejsu nie ma nośnika:
 * style (arkusz design systemu i Tailwind), preferencje użytkownika, powłokę
 * z nawigacją i rejestrację service workera.
 *
 * Kolejność importów nie jest dowolna. `@bengos/ui/styles.css` definiuje
 * `:root` łącznie z `color-scheme: dark` i odwołuje się do zmiennych, które
 * wypisuje `tokensToStyle` w `AppShell`. `globals.css` idzie po nim, bo zawiera
 * warstwy Tailwinda, a te muszą trafić na koniec arkusza — inaczej narzędziowe
 * klasy przegrają z regułami bazowymi.
 *
 * Sesja jest czytana PO STRONIE SERWERA i podana jako wartość początkowa
 * dostawcy. Robimy to, bo bez tego pierwszy render pokazywał migające
 * „nie zalogowany” na ekranie, który już wie, że użytkownik wszedł — a przy
 * wolnym łączu trwało to zauważalnie długo.
 */
export const metadata: Metadata = {
  title: {
    default: "TIKBENGOS",
    template: "%s — TIKBENGOS",
  },
  description: "Jeden społecznościowy system operacyjny.",
  applicationName: "TIKBENGOS",
  manifest: "/manifest.webmanifest",
  // Ikony PWA są zadeklarowane w manifeście i tam prowadzą, ale pliki
  // w `public/icons/` jeszcze nie istnieją. Nie wskazujemy tu ścieżek,
  // których nie ma — brak ikon jest zgłoszony osobno.
  appleWebApp: { capable: true, title: "BENGOS", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

/**
 * `colorScheme` jest tu, a nie w arkuszu, żeby przeglądarka nie zdążyła
 * namalować jasnego tła, zanim wczyta CSS. Ciemny motyw jest domyślny.
 */
export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#0B0B0F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const identity = await readSession();

  return (
    <html lang="pl" suppressHydrationWarning>
      {/*
        `suppressHydrationWarning` jest na `html` z jednego powodu i tylko z tego:
        motyw ustawia przeglądarka (zapis użytkownika albo ustawienie systemu),
        a serwer o nim nie wie. Bez tego React zgłaszałby rozjazd hydracji przy
        każdym wejściu — a to nie jest błąd, tylko różnica, której serwer nie
        może rozstrzygnąć. Wnętrze drzewa zostaje bez tego wyjątku.
      */}
      <body className="min-h-dvh bg-[var(--bengos-surface)] text-[var(--bengos-text)] antialiased">
        <PreferencesProvider>
          <SessionProvider initialIdentity={identity}>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </PreferencesProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
