# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@12.18.0
WORKDIR /app

# Install workspace dependencies needed for the server package
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN pnpm install --filter server... --frozen-lockfile

# Development target (used by docker-compose.dev.yml)
FROM deps AS dev
COPY server/prisma ./server/prisma
COPY server/prisma7.config.ts ./server/prisma7.config.ts
RUN pnpm --filter server prisma:generate
COPY server ./server
WORKDIR /app/server
EXPOSE 3001
CMD ["pnpm", "start:dev"]

# Build production bundle and isolate production dependencies
FROM deps AS builder
COPY server ./server
RUN pnpm --filter server prisma:generate \
 && pnpm --filter server build \
 && pnpm --filter server --prod deploy --legacy /prod/server

# Minimal production runtime image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /prod/server/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /prod/server/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/server/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/server/prisma ./prisma

USER nestjs
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
