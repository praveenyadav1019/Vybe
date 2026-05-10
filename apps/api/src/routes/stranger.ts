import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const preferencesBody = z.object({
  strangerMode: z.enum(["text", "video", "audio"]).optional(),
  genderPref:   z.enum(["everyone", "male", "female"]).optional(),
  nearbyOnly:   z.boolean().optional(),
  country:      z.string().max(4).optional(),
  allowStrangers: z.boolean().optional(),
  privacyLevel: z.enum(["public", "verified-only", "private"]).optional(),
  maxRadiusM:   z.number().int().min(100).max(50000).optional(),
});

const reportSessionBody = z.object({
  sessionId: z.string().min(1),
  reason:    z.enum(["nudity", "harassment", "underage", "spam", "other"]),
  details:   z.string().max(500).optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

const strangerRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /stranger/preferences
   * Return the authenticated user's stranger-chat preferences.
   */
  app.get("/stranger/preferences", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const pref = await app.prisma.userPreference.upsert({
      where:  { userId },
      create: { userId },
      update: {},
    });

    return { preference: pref };
  });

  /**
   * PATCH /stranger/preferences
   * Update stranger-chat preferences.
   */
  app.patch("/stranger/preferences", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    let body: z.infer<typeof preferencesBody>;

    try {
      body = preferencesBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "Invalid preference values" });
    }

    const pref = await app.prisma.userPreference.upsert({
      where:  { userId },
      create: { userId, ...body },
      update: body,
    });

    return { preference: pref };
  });

  /**
   * GET /stranger/sessions
   * Paginated history of the user's completed stranger sessions.
   */
  app.get("/stranger/sessions", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);
    const query  = req.query as Record<string, string>;
    const page   = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit  = Math.min(30, parseInt(query.limit ?? "20", 10));
    const skip   = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      app.prisma.strangerSession.findMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          status: { not: "active" },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          mode: true,
          status: true,
          duration: true,
          skipCount: true,
          createdAt: true,
          endedAt: true,
          _count: { select: { messages: true } },
        },
      }),
      app.prisma.strangerSession.count({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          status: { not: "active" },
        },
      }),
    ]);

    return { sessions, total, page, limit, hasMore: skip + sessions.length < total };
  });

  /**
   * POST /stranger/report
   * Report abuse within a stranger session.
   */
  app.post("/stranger/report", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    let body: z.infer<typeof reportSessionBody>;

    try {
      body = reportSessionBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "Invalid report body" });
    }

    // Verify user was part of this session
    const session = await app.prisma.strangerSession.findFirst({
      where: {
        id: body.sessionId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });

    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }

    // Rate-limit: max 10 reports per user per hour
    const rlKey = `vybeon:stranger_report_rl:${userId}`;
    const count = await app.redis.incr(rlKey);
    if (count === 1) await app.redis.expire(rlKey, 3600);
    if (count > 10) {
      return reply.status(429).send({ error: "Too many reports. Please slow down." });
    }

    const flag = await app.prisma.videoModerationFlag.create({
      data: {
        sessionId:  body.sessionId,
        reporterId: userId,
        reason:     body.reason,
        details:    body.details,
        severity:   body.reason === "underage" || body.reason === "nudity" ? "critical" : "medium",
      },
    });

    // Critical flags: immediately suspend the session
    if (flag.severity === "critical") {
      await app.prisma.strangerSession.update({
        where: { id: body.sessionId },
        data:  { status: "reported", endedAt: new Date(), endedBy: "system" },
      });

      // Notify the other party's socket to end the session
      const partnerId = session.userAId === userId ? session.userBId : session.userAId;
      if (app.io) {
        app.io.to(`user:${partnerId}`).emit("stranger:session-ended", {
          sessionId: body.sessionId,
          reason: "reported",
        });
      }

      // Cleanup Redis session state
      await app.redis.del(
        `stranger:session:${userId}`,
        `stranger:session:${partnerId}`
      );
    }

    return reply.send({ ok: true, flagId: flag.id });
  });

  /**
   * GET /stranger/stats
   * Public stats for the "random chat" lobby screen (queue depth, online count).
   */
  app.get("/stranger/stats", { preHandler: [app.authenticate] }, async () => {
    const [queueSize, onlineCount] = await Promise.all([
      app.redis.scard("stranger:queued"),
      app.prisma.user.count({ where: { isOnline: true } }),
    ]);

    return { queueSize, onlineCount };
  });
};

export default strangerRoutes;
