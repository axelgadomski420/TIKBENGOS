import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace'y trzymamy jako źródło TypeScript — nie ma etapu budowania
  // pakietów wewnętrznych, bo to jedyne miejsce, w którym mogłoby powstać
  // rozjechanie się wersji między interfejsem a kontraktem.
  transpilePackages: ["@bengos/core", "@bengos/ui"],
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
    ];
  },
};

export default config;
