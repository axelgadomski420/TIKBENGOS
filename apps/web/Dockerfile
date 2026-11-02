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

# `API_INTERNAL_URL` jest potrzebne w czasie budowania, bo Next prerenderuje
# część stron. Adres wskazuje usługę w sieci Dockera — sprawdzi się dopiero
# po uruchomieniu, ale sam build go tylko czyta.
ENV API_INTERNAL_URL=http://api:8000
RUN npm run build -w apps/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
