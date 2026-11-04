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

# GDZIE LEŻY `server.js` — to nie jest szczegół.
#
# Next w monorepo odtwarza w wyniku `standalone` CAŁĄ strukturę od korzenia
# repozytorium, więc plik trafia do `apps/web/.next/standalone/apps/web/server.js`,
# a nie do korzenia wyniku. Poprzednia wersja kopiowała standalone do `/app`
# i uruchamiała `node apps/web/server.js` — plik nie istniał pod tą ścieżką
# i kontener zapętlał się na `Cannot find module '/app/apps/web/server.js'`.
#
# Kopiujemy więc zawartość standalone do `/app` (co odtwarza `apps/web/server.js`
# oraz przycięty `node_modules` obok), a statyki i `public` dokładamy pod
# ścieżki, których spodziewa się serwer: `apps/web/.next/static` i `apps/web/public`.
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

# `HOSTNAME=0.0.0.0` jest konieczne: bez niego serwer standalone słucha na
# localhost wewnątrz kontenera i Caddy nie może się do niego dostać.
ENV HOSTNAME=0.0.0.0

# Ścieżka jest względna do `WORKDIR /app` i odpowiada temu, co wygenerował Next.
CMD ["node", "apps/web/server.js"]
