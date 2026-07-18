import crypto from "crypto";
import type { Env } from "../env.js";

/**
 * WebRTC ICE server generation for a self-hosted coturn TURN/STUN server.
 *
 * Uses coturn's long-term-credential REST mechanism (`use-auth-secret` /
 * `static-auth-secret`): the server issues short-lived credentials derived from
 * a shared secret, so no per-user accounts are stored in coturn.
 *
 *   username   = "<unixExpiry>:<userId>"
 *   credential = base64( HMAC-SHA1( secret, username ) )
 *
 * coturn recomputes the same HMAC to validate — the secret never leaves the
 * servers. See coturn's `turnserver.conf` `use-auth-secret` docs.
 */

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

/** Google's public STUN — always safe as a fallback for host/srflx discovery. */
const GOOGLE_STUN = "stun:stun.l.google.com:19302";

/**
 * Build the ICE server list for a given user. TURN entries are only added when
 * `TURN_HOST` + `TURN_SECRET` are configured; otherwise only STUN is returned
 * (works on many networks, fails on symmetric NAT — not production-viable).
 */
export function buildIceServers(env: Env, userId: string, ttlSeconds = 3600): IceServer[] {
  const servers: IceServer[] = [{ urls: [GOOGLE_STUN] }];

  const host = env.TURN_HOST;
  const secret = env.TURN_SECRET;
  if (!host || !secret) return servers;

  const port = env.TURN_PORT ?? 3478;
  const tlsPort = env.TURN_TLS_PORT ?? 5349;

  // Time-limited credential valid for `ttlSeconds`.
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:${userId}`;
  const credential = crypto.createHmac("sha1", secret).update(username).digest("base64");

  // Own STUN (helps when Google STUN is blocked).
  servers.push({ urls: [`stun:${host}:${port}`] });

  // TURN over UDP + TCP (relay fallback when P2P fails).
  servers.push({
    urls: [`turn:${host}:${port}?transport=udp`, `turn:${host}:${port}?transport=tcp`],
    username,
    credential,
  });

  // TURNS (TLS) — traverses restrictive firewalls that only allow 443/tls.
  if (env.TURN_TLS_ENABLED) {
    servers.push({
      urls: [`turns:${host}:${tlsPort}?transport=tcp`],
      username,
      credential,
    });
  }

  return servers;
}
