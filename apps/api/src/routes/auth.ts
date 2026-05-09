import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import crypto from "crypto";

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

    // Issue tokens
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await app.prisma.deviceSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceId: body.deviceId,
        deviceName: body.deviceName,
        platform: body.platform,
        expiresAt,
      },
    });

    // Sign access token via @fastify/jwt (sub = userId)
    const accessToken = await reply.jwtSign(
      { sub: user.id, phone: user.phone },
      { expiresIn: app.env.JWT_EXPIRES_IN ?? "15m" }
    );

    // Set user online in Redis
    await app.redis.set(`vybeon:online:${user.id}`, "1", "EX", 300);

    // Fetch profile for response
    const profile = await app.prisma.profile.findUnique({ where: { userId: user.id } });

    return reply.send({
      ok: true,
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      userId: user.id,
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        name: profile?.name ?? null,
        age: profile?.age ?? null,
        photos: profile?.photos ?? [],
        verified: profile?.verified ?? false,
        mode: profile?.mode ?? "happening",
        isOnline: true,
      },
    });
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
      { sub: session.userId, phone: session.user.phone },
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
