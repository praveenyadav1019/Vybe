import type { Env } from "../env.js";

/**
 * Twilio Verify helper (preferred OTP path).
 *
 * When a Verify Service SID is configured, Twilio generates, delivers, and
 * checks the OTP itself (handles retries, fraud, and per-country compliance).
 * If not configured, callers fall back to the local OTP flow (dev `123456`).
 */

export function isVerifyConfigured(env: Env): boolean {
  return Boolean(
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID,
  );
}

async function getClient(env: Env) {
  // Dynamic import keeps Twilio off the startup path in dev.
  const twilio = await import("twilio");
  return twilio.default(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!);
}

/** Send an OTP via Twilio Verify (SMS channel). */
export async function startVerification(env: Env, phone: string): Promise<void> {
  const client = await getClient(env);
  await client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: phone, channel: "sms" });
}

/** Check an OTP via Twilio Verify. Returns true when the code is approved. */
export async function checkVerification(
  env: Env,
  phone: string,
  code: string,
): Promise<boolean> {
  const client = await getClient(env);
  const result = await client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({ to: phone, code });
  return result.status === "approved";
}
