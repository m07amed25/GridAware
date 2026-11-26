# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@12.18.0
WORKDIR /app

# Install workspace dependencies needed for the client package
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN pnpm install --filter client... --frozen-lockfile

# Development target (used by docker-compose.dev.yml)
FROM deps AS dev
COPY client ./client
WORKDIR /app/client
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

# Build the standalone Next.js output
FROM deps AS builder
# Rewrites and NEXT_PUBLIC_* values are resolved at build time.
ARG API_INTERNAL_URL=http://server:3001
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY client ./client
RUN pnpm --filter client build

# Minimal production runtime image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output mirrors the monorepo layout (client/server.js)
COPY --from=builder --chown=nextjs:nodejs /app/client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/client/.next/static ./client/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/client/public ./client/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000)).then(r => process.exit(r.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "client/server.js"]
