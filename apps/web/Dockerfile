# Interfejs TIKBENGOS — obraz produkcyjny.
#
# Trzy etapy, celowo: zależności, budowanie, uruchomienie. Jednoetapowy obraz
# z całym `node_modules` i źródłami waży kilkaset megabajtów więcej, a na
# darmowej maszynie Oracle (2 rdzenie, 12 GB) to nie jest szczegół.

FROM node:20-alpine AS deps
WORKDIR /app

# Workspace'y są potrzebne w całości, bo `apps/web` zależy od `@bengos/core`
# i `@bengos/ui` jako źródła TypeScript, nie jako zbudowane paczki.
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
# tożsamości, więc build tego nie wywala. Wartość przestaje być potrzebna
# zaraz po tym, jak serwer wystartuje — wtedy `web` dostaje ją z compose.
ENV API_INTERNAL_URL=http://api:8000
RUN npm run build -w apps/web

# ⚠ TU NIE MA WYNIKU `standalone` — i to jest celowe.
#
# Sprawdziliśmy to na działającym obrazie: `find / -name server.js` zwracał
# DOKŁADNIE JEDEN plik, `/app/server.js`, a kontener i tak padał. Powód jest
# inny niż sama ścieżka: przy `transpilePackages` z pakietami workspace na
# źródłach `.ts` Next traktuje `@bengos/core` i `@bengos/ui` jako zależności
# zewnętrzne i nie wkłada ich skompilowanych plików do wyniku `standalone`.
# Serwer startował, po czym wywalał się na brakującym module.
#
# Bierzemy więc wynik ZWYKŁY wraz z `node_modules` i uruchamiamy `npm run start`
# z workspace'u. Nadmiar kilkudziesięciu megabajtów jest tańszy niż obraz,
# który wstaje i pada.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# `node_modules` z etapu zależności zawiera też pakiety workspace.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Konfiguracja i źródła: `next start` czyta `package.json` oraz `next.config.ts`,
# a `transpilePackages` wymaga plików `.ts` z `packages/` w czasie startu.
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/src ./apps/web/src
COPY --from=builder --chown=nextjs:nodejs /app/packages/core ./packages/core
COPY --from=builder --chown=nextjs:nodejs /app/packages/ui ./packages/ui

USER nextjs
EXPOSE 3000

# `npm run start` z workspace'u `@bengos/web` — bez zgadywania, gdzie leży plik.
CMD ["npm", "run", "start", "--workspace", "@bengos/web"]
