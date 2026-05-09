# VYBEON monorepo

Production-oriented scaffold for **VYBEON**: real-time, consent-first nearby discovery with a dark nightlife design system, Fastify + Prisma API, Redis GEO, Socket.io, and an Expo (React Native) client.

## Structure

- `apps/mobile` — Expo Router + NativeWind + Zustand + TanStack Query + socket.io-client
- `apps/api` — Fastify + Prisma + PostgreSQL + Redis GEO + Socket.io + JWT + Zod
- `packages/types` — shared TypeScript types
- `packages/ui` — shared React Native UI primitives (glass cards, radar dots, chat bubbles)
- `infra` — `docker-compose.yml` and `.env.example`

## Prerequisites

- Node.js 20+
- npm 10+ (workspaces)
- Docker (optional, for Postgres + Redis + API image)

## Install

```bash
npm install
npm run build -w @vybeon/types
npm run build -w @vybeon/ui
```

## Database & cache

Start infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

Copy `infra/.env.example` (or `apps/api/.env.example`) to `apps/api/.env` and adjust if needed. Then:

```bash
cd apps/api
npx prisma generate
npx prisma db push
npm run db:seed
```

Or from repo root:

```bash
npm run db:push
npm run db:seed
```

## Run API

```bash
npm run dev:api
```

Health check: `GET http://localhost:4000/health`

- OTP dev flow: `POST /auth/send-otp` then `POST /auth/verify-otp` with code **`123456`**.

## Run mobile

```bash
cd apps/mobile
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to your machine’s LAN IP when testing on device (e.g. `http://192.168.1.10:4000`).

## Docker (API + Postgres + Redis)

```bash
docker compose -f infra/docker-compose.yml up --build
```

Ensure `JWT_SECRET` is overridden in real deployments.

## Safety & privacy notes

- Nearby responses use **distance buckets** only; exact coordinates are not returned for other users.
- Redis GEO entries expire per `LOCATION_TTL_SECONDS` (default 5 minutes) via companion TTL keys.
- Video calls require **verified** profile server-side; chats/calls assume mutual acceptance flows in the product layer.

## Scripts

| Script        | Description                              |
| ------------- | ---------------------------------------- |
| `npm run dev:api`   | Fastify API in watch mode          |
| `npm run dev:mobile`| Expo dev server                    |
| `npm run db:push`   | `prisma db push` for API workspace |
| `npm run db:seed`   | Seed demo users/places             |
| `npm run build`     | Build types, UI, API               |
