# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web ./apps/web

# Generate DB migrations at build time (schema must be stable)
RUN cd apps/web && pnpm run db:generate || true

ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && pnpm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy drizzle migrations
COPY --from=builder /app/apps/web/drizzle ./drizzle

# Vault and SQLite database directories (mounted via Docker volume)
RUN mkdir -p /vault /data && chown nextjs:nodejs /vault /data

RUN apk add --no-cache su-exec

COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# VAULT_DIR and DB_PATH must be set at runtime
ENV VAULT_DIR=/vault
ENV DB_PATH=/data/tasks.db

ENTRYPOINT ["/docker-entrypoint.sh"]
