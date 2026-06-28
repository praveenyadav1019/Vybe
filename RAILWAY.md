# Deploy the VYBE API to Railway

The API ships with a Docker build and `railway.json` at the repo root. Railway
builds `apps/api/Dockerfile`, runs the Prisma migrations, then starts the server.

## 1. Create the project
1. Push this repo to GitHub (Railway deploys from a repo).
2. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
3. Railway auto-detects `railway.json` and builds with the Dockerfile.

## 2. Add managed datastores (Railway plugins)
In the same project:
- **+ New → Database → PostgreSQL** → exposes `DATABASE_URL`.
- **+ New → Database → Redis** → exposes `REDIS_URL`.

Then reference them on the **API service → Variables**:
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
REDIS_URL    = ${{Redis.REDIS_URL}}
```

## 3. Set service variables (API service → Variables)
Required:
```
NODE_ENV=production
PORT=4000                       # matches the Dockerfile EXPOSE + healthcheck
CORS_ORIGIN=https://<your-app-or-web-origin>
JWT_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>

# Twilio (paste the real Auth Token to activate Verify)
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>
TWILIO_VERIFY_SERVICE_SID=<your-verify-service-sid>
TWILIO_MESSAGING_SERVICE_SID=<your-messaging-service-sid>

# Agora
AGORA_APP_ID=<your-agora-app-id>
AGORA_APP_CERTIFICATE=<your-agora-app-certificate>   # secret — Railway Variables only
```
Optional (enable as you wire them):
```
# Storage for photo uploads (Cloudflare R2 / S3)
STORAGE_BUCKET=...     STORAGE_REGION=auto     STORAGE_ENDPOINT=...
STORAGE_ACCESS_KEY=... STORAGE_SECRET_KEY=...  STORAGE_CDN_URL=...

# Google Sign-In
GOOGLE_CLIENT_ID_WEB=...   GOOGLE_CLIENT_ID_ANDROID=...
```

> ⚠️ Do not commit these. Set them only in Railway's Variables UI. Rotate the
> Twilio/Agora secrets that were shared in chat before going public.

## 4. Expose a public URL
- API service → **Settings → Networking → Generate Domain**.
- You'll get `https://<name>.up.railway.app`. WebSockets (Socket.io) work over it.

## 5. Point the mobile app at it
In `apps/mobile/.env` (and your EAS env/secrets):
```
EXPO_PUBLIC_API_URL=https://<name>.up.railway.app/api
EXPO_PUBLIC_SOCKET_URL=wss://<name>.up.railway.app
```

## 6. Verify
- Open `https://<name>.up.railway.app/health` → should return ok.
- Railway deploy logs show `prisma migrate deploy` applying `…_add_google_auth`, then
  `🚀 VYBEON API listening`.
- From the app: request an OTP (real SMS once the Twilio token is set), and start a
  call (Agora token now signed server-side).

## Notes
- **Migrations run automatically** on every deploy via the `startCommand` in
  `railway.json` (`prisma migrate deploy && node dist/index.js`).
- **Build context** is the repo root (the Dockerfile copies `packages/types` + `apps/api`).
- If a deploy fails on migration, Railway keeps the previous healthy deploy.
