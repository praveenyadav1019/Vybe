import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const pingBody = z.object({
  message: z.string().max(200).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Get or create a DM chat between two users. */
async function getOrCreateDm(app: FastifyInstance, a: string, b: string) {
  const existing = await app.prisma.chat.findFirst({
    where: {
      AND: [{ users: { some: { id: a } } }, { users: { some: { id: b } } }],
    },
    include: { users: true },
  });

  if (existing && existing.users.length === 2) return existing;

  return app.prisma.chat.create({
    data: { users: { connect: [{ id: a }, { id: b }] } },
    include: { users: true },
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const discoveryRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /discovery/feed
   * Paginated list of nearby users for the discovery feed.
   */
  app.get("/discovery/feed", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const query = req.query as Record<string, string>;

    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10)));
    const skip = (page - 1) * limit;

    const myLocation = await app.prisma.userLocation.findUnique({ where: { userId } });
    if (!myLocation) return { items: [], total: 0, page, limit, hasMore: false };

    // Nearby within 2 km
    const hits = await app.geo.nearby(myLocation.lng, myLocation.lat, 2000, userId);
    if (!hits.length) return { items: [], total: 0, page, limit, hasMore: false };

    const nearbyIds = hits.map((h) => h.userId);

    // Fetch blocks
    const blocks = await app.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: nearbyIds } },
          { blockedId: userId, blockerId: { in: nearbyIds } },
        ],
      },
    });
    const blockedSet = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));
    blockedSet.delete(userId);

    // Fetch users with profiles
    const users = await app.prisma.user.findMany({
      where: {
        id: { in: nearbyIds.filter((id) => !blockedSet.has(id)) },
      },
      include: { profile: true },
      orderBy: [{ isOnline: "desc" }, { lastSeen: "desc" }],
    });

    const total = users.length;
    const paginated = users.slice(skip, skip + limit);

    const items = paginated.map((u) => {
      const hit = hits.find((h) => h.userId === u.id);
      return {
        id: u.id,
        name: u.profile?.name ?? "Unknown",
        age: u.profile?.age ?? undefined,
        photoUrl: u.profile?.photos[0] ?? undefined,
        photos: u.profile?.photos ?? [],
        interests: (u.profile?.interests ?? []).slice(0, 3),
        verified: u.profile?.verified ?? false,
        mode: u.profile?.mode ?? "happening",
        isOnline: u.isOnline,
        distanceBucket: hit ? app.geo.bucketForDistance(hit.distanceM) : "nearby",
      };
    });

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    };
  });

  /**
   * GET /users/:id
   * Public profile view for a specific user.
   */
  app.get("/users/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const viewerId = requireUserId(req);
    const targetId = z.string().min(1).parse((req.params as { id: string }).id);

    if (targetId === viewerId) {
      const self = await app.prisma.profile.findUnique({ where: { userId: viewerId } });
      return self ?? reply.status(404).send({ error: "Not found" });
    }

    // Block check
    const block = await app.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetId },
          { blockerId: targetId, blockedId: viewerId },
        ],
      },
    });
    if (block) return reply.status(404).send({ error: "Not found" });

    // Location-based visibility: only show users within 1.5 km
    const [viewerLoc, targetLoc] = await Promise.all([
      app.prisma.userLocation.findUnique({ where: { userId: viewerId } }),
      app.prisma.userLocation.findUnique({ where: { userId: targetId } }),
    ]);

    if (!viewerLoc || !targetLoc) {
      return reply.status(404).send({ error: "Not found" });
    }

    const distM = haversineM(viewerLoc.lat, viewerLoc.lng, targetLoc.lat, targetLoc.lng);
    if (distM > 1500) {
      return reply.status(404).send({ error: "Not found" });
    }

    const [targetUser, profile] = await Promise.all([
      app.prisma.user.findUnique({ where: { id: targetId } }),
      app.prisma.profile.findUnique({ where: { userId: targetId } }),
    ]);

    if (!targetUser || !profile) return reply.status(404).send({ error: "Not found" });

    return {
      id: targetUser.id,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      bio: profile.bio,
      interests: profile.interests,
      photos: profile.photos,
      verified: profile.verified,
      mode: profile.mode,
      isOnline: targetUser.isOnline,
      distanceBucket: app.geo.bucketForDistance(distM),
    };
  });

  /**
   * POST /users/:id/ping
   * Send a match request (ping) to another user.
   * Rate limit: 10 pings per hour.
   */
  app.post("/users/:id/ping", { preHandler: [app.authenticate] }, async (req, reply) => {
    const fromId = requireUserId(req);
    const toId = z.string().min(1).parse((req.params as { id: string }).id);

    if (fromId === toId) {
      return reply.status(400).send({ error: "Cannot ping yourself" });
    }

    // Rate limit: 10 pings per hour
    const rlKey = `vybeon:ping_rl:${fromId}`;
    const count = await app.redis.incr(rlKey);
    if (count === 1) await app.redis.expire(rlKey, 3600);
    if (count > 10) {
      return reply.status(429).send({ error: "Ping limit reached (10/hour). Try again later." });
    }

    // Block check
    const block = await app.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: fromId, blockedId: toId },
          { blockerId: toId, blockedId: fromId },
        ],
      },
    });
    if (block) return reply.status(403).send({ error: "Cannot ping this user" });

    // Check for existing pending/accepted request
    const existing = await app.prisma.matchRequest.findFirst({
      where: {
        OR: [
          { fromUserId: fromId, toUserId: toId },
          { fromUserId: toId, toUserId: fromId },
        ],
        status: { in: ["pending", "accepted"] },
      },
    });
    if (existing) {
      return reply.status(409).send({ error: "A ping or match already exists with this user" });
    }

    let body: z.infer<typeof pingBody> = {};
    try {
      body = pingBody.parse(req.body ?? {});
    } catch {
      /* optional body */
    }

    const fromProfile = await app.prisma.profile.findUnique({ where: { userId: fromId } });

    const ping = await app.prisma.matchRequest.create({
      data: {
        fromUserId: fromId,
        toUserId: toId,
        status: "pending",
        message: body.message,
      },
    });

    // Create in-app notification
    await app.prisma.notification.create({
      data: {
        userId: toId,
        type: "match_request",
        title: "New ping!",
        body: `${fromProfile?.name ?? "Someone"} sent you a ping`,
        data: { pingId: ping.id, fromUserId: fromId },
      },
    });

    // Socket event to target user
    app.io?.to(`user:${toId}`).emit("ping:received", {
      id: ping.id,
      fromUserId: fromId,
      fromName: fromProfile?.name,
      fromPhoto: fromProfile?.photos[0],
      message: body.message,
    });

    return { ok: true, pingId: ping.id };
  });

  /**
   * GET /pings/received
   * Get pending match requests sent to the authenticated user.
   */
  app.get("/pings/received", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const pings = await app.prisma.matchRequest.findMany({
      where: { toUserId: userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { fromUser: { include: { profile: true } } },
    });

    return {
      pings: pings.map((p) => ({
        id: p.id,
        fromUserId: p.fromUserId,
        fromName: p.fromUser.profile?.name,
        fromPhoto: p.fromUser.profile?.photos[0],
        fromVerified: p.fromUser.profile?.verified ?? false,
        message: p.message,
        createdAt: p.createdAt,
      })),
    };
  });

  /**
   * POST /pings/:id/accept
   * Accept a match request – creates a Match and a DM Chat.
   */
  app.post("/pings/:id/accept", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const pingId = z.string().min(1).parse((req.params as { id: string }).id);

    const ping = await app.prisma.matchRequest.findFirst({
      where: { id: pingId, toUserId: userId, status: "pending" },
    });

    if (!ping) {
      return reply.status(404).send({ error: "Ping not found or already resolved" });
    }

    await app.prisma.matchRequest.update({
      where: { id: pingId },
      data: { status: "accepted" },
    });

    // Create or fetch existing chat
    const chat = await getOrCreateDm(app, ping.fromUserId, ping.toUserId);

    // Notify the sender via socket
    const toProfile = await app.prisma.profile.findUnique({ where: { userId } });

    app.io?.to(`user:${ping.fromUserId}`).emit("ping:received", {
      id: ping.id,
      status: "accepted",
      chatId: chat.id,
      byName: toProfile?.name,
    });

    // Notify sender about match
    await app.prisma.notification.create({
      data: {
        userId: ping.fromUserId,
        type: "match_accepted",
        title: "It's a match! 🎉",
        body: `${toProfile?.name ?? "Someone"} accepted your ping`,
        data: { pingId: ping.id, chatId: chat.id },
      },
    });

    return { ok: true, chatId: chat.id };
  });

  /**
   * POST /pings/:id/reject
   * Reject a match request.
   */
  app.post("/pings/:id/reject", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const pingId = z.string().min(1).parse((req.params as { id: string }).id);

    const updated = await app.prisma.matchRequest.updateMany({
      where: { id: pingId, toUserId: userId, status: "pending" },
      data: { status: "rejected" },
    });

    if (updated.count === 0) {
      return reply.status(404).send({ error: "Ping not found" });
    }

    return { ok: true };
  });
};

export default discoveryRoutes;
