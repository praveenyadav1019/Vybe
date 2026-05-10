import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const broadcastBody = z.object({
  placeId: z.string().min(1),
  type: z.enum(["female", "male", "couple", "group", "any"]).default("any"),
  goingAt: z.string().datetime().optional(),
  message: z.string().max(300).optional(),
});

// Compatible types matrix: who can see whose broadcast
const compatibleTypes: Record<string, string[]> = {
  female: ["any", "female", "couple", "group"],
  male: ["any", "male", "couple", "group"],
  couple: ["any", "couple", "group"],
  group: ["any", "group"],
  any: ["any", "female", "male", "couple", "group"],
};

// ─── Route plugin ─────────────────────────────────────────────────────────────

const clubmatesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /clubmates
   * Find people going to the same place.
   * Query params: placeId (required), type (optional), goingAt (optional ISO date)
   */
  app.get("/clubmates", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const query = req.query as Record<string, string>;

    const placeId = query.placeId;
    if (!placeId) return reply.status(400).send({ error: "placeId is required" });

    const filterType = query.type as string | undefined;
    const goingAtStr = query.goingAt;

    const now = new Date();
    const twelveHoursFromNow = new Date(Date.now() + 12 * 60 * 60 * 1000);

    // Get blocks
    const blocks = await app.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    const blockedIds = new Set(
      blocks.flatMap((b) => [b.blockerId, b.blockedId]).filter((id) => id !== userId)
    );

    // Get my own broadcast to determine compatible types
    const myBroadcast = await app.prisma.clubMateRequest.findFirst({
      where: {
        fromUserId: userId,
        placeId,
        status: "pending",
        createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
    });

    // Determine which types are compatible with the viewer
    const myType = myBroadcast?.type ?? filterType ?? "any";
    const allowedTypes = compatibleTypes[myType] ?? ["any", "female", "male", "couple", "group"];

    // Build goingAt filter
    let goingAtFilter: object = {};
    if (goingAtStr) {
      const goingAt = new Date(goingAtStr);
      // ±2 hours window
      goingAtFilter = {
        goingAt: {
          gte: new Date(goingAt.getTime() - 2 * 60 * 60 * 1000),
          lte: new Date(goingAt.getTime() + 2 * 60 * 60 * 1000),
        },
      };
    }

    const broadcasts = await app.prisma.clubMateRequest.findMany({
      where: {
        placeId,
        status: "pending",
        fromUserId: { notIn: [...blockedIds, userId] },
        toUserId: null, // open broadcasts (not directed at a specific user)
        type: { in: allowedTypes as ("female" | "male" | "couple" | "group" | "any")[] },
        OR: [
          // broadcast not yet expired (goingAt in future or within last 2h)
          { goingAt: { gte: now } },
          { goingAt: null, createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
        ],
        ...goingAtFilter,
      },
      include: {
        fromUser: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      broadcasts: broadcasts.map((b) => ({
        id: b.id,
        fromUserId: b.fromUserId,
        fromName: b.fromUser.profile?.name ?? "Someone",
        fromPhoto: b.fromUser.profile?.photos[0] ?? null,
        fromVerified: b.fromUser.profile?.verified ?? false,
        placeId: b.placeId,
        type: b.type,
        goingAt: b.goingAt,
        message: b.message,
        createdAt: b.createdAt,
      })),
    };
  });

  /**
   * POST /clubmates/broadcast
   * Broadcast "I'm going to X place".
   */
  app.post("/clubmates/broadcast", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    let body: z.infer<typeof broadcastBody>;
    try {
      body = broadcastBody.parse(req.body);
    } catch (err) {
      return reply.status(400).send({ error: "Invalid broadcast data", details: err });
    }

    // Check place exists
    const place = await app.prisma.place.findUnique({ where: { id: body.placeId } });
    if (!place) return reply.status(404).send({ error: "Place not found" });

    // Cancel existing active broadcasts for the same place
    await app.prisma.clubMateRequest.updateMany({
      where: {
        fromUserId: userId,
        placeId: body.placeId,
        status: "pending",
        toUserId: null,
      },
      data: { status: "expired" },
    });

    const goingAt = body.goingAt ? new Date(body.goingAt) : null;

    const broadcast = await app.prisma.clubMateRequest.create({
      data: {
        fromUserId: userId,
        placeId: body.placeId,
        type: body.type,
        goingAt,
        message: body.message ?? null,
        status: "pending",
      },
      include: {
        fromUser: { include: { profile: true } },
      },
    });

    // Notify users already at / going to this place via socket room
    app.io?.to(`venue:${body.placeId}`).emit("clubmate:new_broadcast", {
      broadcastId: broadcast.id,
      fromUserId: userId,
      fromName: broadcast.fromUser.profile?.name ?? "Someone",
      fromPhoto: broadcast.fromUser.profile?.photos[0] ?? null,
      type: broadcast.type,
      goingAt: broadcast.goingAt,
      message: broadcast.message,
    });

    return {
      broadcast: {
        id: broadcast.id,
        placeId: broadcast.placeId,
        type: broadcast.type,
        goingAt: broadcast.goingAt,
        message: broadcast.message,
        status: broadcast.status,
        createdAt: broadcast.createdAt,
      },
    };
  });

  /**
   * GET /clubmates/mine
   * My active broadcasts.
   */
  app.get("/clubmates/mine", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const broadcasts = await app.prisma.clubMateRequest.findMany({
      where: {
        fromUserId: userId,
        status: "pending",
        createdAt: { gte: twelveHoursAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      broadcasts: broadcasts.map((b) => ({
        id: b.id,
        placeId: b.placeId,
        type: b.type,
        goingAt: b.goingAt,
        message: b.message,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    };
  });

  /**
   * POST /clubmates/:id/join
   * Request to join someone's clubmate group.
   */
  app.post("/clubmates/:id/join", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const broadcastId = z
      .string()
      .min(1)
      .parse((req.params as { id: string }).id);

    const now = new Date();

    const broadcast = await app.prisma.clubMateRequest.findUnique({
      where: { id: broadcastId },
      include: { fromUser: { include: { profile: true } } },
    });

    if (!broadcast) return reply.status(404).send({ error: "Broadcast not found" });
    if (broadcast.status !== "pending")
      return reply.status(400).send({ error: "Broadcast is no longer active" });
    if (broadcast.fromUserId === userId)
      return reply.status(400).send({ error: "Cannot join your own broadcast" });

    // Prevent expired goingAt broadcasts
    if (broadcast.goingAt && broadcast.goingAt < now) {
      return reply.status(400).send({ error: "This meetup time has passed" });
    }

    // Block check
    const block = await app.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: broadcast.fromUserId },
          { blockerId: broadcast.fromUserId, blockedId: userId },
        ],
      },
    });
    if (block) return reply.status(403).send({ error: "Cannot join this broadcast" });

    // Check no existing join request
    const existingJoin = await app.prisma.clubMateRequest.findFirst({
      where: {
        fromUserId: userId,
        toUserId: broadcast.fromUserId,
        placeId: broadcast.placeId ?? undefined,
        status: { in: ["pending", "accepted"] },
      },
    });
    if (existingJoin) {
      return reply.status(409).send({ error: "You already have an active request for this broadcast" });
    }

    const joinerProfile = await app.prisma.profile.findUnique({ where: { userId } });

    // Create a directed join request
    const joinRequest = await app.prisma.clubMateRequest.create({
      data: {
        fromUserId: userId,
        toUserId: broadcast.fromUserId,
        placeId: broadcast.placeId ?? null,
        type: broadcast.type,
        goingAt: broadcast.goingAt,
        status: "pending",
        message: `Wants to join your club night at the venue`,
      },
    });

    // Notify broadcast owner via socket
    app.io?.to(`user:${broadcast.fromUserId}`).emit("clubmate:join_request", {
      requestId: joinRequest.id,
      fromUserId: userId,
      fromName: joinerProfile?.name ?? "Someone",
      fromPhoto: joinerProfile?.photos[0] ?? null,
      broadcastId,
      placeId: broadcast.placeId,
    });

    // In-app notification
    await app.prisma.notification.create({
      data: {
        userId: broadcast.fromUserId,
        type: "clubmate_join",
        title: "Someone wants to join you!",
        body: `${joinerProfile?.name ?? "Someone"} wants to join your club night`,
        data: { requestId: joinRequest.id, fromUserId: userId },
      },
    });

    return { ok: true, requestId: joinRequest.id };
  });

  /**
   * POST /clubmates/:id/accept
   * Accept a join request.
   */
  app.post("/clubmates/:id/accept", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const requestId = z
      .string()
      .min(1)
      .parse((req.params as { id: string }).id);

    const joinRequest = await app.prisma.clubMateRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest) return reply.status(404).send({ error: "Request not found" });
    if (joinRequest.toUserId !== userId)
      return reply.status(403).send({ error: "Forbidden" });
    if (joinRequest.status !== "pending")
      return reply.status(400).send({ error: "Request is no longer pending" });

    await app.prisma.clubMateRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    });

    const myProfile = await app.prisma.profile.findUnique({ where: { userId } });

    // Notify the requester
    app.io?.to(`user:${joinRequest.fromUserId}`).emit("clubmate:accepted", {
      requestId,
      byUserId: userId,
      byName: myProfile?.name ?? "Someone",
      byPhoto: myProfile?.photos[0] ?? null,
      placeId: joinRequest.placeId,
    });

    await app.prisma.notification.create({
      data: {
        userId: joinRequest.fromUserId,
        type: "clubmate_accepted",
        title: "Clubmate request accepted!",
        body: `${myProfile?.name ?? "Someone"} accepted your request to join`,
        data: { requestId, byUserId: userId },
      },
    });

    return { ok: true };
  });

  /**
   * POST /clubmates/:id/reject
   * Reject a join request.
   */
  app.post("/clubmates/:id/reject", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const requestId = z
      .string()
      .min(1)
      .parse((req.params as { id: string }).id);

    const updated = await app.prisma.clubMateRequest.updateMany({
      where: { id: requestId, toUserId: userId, status: "pending" },
      data: { status: "rejected" },
    });

    if (updated.count === 0)
      return reply.status(404).send({ error: "Request not found or already resolved" });

    return { ok: true };
  });

  /**
   * DELETE /clubmates/:id
   * Cancel own broadcast.
   */
  app.delete("/clubmates/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const broadcastId = z
      .string()
      .min(1)
      .parse((req.params as { id: string }).id);

    const broadcast = await app.prisma.clubMateRequest.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) return reply.status(404).send({ error: "Broadcast not found" });
    if (broadcast.fromUserId !== userId)
      return reply.status(403).send({ error: "Forbidden" });
    if (broadcast.status !== "pending")
      return reply.status(400).send({ error: "Broadcast is already resolved" });

    await app.prisma.clubMateRequest.update({
      where: { id: broadcastId },
      data: { status: "expired" },
    });

    return { ok: true };
  });
};

export default clubmatesRoutes;
