# Perpetual Trading Platform

Perpetual trading engine with real-time order matching, Redis Streams, crash recovery, and a scalable event-driven architecture.

## Tech Stack

- **Runtime / monorepo:** Bun, Turborepo
- **Frontend:** React, Zustand, Tailwind, lightweight-charts
- **Backend API:** Express, Zod, Prisma
- **Matching Engine:** In-memory order matching, funding, liquidations, ADL
- **Real-time:** WebSocket server + Redis pub/sub
- **Messaging:** Redis Streams
- **Database:** PostgreSQL

## Apps and Packages

| Path | Role |
|------|------|
| `apps/frontend` | React trading UI (charts, order entry, positions) |
| `apps/backend` | REST API — auth, balances, orders, positions, klines |
| `apps/engine` | In-memory matching engine (orders, funding, liquidations, ADL) |
| `apps/ws` | WebSocket fan-out for depth and user updates |
| `apps/poller` | Persists fills/funding to Postgres; feeds Binance mark prices |
| `packages/db` | Prisma schema and PostgreSQL client (`@repo/db`) |
| `packages/types` | Shared TypeScript types (`@repo/types`) |

### Redis primitives

| Name | Kind | Purpose |
|------|------|---------|
| `orders:stream` | Stream | Commands to the engine |
| `fills:stream` | Stream | Fills / liquidations → poller |
| `funding:stream` | Stream | Funding payments → poller |
| `response:{queueId}:{id}` | Stream | Sync engine → backend replies |
| `depth:{marketId}` | Pub/Sub | Live orderbook depth |
| `user:{userId}` | Pub/Sub | User refresh events |
| `balance:{userId}` / `positions:{userId}` | Keys | Live account state |

## Getting Started

### Installation

1. Install dependencies:

```bash
bun install
```

2. Start Redis and the app services (Postgres is external — set `DATABASE_URL` in `.env`):

```bash
docker-compose up -d
```

3. Set up the database:

```bash
cd packages/db
bunx prisma generate
bunx prisma db push
```

### Running locally

To start Frontend, Backend, WS, Engine, and Poller in development:

```bash
turbo dev
```

Services:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| WebSocket | ws://localhost:8081 |

Docker Compose also runs **nginx** (ports 80/443), routing `/api` → backend and `/ws` → the WebSocket server.
