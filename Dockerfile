FROM oven/bun:1 AS base
WORKDIR /app

#install deps
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/engine/package.json ./apps/engine/
COPY apps/poller/package.json ./apps/poller/
COPY apps/ws/package.json ./apps/ws/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
RUN bun install --frozen-lockfiles

# build (generate prisma client, needs node/npm)
FROM deps AS builder
RUN apt-get update -y && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

FROM oven/bun:1-slim AS runner
WORKDIR /app

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps ./apsps
COPY --from=builder /app/packages ./packages

CMD bun run --cwd apps/${APP_NAME} $(if [ -f apps/${APP_NAME}/src/index.ts ]; then echo "src/index.ts"; else echo "index.ts"; fi)
