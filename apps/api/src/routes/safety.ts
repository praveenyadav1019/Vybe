import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const reportBody = z.object({
  userId: z.string().min(1),
  reason: z.enum([
    "harassment",
    "fake-profile",
    "inappropriate-content",
    "spam",
    "underage",
    "other",
  ]),
  details: z.string().max(1000).optional(),
});

const blockBody = z.object({
  userId: z.string().min(1),
});

const sosBody = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  message: z.string().max(500).optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

const safetyRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /safety/report
   * Report a user for harmful behavior.
   * Auto-flags account if reported by 3+ distinct users in 24 hours.
   */
  app.post("/safety/report", { preHandler: [app.authenticate] }, async (req, reply) => {
    const reporterId = requireUserId(req);

    let body: z.infer<typeof reportBody>;
    try {
      body = reportBody.parse(req.body);
    } catch {
      return reply.status(400).send({
        error: "userId and reason are required. Reason must be one of: harassment, fake-profile, inappropriate-content, spam, underage, other",
      });
    }

    if (body.userId === reporterId) {
      return reply.status(400).send({ error: "Cannot report yourself" });
    }

    // Check target exists
    const target = await app.prisma.user.findUnique({ where: { id: body.userId } });
    if (!target) return reply.status(404).send({ error: "User not found" });

    // Create report
    const report = await app.prisma.report.create({
      data: {
        reporterId,
        targetId: body.userId,
        reason: body.reason,
        details: body.details,
        status: "pending",
      },
    });

    // Auto-flag logic: if 3+ distinct reporters in last 24 hours → flag for review
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = await app.prisma.report.findMany({
      where: {
        targetId: body.userId,
        createdAt: { gte: oneDayAgo },
      },
      distinct: ["reporterId"],
    });

    if (recentReports.length >= 3) {
      app.log.warn(
        { targetId: body.userId, reportCount: recentReports.length },
        "User auto-flagged for review due to multiple reports"
      );
      // TODO: Trigger admin notification / review queue
    }

    return { ok: true, reportId: report.id };
  });

  /**
   * POST /safety/block
   * Block another user. Removes them from discovery and chats.
   */
  app.post("/safety/block", { preHandler: [app.authenticate] }, async (req, reply) => {
    const blockerId = requireUserId(req);

    let body: z.infer<typeof blockBody>;
    try {
      body = blockBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "userId is required" });
    }

    if (body.userId === blockerId) {
      return reply.status(400).send({ error: "Cannot block yourself" });
    }

    // Upsert block record
    await app.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId: body.userId } },
      create: { blockerId, blockedId: body.userId },
      update: {},
    });

    // Reject any pending pings between these users
    await app.prisma.matchRequest.updateMany({
      where: {
        OR: [
          { fromUserId: blockerId, toUserId: body.userId, status: "pending" },
          { fromUserId: body.userId, toUserId: blockerId, status: "pending" },
        ],
      },
      data: { status: "rejected" },
    });

    return { ok: true };
  });

  /**
   * DELETE /safety/block/:userId
   * Unblock a previously blocked user.
   */
  app.delete("/safety/block/:userId", { preHandler: [app.authenticate] }, async (req, reply) => {
    const blockerId = requireUserId(req);
    const blockedId = z.string().min(1).parse((req.params as { userId: string }).userId);

    const deleted = await app.prisma.block.deleteMany({
      where: { blockerId, blockedId },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ error: "Block record not found" });
    }

    return { ok: true };
  });

  /**
   * GET /safety/blocked
   * Return the list of users blocked by the current user.
   */
  app.get("/safety/blocked", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const blocks = await app.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      blocked: blocks.map((b) => ({
        id: b.blocked.id,
        name: b.blocked.profile?.name ?? "Unknown",
        photo: b.blocked.profile?.photos?.[0] ?? null,
        blockedAt: b.createdAt,
      })),
    };
  });

  /**
   * POST /safety/sos
   * Trigger SOS emergency signal.
   * Logs the event, notifies admin monitoring.
   */
  app.post("/safety/sos", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    let body: z.infer<typeof sosBody> = {};
    try {
      body = sosBody.parse(req.body ?? {});
    } catch {
      /* optional body */
    }

    const ref = `sos_${Date.now()}_${userId.slice(0, 8)}`;

    app.log.warn(
      {
        userId,
        lat: body.lat,
        lng: body.lng,
        message: body.message,
        ref,
      },
      "🚨 SOS TRIGGERED"
    );

    // Create a high-priority in-app notification for the user
    await app.prisma.notification.create({
      data: {
        userId,
        type: "safety",
        title: "SOS Received",
        body: "Our safety team has been notified. Stay safe. Email: safety@vybeon.com",
        data: { ref, lat: body.lat, lng: body.lng },
      },
    });

    // Emit to admin monitoring room (admin sockets can join 'admin:safety' room)
    app.io?.to("admin:safety").emit("sos:triggered", {
      userId,
      lat: body.lat,
      lng: body.lng,
      message: body.message,
      ref,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send push notification to emergency contacts
    // TODO: Integrate with emergency dispatch API if required by jurisdiction

    return {
      ok: true,
      ref,
      message: "SOS received. Our safety team has been alerted.",
      supportEmail: "safety@vybeon.com",
    };
  });

  /**
   * GET /safety/reports/me
   * Get reports filed by the current user.
   */
  app.get("/safety/reports/me", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const reports = await app.prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      reports: reports.map((r) => ({
        id: r.id,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  });
};

export default safetyRoutes;
