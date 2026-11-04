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

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# GDZIE LEŻY `server.js` — to nie jest szczegół i sprawdziliśmy to poleceniem.
#
# `find / -name server.js -maxdepth 6` w tym obrazie zwraca JEDEN wynik:
#     /app/server.js
#
# Czyli Next w tym monorepo kładzie `server.js` w KORZENIU wyniku `standalone`,
# a nie pod `apps/web/`. Poprzednia wersja uruchamiała `node apps/web/server.js`
# i kontener zapętlał się na `Cannot find module '/app/apps/web/server.js'`.
# Caddy wracał w restart pośrednio — nie mógł połączyć się z `web:3000`.
#
# Kopiujemy standalone do `/app` i uruchamiamy plik tam, gdzie faktycznie leży.
# Statyki i `public` dokładamy pod ścieżki, których spodziewa się serwer Next.
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

# `HOSTNAME=0.0.0.0` jest konieczne: bez niego serwer standalone słucha na
# localhost wewnątrz kontenera i Caddy nie może się do niego dostać.
ENV HOSTNAME=0.0.0.0

# Ścieżka względna do `WORKDIR /app` — potwierdzona odczytem, nie założeniem.
CMD ["node", "server.js"]
