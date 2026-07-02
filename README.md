# Perpetual Trading Platform

Perpetual trading engine with real-time order matching, Redis Streams, crash recovery, and a scalable event-driven architecture.

## Tech Stack

- **Frontend:** React, Zunstand, Shadcn
- **Backend API:** Node.js, Express, Zod
- **Matching Engine:** Node.js (high-performance order matching)
- **Real-time:** WebSocket Server
- **Database:** PostgreSQL

## Apps and Packages

- `apps/frontend`: The React trading interface.
- `apps/backend`: The REST API handling authentication, balances, and order submissions.
- `apps/ws`: The WebSocket server streaming real-time orderbook depth and trades.
- `apps/engine`: The core matching engine that processes orders from Redis.
- `packages/db`: Prisma schema and database client.
- `packages/types`: Shared TypeScript definitions across apps.

### Installation

1. Install dependencies

```bash
bun install
```

2. Start the database and Redis using Docker:

```bash
docker-compose up -d
```

3. Setup the database (Prisma migrations):

```bash
cd packages/db
npx prisma generate
npx prisma db push
```

### Running the Platform

To start all services (Frontend, Backend, WS, and Engine) for development:

````bash
turbo dev
```

The services will start on their respective ports:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket Server: ws://localhost:8080
````
