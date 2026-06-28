# VYBE — Launch Playbook (Android-first)

Step-by-step to wire every service and ship to Google Play. Code for photo
uploads, push, calls, and Google Sign-In is implemented; this covers the
external setup, env, deploy, and store submission.

---

## 0. Prerequisites
- Node 20+, an EAS/Expo account, a domain you control, a Google Cloud project,
  and accounts for the providers below.
- Install deps: `npm install` (root). API also needs `cd apps/api && npx prisma generate`.

## 1. Provision services → fill `apps/api/.env` (template: `apps/api/.env.production`)

| Service | Provider (suggested) | Env vars |
|---|---|---|
| Postgres | Neon / Supabase / RDS | `DATABASE_URL` |
| Redis | Upstash / ElastiCache | `REDIS_URL` |
| JWT | — (`openssl rand -base64 48` ×2) | `JWT_SECRET`, `JWT_REFRESH_SECRET` |
| SMS OTP | Twilio (+ A2P/DLT reg.) | `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` |
| Calls | Agora | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` |
| Photo storage | Cloudflare R2 / AWS S3 | `STORAGE_BUCKET/REGION/ENDPOINT/ACCESS_KEY/SECRET_KEY/CDN_URL` |
| Google Sign-In | Google Cloud OAuth | `GOOGLE_CLIENT_ID_WEB/ANDROID/IOS` |

Also set `NODE_ENV=production` and `CORS_ORIGIN=https://<your-domain>`.

### DB migration (required — new fields: `email`, `googleId`, optional `phone`)
```bash
cd apps/api
npx prisma migrate deploy   # prod (or `migrate dev --name google_auth` in dev)
npx prisma generate
```

### Storage bucket
- R2: create bucket, an API token, and a public/custom domain → `STORAGE_CDN_URL`.
  Set `STORAGE_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`, `STORAGE_REGION=auto`.
- S3: create bucket + IAM key + CloudFront; leave `STORAGE_ENDPOINT` empty.
- Set bucket CORS to allow `PUT` from the app origin (presigned uploads).

### Google OAuth (Sign-In)
- Google Cloud Console → OAuth consent screen (External, add scopes email/profile).
- Create credentials: **Web** client ID (used as audience + Expo web), **Android**
  client ID (package `com.vybeon.app` + the EAS keystore **SHA-1** from step 4).
- Put all client IDs in both `apps/api/.env` (`GOOGLE_CLIENT_ID_*`) and the mobile
  env (`EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`).

## 2. Deploy the API (websocket-capable, long-lived)
- Host on Render / Railway / Fly.io / ECS (not pure serverless). Use `apps/api/Dockerfile`.
- Terminate TLS at a domain: `https://api.<domain>` + `wss://api.<domain>`
  (the provided `infra/nginx.conf` works as a reverse proxy if self-hosting).
- Inject all `.env` values as host secrets. Verify the server boots and a socket connects.

## 3. Configure the mobile build (template: `apps/mobile/.env.example`)
Set as EAS env/secrets:
```
EXPO_PUBLIC_API_URL=https://api.<domain>/api
EXPO_PUBLIC_SOCKET_URL=wss://api.<domain>
EXPO_PUBLIC_AGORA_APP_ID=...
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=...
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=...
```

## 4. Build & submit (Android)
```bash
cd apps/mobile
eas login
eas build --platform android --profile production   # AAB
# → copy the keystore SHA-1 into the Google OAuth Android client (step 1)
eas submit --platform android                        # track: internal → promote to production
```
- Google Play Console ($25 once), package `com.vybeon.app`.
- Prepare: privacy policy + terms URLs (already linked in the login screen — they must
  resolve), 18+ age gate, and the Data Safety form (dating/social apps get extra review).

## 5. Verify end-to-end (see also the plan's Verification section)
1. OTP login sends a real SMS; Google Sign-In returns tokens + creates a user.
2. Add a profile photo → it uploads to storage and renders from the CDN URL.
3. Two sessions: ping/message shows in-app online; backgrounded recipient gets a push.
4. Start an Agora call between two users (real token, not the placeholder).
5. Repeat on the production AAB pointed at the deployed API.

## Lead-time items — start first
- **Twilio A2P 10DLC / DLT** registration (days–weeks; required for many countries).
- **Google OAuth** verification if you request sensitive scopes.
