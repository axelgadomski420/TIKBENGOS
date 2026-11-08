# Interfejs TIKBENGOS — obraz produkcyjny.
#
# Trzy etapy, celowo: zależności, budowanie, uruchomienie. Jednoetapowy obraz
# z całym `node_modules` i źródłami waży kilkaset megabajtów więcej, a na
# darmowej maszynie Oracle (2 rdzenie, 12 GB) to nie jest szczegół.
#
# ── UWAGA O PIERWSZEJ LINII ───────────────────────────────────────────────
# Ten plik zaczynał się kiedyś od tekstu:
#
#     successfully downloaded text file (SHA: 5bb2bb8d…)# Interfejs…
#
# Docker czytał to jako instrukcję i przerywał budowę komunikatem
# `unknown instruction: successfully`. Pierwsza linia MUSI być komentarzem
# (`#`) albo instrukcją (`FROM`, `ARG`, `ENV`…).

FROM node:20-alpine AS deps
WORKDIR /app

# Workspace'y są potrzebne w całości, bo `apps/web` zależy od `@bengos/core`
# i `@bengos/ui` jako źródła TypeScript, nie jako zbudowane pakiety.
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `API_INTERNAL_URL` jest potrzebne w czasie budowania, bo `layout.tsx`
# czyta sesję po stronie serwera — Next musi wiedzieć, dokąd sięgnąć.
# Adres wskazuje usługę w sieci Dockera: w czasie budowania odpowiada na
# niego nic, ale `readSession()` traktuje nieosiągalne API jako brak
# tożsamości, więc build tego nie wywala.
#
# NEXT_PUBLIC_* trafia do paczki klienta W CZASIE BUDOWY, nie w runtime.
# Bez tego ARG wartość z compose (sekcja "args") nie dotarłaby do kodu
# przeglądarki — ENV podany w runtime nie nadpisze już zbudowanego klienta.
ARG NEXT_PUBLIC_REALTIME_URL=""
ENV NEXT_PUBLIC_REALTIME_URL=${NEXT_PUBLIC_REALTIME_URL}
ENV API_INTERNAL_URL=http://api:8000
RUN npm run build -w apps/web

# ⚠ TU NIE MA WYNIKU `standalone` — i to jest celowe.
#
# Sprawdzone na działającym obrazie: `find / -name server.js` zwracał
# DOKŁADNIE JEDEN plik, `/app/server.js`, a kontener i tak padał. Powód jest
# inny niż sama ścieżka: przy `transpilePackages` z pakietami workspace na
# źródłach `.ts` Next traktuje `@bengos/core` i `@bengos/ui` jako zależności
# zewnętrzne i nie wkłada ich skompilowanych plików do wyniku `standalone`.
# Serwer startował, po czym wywalał się na brakującym module.
#
# Bierzemy więc wynik ZWYKŁY wraz z `node_modules` i uruchamiamy `next start`.
FROM node:20-alpine AS runner

# ⚠ KATALOG ROBOCZY TO `apps/web`, NIE `/app` — i to jest cała poprawka.
#
# `next start` szuka katalogu `.next` WZGLĘDEM katalogu, z którego startuje.
# Przy `WORKDIR /app` szukał `/app/.next`, a ten katalog leży
# w `/app/apps/web/.next`. Skutek był cichy i trudny do rozpoznania:
# serwer wstawał, wypisywał „Ready in 3s”, a na każde żądanie dokumentu
# odpowiadał `200` z `content-length: 0`. Przeglądarka dostawała pusty
# HTML i pokazywała białą stronę. Żadnego błędu w logu — bo dla Nexta
# to nie był błąd, tylko pusty wynik.
#
# Ten sam objaw potwierdzał się przez tunel i bezpośrednio na porcie 80:
#     < content-length: 0
#     200 0
# A `ls apps/web/.next/` pokazywał BUILD_ID i katalogi `server`, `static`
# na miejscu. Wynik był gotowy — serwer go nie widział.
WORKDIR /app/apps/web
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# `node_modules` trafia do korzenia repo, bo tam leży drzewo workspace'ów.
# Katalog roboczy jest niżej, ale Node szuka modułów w górę drzewa —
# `/app/node_modules` jest widoczny z `/app/apps/web`.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules /app/node_modules

# Konfiguracja workspace'ów: `next start` czyta `package.json` z katalogu
# roboczego i z korzenia, a `transpilePackages` wymaga plików `.ts`
# z `packages/` w czasie startu.
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/packages/core /app/packages/core
COPY --from=builder --chown=nextjs:nodejs /app/packages/ui /app/packages/ui

USER nextjs
EXPOSE 3000

# `next start` bezpośrednio, bez `npm run`, bo npm przeszedłby do katalogu
# korzenia workspace'u i znowu zgubił `.next`. Start z katalogu, w którym
# leży wynik, jest jedynym wariantem, który nie zależy od interpretacji npm.
CMD ["npx", "next", "start"]
