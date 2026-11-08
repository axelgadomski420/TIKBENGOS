import type { Metadata, Viewport } from "next";

import "@bengos/ui/styles.css";
import "@bengos/ui/boot.css";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { BootSplash } from "@/components/boot-splash";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { SessionProvider } from "@/providers/session-provider";

/**
 * Powłoka aplikacji.
 *
 * Ten plik montuje cztery rzeczy, bez których reszta interfejsu nie ma nośnika:
 * style (arkusz design systemu, ekran startowy i Tailwind), preferencje
 * użytkownika, powłokę z nawigacją i rejestrację service workera.
 *
 * ── KOLEJNOŚĆ IMPORTÓW NIE JEST DOWOLNA ─────────────────────────────────
 * `@bengos/ui/styles.css` definiuje `:root` łącznie z `color-scheme: dark`
 * i odwołuje się do zmiennych, które wypisuje `tokensToStyle` w `AppShell`.
 * `boot.css` idzie po nim, a przed `globals.css`, bo zawiera zasłonę startową
 * — a ta musi wygrać z warstwami Tailwinda. `globals.css` zamyka listę, bo
 * warstwy Tailwinda muszą trafić na koniec arkusza.
 *
 * ── SESJA NIE JEST CZYTANA W TYM PLIKU — i to jest poprawka ─────────────
 * Wcześniej stało tu `const identity = await readSession()`, czyli żądanie do
 * `http://api:8000/v1/users/me` wykonywane PRZED wyrenderowaniem drzewa.
 * Skutek był cichy i bardzo kosztowny: serwer wstawał, wypisywał „Ready in 3s”,
 * a na każde żądanie dokumentu odpowiadał `200` z `content-length: 0`.
 * Przeglądarka dostawała pusty HTML i pokazywała białą stronę, bez żadnego
 * błędu w logu — bo wyjątek z warstwy renderowania Next połyka.
 *
 * Tożsamość dociąga teraz `SessionProvider` po stronie klienta. Cena jest
 * jedna: na bardzo wolnym łączu widać krótkie „nie zalogowany”, zanim stan
 * dojedzie. To jest lepsze niż biała strona, a `layout.tsx` przestaje
 * zależeć od tego, czy API zdąży odpowiedzieć.
 *
 * ── `suppressHydrationWarning` NA `html` ───────────────────────────────
 * Motyw ustawia przeglądarka (zapis użytkownika albo ustawienie systemu),
 * a serwer o nim nie wie. Bez tego React zgłaszałby rozjazd hydracji przy
 * każdym wejściu — a to nie jest błąd, tylko różnica, której serwer nie może
 * rozstrzygnąć. Wnętrze drzewa zostaje bez tego wyjątku.
 */
export const metadata: Metadata = {
  title: {
    default: "BENGOS",
    template: "%s — BENGOS",
  },
  description: "Jeden społecznościowy system operacyjny.",
  applicationName: "BENGOS",
  manifest: "/manifest.webmanifest",
  // Ikony PWA są zadeklarowane w manifeście; znak marki jest tam jako lokalny
  // JPEG. Pliki `icon-*.png` nadal nie istnieją — brak jest zgłoszony osobno,
  // a wskazywanie ścieżek bez plików dałoby pusty kwadrat w miejsce ikony.
  appleWebApp: { capable: true, title: "BENGOS", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

/**
 * `colorScheme` jest tu, a nie w arkuszu, żeby przeglądarka nie zdążyła
 * namalować jasnego tła, zanim wczyta CSS. Ciemny motyw jest domyślny.
 *
 * `themeColor` to `--bengos-surface` z ciemnego motywu — pasek adresu
 * w telefonie ma ten sam kolor co tło aplikacji, więc nie odcina się
 * jasnym prostokątem nad treścią.
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
        {/*
          Zasłona startowa. `BootSplash` jest komponentem klienckim, bo decyduje
          o pokazaniu się na podstawie `sessionStorage` — a to stan, którego
          serwer nie zna. Pokazuje się RAZ NA SESJĘ, nie przy każdym wejściu.
        */}
        <BootSplash />

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
