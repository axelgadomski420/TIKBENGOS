import type { Metadata, Viewport } from "next";

import "@bengos/ui/styles.css";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { SessionProvider } from "@/providers/session-provider";

/**
 * Powłoka aplikacji.
 *
 * Ten plik jest jedynym miejscem montującym trzy rzeczy, bez których reszta
 * interfejsu nie ma nośnika: style (arkusz design systemu i Tailwind),
 * preferencje użytkownika oraz powłokę z nawigacją.
 *
 * Kolejność importów nie jest dowolna. `@bengos/ui/styles.css` definiuje
 * `:root` łącznie z `color-scheme: dark` i odwołuje się do zmiennych, które
 * wypisuje dopiero `tokensToStyle` w `AppShell`. `globals.css` idzie po nim,
 * bo zawiera warstwy Tailwinda, a te muszą trafić na koniec arkusza — inaczej
 * narzędziowe klasy przegrają z regułami bazowymi.
 *
 * Sesja jest czytana po stronie klienta, nie serwera. Serwerowy `readSession()`
 * wymagałby działającego `services/api`, którego jeszcze nie ma, więc podanie
 * tu `initialIdentity` byłoby obietnicą bez pokrycia. Powłoka renderuje się
 * z sesją `null`, a rozgałęzienia chronione uprawnieniem (np. Dev) pojawiają
 * się, gdy tożsamość faktycznie dojedzie — patrz `AppShell`.
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
  icons: { icon: "/favicon.ico" },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `lang="pl"` jest tu na sztywno, bo to język interfejsu domyślny.
    // Wybór języka i format regionalny to osobne ustawienia użytkownika —
    // te trafiają do `PreferencesProvider` i nie zmieniają tego atrybutu,
    // który opisuje język dokumentu, a nie preferencję.
    <html lang="pl" dir="ltr" suppressHydrationWarning>
      <body className="min-h-dvh bg-[var(--bengos-surface)] text-[var(--bengos-text)] antialiased">
        <PreferencesProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
