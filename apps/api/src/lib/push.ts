import type { FastifyInstance } from "fastify";

/**
 * Expo push notifications (best-effort).
 *
 * Tokens are registered by the mobile client via `PATCH /me/push-token`.
 * Sending is fire-and-forget: a missing/invalid token or a transport error is
 * swallowed so it never blocks the realtime path (same spirit as the
 * Twilio/Agora graceful fallbacks).
 */

// Lazily constructed Expo client (keeps the SDK off the startup path).
let expoClient: unknown = null;

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Send a single push notification. No-op if the token is missing/invalid. */
export async function sendPush(
  pushToken: string | null | undefined,
  msg: PushMessage,
): Promise<void> {
  if (!pushToken) return;
  try {
    const { Expo } = await import("expo-server-sdk");
    if (!Expo.isExpoPushToken(pushToken)) return;
    if (!expoClient) expoClient = new Expo();
    const expo = expoClient as InstanceType<typeof Expo>;
    await expo.sendPushNotificationsAsync([
      {
        to: pushToken,
        sound: "default",
        title: msg.title,
        body: msg.body,
        data: msg.data ?? {},
      },
    ]);
  } catch {
    // best-effort — never throw into the caller
  }
}

/**
 * Notify a user via push only if they are currently offline (no live socket).
 * Online users already receive the in-app socket event.
 */
export async function notifyIfOffline(
  app: FastifyInstance,
  userId: string,
  msg: PushMessage,
): Promise<void> {
  try {
    const online = await app.redis.exists(`vybeon:online:${userId}`);
    if (online) return;
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    await sendPush(user?.pushToken, msg);
  } catch (e) {
    app.log.warn(e, "notifyIfOffline failed");
  }
}
