# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages packages
COPY apps/api apps/api

# Generate Prisma client (needed for type resolution at bundle time)
RUN pnpm exec prisma generate --schema=packages/db/prisma/schema.prisma

# Bundle — inlines all workspace packages, only @prisma/client stays external
RUN pnpm --filter @hisab/api build

# ── Stage 2: production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# prisma CLI (migrations) + @prisma/client (runtime)
RUN npm install --global prisma && npm install @prisma/client

# Prisma schema (for migrate deploy + generate)
COPY packages/db/prisma /app/prisma

# Regenerate Prisma client for this OS/arch
RUN prisma generate --schema=/app/prisma/schema.prisma

# Compiled bundle
COPY --from=builder /app/apps/api/dist /app/dist

COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]
