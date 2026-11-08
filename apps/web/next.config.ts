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
  // z workspace'u.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "i.ibb.co" }],
  },
  /*
    ── PUSTY `Cache-Control` DLA STRON, KTÓRE ZALEŻĄ OD SESJI ─────────────
    (naprawa 2026-11-08, noc — najważniejsza w tej sesji)

    Next.js pre-renderuje `/` i wysyła na nią `Cache-Control: s-maxage=31536000`,
    czyli pozwolenie na trzymanie strony w cache przez ROK. Dowód z nagłówków
    po wdrożeniu, w którym kod był już nowy:

        cache-control: s-maxage=31536000
        x-nextjs-cache: HIT

    Skutek: właściciel widział na telefonie ekran sprzed godzin, mimo że
    w obrazie leżał nowy plik — sprawdzone `grep`-em w kompilacie:

        /app/apps/web/.next/static/chunks/app/layout-79bebca49b9e89fd.js
        curl https://bengos.pl/ | grep -c 'bengos-off' → w kodzie był nowy

    To była przyczyna całej serii „napraw, dalej stare”. Każde wdrożenie
    było poprawne, a przeglądarka (albo proxy operatora) serwowała kopię
    z cache'u, bo serwer sam na to pozwolił.

    ── DLACZEGO `no-store`, A NIE KRÓTSZY `max-age` ────────────────────
    Te ekrany zależą od STANU SESJI: dla zalogowanego renderują pulpit, dla
    przybysza bramę wejścia. Kopia w cache'u jest więc z definicji błędna
    dla połowy odwiedzających — i to jest właśnie ten błąd, który widział
    właściciel: zapisana brama pokazywana osobie, która już weszła.
    `no-store` zabrania trzymania kopii całkowicie. Strony statyczne
    i zasoby `/_next/static/` mają własne, dłuższe nagłówki i tego wpisu
    nie dotyczą.
  */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
      {
        // ── STRONA GŁÓWNA: ZERO CACHE'U ──────────────────────────────────
        // `/` jest stroną zależną od sesji, więc kopia w cache'u jest zawsze
        // błędna dla kogoś. `no-store` + `must-revalidate` zabraniają
        // jakiegokolwiek trzymania — i kończą serię niewidocznych wdrożeń.
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
        ],
      },
      {
        // ── EKRANY MODUŁÓW: ZERO CACHE'U ────────────────────────────────
        // Te trasy też zależą od sesji (brama staje na każdej z nich),
        // więc ten sam powód co wyżej.
        source: "/:path(feed|studio|chat|create|dev|access|profile|settings|login|register)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
        ],
      },
      {
        // Service worker jest serwowany bez cache’u i z jawnym typem treści.
        // Bez tego przeglądarka trzyma starszą wersję pliku do 24 godzin,
        // a poprawka w workerze „nie działa” mimo wgrania nowej wersji.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default config;
