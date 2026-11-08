import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace'y trzymamy jako źródło TypeScript — nie ma etapu budowania
  // pakietów wewnętrznych, bo to jedyne miejsce, w którym mogłoby powstać
  // rozjechanie się wersji między interfejsem a kontraktem.
  transpilePackages: ["@bengos/core", "@bengos/ui"],
  // ⚠ `output` NIE JEST tu ustawione — i to jest celowe.
  //
  // Wcześniej stało tu `output: "standalone"`, a `apps/web/Dockerfile`
  // uruchamiał `npm run start`. Te dwa się wykluczają: Next wypisywał
  // przy starcie ostrzeżenie
  //
  //     "next start" does not work with "output: standalone" configuration.
  //     Use "node .next/standalone/server.js" instead.
  //
  // i serwer wstawał w trybie, w którym żądania z proxy nie dochodziły do
  // aplikacji. Kontener raportował „Ready in 2.9s”, a Caddy logował każde
  // żądanie ze `status: 0` — czyli bez odpowiedzi.
  //
  // Wracamy do wyniku zwykłego, bo obraz i tak uruchamia `npm run start`
  // z workspace'u. `standalone` wróci razem z powrotem do `node server.js`
  // w Dockerfile — jedno bez drugiego nie działa.
  // Typowanie strict w Next 15 wywala build, gdy `tsc` zgłosi cokolwiek.
  // Zostawiamy to włączone świadomie — ale osobno mówimy Nextowi, że ma
  // PRZERWAć na błędzie typów, a nie tylko go wypisać.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  // Znak marki stoi dziś na `i.ibb.co` — decyzja właściciela opisana w
  // `src/lib/brand.ts`. Grafika w nagłówku powłoki ma `unoptimized`, więc
  // nie przechodzi przez `/_next/image` i ten wpis nie jest jej potrzebny.
  // Istnieje na zapas: jeśli przy przyszłej optymalizacji obrazów ktoś zdejmie
  // `unoptimized`, bez `remotePatterns` Next odmówi serwowania obcej domeny
  // i logo zniknie z pasków. Wpis załatwia to zawczasu.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "i.ibb.co" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Kamera i mikrofon są potrzebne modułom Access i Studio, ale żadna
          // z nich nie działa bez zgody użytkownika — pozwolenie w nagłówku
          // to nie to samo co zgoda w aplikacji.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
      {
        // Service worker jest serwowany bez cache’u i z jawnym typem treści.
        // Bez tego przeglądarka trzyma starszą wersję pliku do 24 godzin,
        // a poprawka w workerze „nie działa” mimo wgrania nowej wersji.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default config;
