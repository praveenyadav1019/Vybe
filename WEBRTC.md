# VYBEON — Self-Hosted WebRTC (Agora/Twilio Removed)

Voice/video calling now runs entirely on **react-native-webrtc + Socket.IO signaling + coturn (STUN/TURN)**. No third-party RTC provider. Agora and Twilio have been fully removed from source.

## Architecture

```
User A ──┐
         ├─ Socket.IO (JWT auth)  ── matchmaking (stranger) / call:request (1:1)
User B ──┘
             │  webrtc:offer / webrtc:answer / webrtc:ice   (1:1 calls)
             │  stranger:webrtc-offer / -answer / -ice        (random chat)
             ▼
   RTCPeerConnection ⇄ RTCPeerConnection   (direct P2P)
             │
             └─ if P2P blocked → relay via coturn TURN
```

- **Signaling** already lived in `apps/api/src/socket.ts` (unchanged relays).
- **ICE servers** (STUN + short-lived TURN creds) come from the API:
  - 1:1 calls: `GET /calls/:id/ice` and in `/calls/request` + `/calls/:id/accept` responses.
  - Stranger video: emitted on `stranger:video-ready` after `stranger:upgrade-video`.
- TURN credentials use coturn's `use-auth-secret` REST scheme — see `apps/api/src/lib/ice.ts`.

## Client (mobile)

- `src/lib/rtc/useWebRTCCall.native.ts` — the peer-connection engine (getUserMedia, SDP negotiation, ICE, controls). Web/Expo Go get the no-op `useWebRTCCall.ts`.
- `src/lib/rtc/RTCVideoView.native.tsx` — renders a `MediaStream` via `RTCView`.
- `src/lib/rtc/signaling.ts` — `callSignaling()` / `strangerSignaling()` adapters over the socket.
- Controls wired: **Mute, Camera on/off, Flip camera, End**. `setSpeaker` is a **no-op placeholder** — earpiece/speaker routing needs `react-native-incall-manager` (not added, to limit native deps).

> **react-native-webrtc is a native module** → requires an EAS dev/production build. It does **not** run in Expo Go.

## Deploying coturn (required for real networks)

WebRTC across mobile data ↔ wifi needs TURN on a **public IP**. On your VPS:

1. Open firewall: **3478/udp+tcp**, **5349/tcp** (TLS), and **49160–49200/udp** (relay range).
2. Set env (root `.env`, see `.env.example`):
   ```
   TURN_HOST=turn.yourdomain.com      # or public IP
   TURN_SECRET=<long random secret>   # same value for API + coturn
   TURN_EXTERNAL_IP=<server public IP>
   TURN_TLS_ENABLED=false             # true once certs are mounted
   ```
3. Start it: `docker compose -f infra/docker-compose.yml up -d coturn`
   (config: `infra/coturn/turnserver.conf`; uses host networking).
4. For `turns://` (TLS), mount certs into `/etc/coturn/certs/` and uncomment `cert`/`pkey` in the conf, then set `TURN_TLS_ENABLED=true`.

**Verify** with Trickle ICE (https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/): add `turn:TURN_HOST:3478` with a username/credential from `/calls/:id/ice` and confirm a `relay` candidate appears.

## API env changes

Removed: `TWILIO_*`, `AGORA_*`. Added: `TURN_HOST`, `TURN_SECRET`, `TURN_REALM`, `TURN_PORT`, `TURN_TLS_PORT`, `TURN_TLS_ENABLED`.

## ⚠️ Phone-OTP SMS delivery

Twilio was the SMS provider for phone-login OTP (**not** calling). It has been removed:
- OTP endpoints still work; in **development** the code is `123456` / returned as `devCode`.
- In **production**, no SMS is delivered — wire a new SMS provider in `apps/api/src/routes/auth.ts` (`send-otp`), or rely on **Google Sign-In** for production login.

## Native rebuild + test

```
cd apps/mobile
npx expo prebuild --clean        # picks up the react-native-webrtc config plugin
npx expo run:android             # or run:ios / EAS build
```
Then: 1:1 call between two devices, and stranger "video" match → confirm both video tiles render and mute/flip/end work. Check the peer reaches `connected` (relay via coturn when on cellular).
