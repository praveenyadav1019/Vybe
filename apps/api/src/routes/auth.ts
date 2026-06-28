import type { FastifyPluginAsync, FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { isVerifyConfigured, startVerification, checkVerification } from "../lib/twilio.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const sendOtpBody = z.object({
  /** E.164 phone number, e.g. +919876543210 */
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Phone must be E.164 format"),
});

const verifyOtpBody = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  code: z.string().length(6).regex(/^\d{6}$/),
  deviceId: z.string().min(8).max(128),
  deviceName: z.string().max(64).optional(),
  platform: z.enum(["ios", "android", "web"]).optional(),
});

const refreshBody = z.object({
  refreshToken: z.string().min(10),
});

const logoutBody = z.object({
  refreshToken: z.string().min(10),
});

const googleBody = z.object({
  idToken: z.string().min(20),
  deviceId: z.string().min(8).max(128),
  deviceName: z.string().max(64).optional(),
  platform: z.enum(["ios", "android", "web"]).optional(),
});

const MODE_MAP: Record<string, string> = {
  dating: "dating", hook: "hook",
  co_travel: "co-travel", night_out: "night-out",
  club_mates: "club-mates", happening: "happening",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  // Cryptographically random 6-digit OTP
  return String(crypto.randomInt(100000, 999999));
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

/** OTP rate-limit: max 3 sends per phone per 10 minutes */
async function checkOtpRateLimit(
  redis: { incr(k: string): Promise<number>; expire(k: string, s: number): Promise<number> },
  phone: string
): Promise<boolean> {
  const key = `vybeon:otp_rl:${phone}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 600); // 10 minutes
  }
  return count <= 3;
}

/**
 * Create a device session, sign an access token, mark online, and build the
 * standard auth response. Shared by phone-OTP and Google sign-in.
 */
async function issueSession(
  app: FastifyInstance,
  reply: FastifyReply,
  user: { id: string; phone: string | null; createdAt: Date },
  isNewUser: boolean,
  device: { deviceId: string; deviceName?: string; platform?: string }
) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await app.prisma.deviceSession.create({
    data: {
      userId: user.id,
      refreshToken,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      platform: device.platform,
      expiresAt,
    },
  });

  const accessToken = await reply.jwtSign(
    { sub: user.id, phone: user.phone ?? undefined },
    { expiresIn: app.env.JWT_EXPIRES_IN ?? "15m" }
  );

  await app.redis.set(`vybeon:online:${user.id}`, "1", "EX", 300);

  const profile = await app.prisma.profile.findUnique({ where: { userId: user.id } });

  return {
    ok: true,
    accessToken,
    refreshToken,
    expiresIn: 900,
    userId: user.id,
    isNewUser,
    user: {
      id: user.id,
      phone: user.phone ?? "",
      name: profile?.name ?? "",
      age: profile?.age ?? 0,
      gender: profile?.gender ?? "prefer-not-to-say",
      bio: profile?.bio ?? undefined,
      photos: profile?.photos ?? [],
      interests: profile?.interests ?? [],
      isVerified: profile?.verified ?? false,
      isPremium: false,
      activeMode: MODE_MAP[profile?.mode ?? "happening"] ?? "happening",
      isOnline: true,
      lastSeen: new Date().toISOString(),
      safetyMode: profile?.safetyMode ?? false,
      privacyLevel: "public",
      createdAt: user.createdAt.toISOString(),
    },
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /auth/send-otp
   * Generate and send a 6-digit OTP to the given phone number.
   */
  app.post("/auth/send-otp", async (req, reply) => {
    let body: z.infer<typeof sendOtpBody>;
    try {
      body = sendOtpBody.parse(req.body);
    } catch (err) {
      return reply.status(400).send({ error: "Invalid phone number format (E.164 required)" });
    }

    // Rate limit
    const allowed = await checkOtpRateLimit(app.redis, body.phone);
    if (!allowed) {
      return reply.status(429).send({ error: "Too many OTP requests. Please wait 10 minutes." });
    }

    // Preferred path: Twilio Verify generates, delivers & tracks the OTP itself.
    if (isVerifyConfigured(app.env)) {
      try {
        await startVerification(app.env, body.phone);
      } catch (err) {
        app.log.error({ err }, "Twilio Verify start failed");
        return reply.status(500).send({ error: "Failed to send OTP. Please try again." });
      }
      return reply.send({ ok: true, expiresIn: 600 });
    }

    // Invalidate any existing unused OTPs for this phone
    await app.prisma.otpCode.updateMany({
      where: { phone: body.phone, used: false },
      data: { used: true },
    });

    // Generate new OTP – always 123456 in development for easy testing
    const code = app.env.NODE_ENV === "development" ? "123456" : generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await app.prisma.otpCode.create({
      data: { phone: body.phone, code, expiresAt },
    });

    // Send via Twilio in production
    if (app.env.NODE_ENV === "production") {
      const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = app.env;
      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
        try {
          // Dynamic import to avoid loading Twilio in dev
          const twilio = await import("twilio");
          const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: `Your VYBEON verification code is: ${code}. Expires in 10 minutes.`,
            from: TWILIO_PHONE_NUMBER,
            to: body.phone,
          });
        } catch (smsErr) {
          app.log.error({ err: smsErr }, "Failed to send OTP SMS");
          return reply.status(500).send({ error: "Failed to send OTP. Please try again." });
        }
      }
    } else {
      app.log.info({ phone: body.phone, code }, "DEV OTP (not sending SMS)");
    }

    return reply.send({
      ok: true,
      expiresIn: 600,
      // Only expose code in development for testing
      ...(app.env.NODE_ENV === "development" && { devCode: code }),
    });
  });

  /**
   * POST /auth/verify-otp
   * Verify OTP and return access + refresh tokens.
   */
  app.post("/auth/verify-otp", async (req, reply) => {
    let body: z.infer<typeof verifyOtpBody>;
    try {
      body = verifyOtpBody.parse(req.body);
    } catch (err) {
      return reply.status(400).send({ error: "Invalid request body" });
    }

    // Preferred path: verify the code with Twilio Verify.
    if (isVerifyConfigured(app.env)) {
      let approved = false;
      try {
        approved = await checkVerification(app.env, body.phone, body.code);
      } catch (err) {
        app.log.error({ err }, "Twilio Verify check failed");
        return reply.status(400).send({ error: "Could not verify code. Request a new one." });
      }
      if (!approved) {
        return reply.status(400).send({ error: "Invalid or expired code." });
      }

      let isNewUser = false;
      let user = await app.prisma.user.findUnique({ where: { phone: body.phone } });
      if (!user) {
        user = await app.prisma.user.create({
          data: { phone: body.phone, subscription: { create: { plan: "free" } } },
        });
        isNewUser = true;
      }

      const response = await issueSession(app, reply, user, isNewUser, {
        deviceId: body.deviceId,
        deviceName: body.deviceName,
        platform: body.platform,
      });
      return reply.send(response);
    }

    // Find the most recent unused OTP for this phone
    const otpRecord = await app.prisma.otpCode.findFirst({
      where: {
        phone: body.phone,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return reply.status(400).send({ error: "OTP expired or not found. Request a new code." });
    }

    if (otpRecord.attempts >= 5) {
      // Mark as used to prevent further attempts
      await app.prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
      return reply.status(400).send({ error: "Too many failed attempts. Request a new OTP." });
    }

    if (otpRecord.code !== body.code) {
      await app.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 4 - otpRecord.attempts;
      return reply.status(400).send({ error: `Invalid code. ${remaining} attempt(s) remaining.` });
    }

    // Mark OTP as used
    await app.prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

    // Find or create the user
    let isNewUser = false;
    let user = await app.prisma.user.findUnique({ where: { phone: body.phone } });

    if (!user) {
      user = await app.prisma.user.create({
        data: {
          phone: body.phone,
          subscription: { create: { plan: "free" } },
        },
      });
      isNewUser = true;
    }

    // Issue session + tokens
    const response = await issueSession(app, reply, user, isNewUser, {
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      platform: body.platform,
    });
    return reply.send(response);
  });

  /**
   * POST /auth/google
   * Verify a Google ID token and issue VYBEON tokens (find-or-create by email).
   */
  app.post("/auth/google", async (req, reply) => {
    let body: z.infer<typeof googleBody>;
    try {
      body = googleBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "idToken and deviceId are required" });
    }

    const audiences = [
      app.env.GOOGLE_CLIENT_ID_WEB,
      app.env.GOOGLE_CLIENT_ID_ANDROID,
      app.env.GOOGLE_CLIENT_ID_IOS,
    ].filter(Boolean) as string[];

    if (!audiences.length) {
      return reply.status(503).send({ error: "Google Sign-In is not configured" });
    }

    // Verify the ID token against Google.
    let payload: { sub?: string; email?: string; email_verified?: boolean } | undefined;
    try {
      const { OAuth2Client } = await import("google-auth-library");
      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({ idToken: body.idToken, audience: audiences });
      payload = ticket.getPayload();
    } catch {
      return reply.status(401).send({ error: "Invalid Google token" });
    }

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return reply.status(401).send({ error: "Google account email not verified" });
    }

    // Find or create the user by googleId/email.
    let isNewUser = false;
    let user = await app.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
    });

    if (!user) {
      user = await app.prisma.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          subscription: { create: { plan: "free" } },
        },
      });
      isNewUser = true;
    } else if (!user.googleId) {
      // Link Google to an existing (phone) account sharing the email.
      user = await app.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    const response = await issueSession(app, reply, user, isNewUser, {
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      platform: body.platform,
    });
    return reply.send(response);
  });

  /**
   * POST /auth/refresh
   * Exchange a refresh token for a new access token.
   */
  app.post("/auth/refresh", async (req, reply) => {
    let body: z.infer<typeof refreshBody>;
    try {
      body = refreshBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "refreshToken is required" });
    }

    const session = await app.prisma.deviceSession.findUnique({
      where: { refreshToken: body.refreshToken },
      include: { user: true },
    });

    if (!session) {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }

    if (session.expiresAt < new Date()) {
      await app.prisma.deviceSession.delete({ where: { id: session.id } });
      return reply.status(401).send({ error: "Refresh token expired. Please log in again." });
    }

    const accessToken = await reply.jwtSign(
      { sub: session.userId, phone: session.user.phone ?? undefined },
      { expiresIn: app.env.JWT_EXPIRES_IN ?? "15m" }
    );

    return reply.send({ ok: true, accessToken, expiresIn: 900 });
  });

  /**
   * POST /auth/logout
   * Invalidate the given refresh token / device session.
   */
  app.post("/auth/logout", { preHandler: [app.authenticate] }, async (req, reply) => {
    let body: z.infer<typeof logoutBody>;
    try {
      body = logoutBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "refreshToken is required" });
    }

    const userId = (req.user as { sub: string }).sub;

    await app.prisma.deviceSession.deleteMany({
      where: { userId, refreshToken: body.refreshToken },
    });

    // Mark offline in Redis
    await app.redis.del(`vybeon:online:${userId}`);
    await app.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });

    return reply.send({ ok: true });
  });
};

export default authRoutes;
