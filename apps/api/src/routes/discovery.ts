import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const pingBody = z.object({
  message: z.string().max(200).optional(),
  /** Super-like: highlights the like to the recipient. */
  superlike: z.boolean().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Record a mutual match: ensure a DM chat and a `matched` Connection exist
 * (idempotent). The Connection is stored with a canonical (sorted) user order
 * to satisfy the `@@unique([userAId, userBId])` constraint. Returns the chat.
 */
async function createMatchConnection(app: FastifyInstance, a: string, b: string) {
  const chat = await getOrCreateDm(app, a, b);
  const existing = await app.prisma.connection.findFirst({
    where: {
      OR: [
        { userAId: a, userBId: b },
        { userAId: b, userBId: a },
      ],
    },
  });
  if (!existing) {
    const [x, y] = [a, b].sort();
    await app.prisma.connection
      .create({ data: { userAId: x, userBId: y, type: "matched" } })
      .catch(() => {/* unique race — already created */});
  }
  return chat;
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

    // Distance ranking via Redis GEO (if the viewer has shared a location).
    const myLocation = await app.prisma.userLocation.findUnique({ where: { userId } });
    const hits = myLocation
      ? await app.geo.nearby(myLocation.lng, myLocation.lat, 2000, userId)
      : [];
    const distanceById = new Map(hits.map((h) => [h.userId, h.distanceM]));

    // People you've already liked/matched or been matched with — hide them.
    const [requests, connections] = await Promise.all([
      app.prisma.matchRequest.findMany({
        where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
        select: { fromUserId: true, toUserId: true },
      }),
      app.prisma.connection.findMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
        select: { userAId: true, userBId: true },
      }),
    ]);
    const blocks = await app.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const excluded = new Set<string>([userId]);
    for (const r of requests) { excluded.add(r.fromUserId); excluded.add(r.toUserId); }
    for (const c of connections) { excluded.add(c.userAId); excluded.add(c.userBId); }
    for (const b of blocks) { excluded.add(b.blockerId); excluded.add(b.blockedId); }

    // Candidates: nearby first; fall back to all registered people with a
    // profile so the deck still works before geo data exists (early stage).
    const nearbyIds = hits.map((h) => h.userId).filter((id) => !excluded.has(id));
    const users = await app.prisma.user.findMany({
      where: nearbyIds.length
        ? { id: { in: nearbyIds } }
        : { id: { notIn: Array.from(excluded) }, profile: { isNot: null } },
      include: { profile: true },
      orderBy: [{ isOnline: "desc" }, { lastSeen: "desc" }],
    });

    // Nearby candidates first (by distance), then the rest.
    users.sort((a, b) => (distanceById.get(a.id) ?? 1e12) - (distanceById.get(b.id) ?? 1e12));

    const total = users.length;
    const paginated = users.slice(skip, skip + limit);

    const items = paginated.map((u) => {
      const distM = distanceById.get(u.id);
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
        distanceBucket: distM != null ? app.geo.bucketForDistance(distM) : "Nearby",
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

    let body: z.infer<typeof pingBody> = {};
    try {
      body = pingBody.parse(req.body ?? {});
    } catch {
      /* optional body */
    }

    const fromProfile = await app.prisma.profile.findUnique({ where: { userId: fromId } });

    // Reciprocal like → instant match (they already liked you).
    const reciprocal = await app.prisma.matchRequest.findFirst({
      where: { fromUserId: toId, toUserId: fromId, status: "pending" },
    });
    if (reciprocal) {
      await app.prisma.matchRequest.update({
        where: { id: reciprocal.id },
        data: { status: "accepted" },
      });
      const chat = await createMatchConnection(app, fromId, toId);
      const toProfile = await app.prisma.profile.findUnique({ where: { userId: toId } });

      // Notify both sides it's a match.
      app.io?.to(`user:${toId}`).emit("match:new", {
        userId: fromId,
        name: fromProfile?.name,
        photo: fromProfile?.photos[0],
        chatId: chat.id,
      });
      await app.prisma.notification.create({
        data: {
          userId: toId,
          type: "match_accepted",
          title: "It's a match! 🎉",
          body: `You matched with ${fromProfile?.name ?? "someone"}`,
          data: { chatId: chat.id, userId: fromId },
        },
      });
      return { ok: true, matched: true, chatId: chat.id, user: {
        id: toId, name: toProfile?.name, photo: toProfile?.photos[0],
      } };
    }

    // Already liked them / already matched?
    const outgoing = await app.prisma.matchRequest.findFirst({
      where: {
        OR: [
          { fromUserId: fromId, toUserId: toId },
          { fromUserId: toId, toUserId: fromId },
        ],
        status: { in: ["pending", "accepted"] },
      },
    });
    if (outgoing) {
      return reply.status(409).send({ error: "A like or match already exists with this user" });
    }

    // One-sided like → create a pending request.
    const ping = await app.prisma.matchRequest.create({
      data: {
        fromUserId: fromId,
        toUserId: toId,
        status: "pending",
        message: body.message,
      },
    });

    // Create in-app notification (super-likes read differently).
    await app.prisma.notification.create({
      data: {
        userId: toId,
        type: "match_request",
        title: body.superlike ? "You've been super-liked! ⭐" : "Someone likes you!",
        body: body.superlike
          ? `${fromProfile?.name ?? "Someone"} super-liked you`
          : `${fromProfile?.name ?? "Someone"} liked your profile`,
        data: { pingId: ping.id, fromUserId: fromId, superlike: !!body.superlike },
      },
    });

    // Socket event to target user
    app.io?.to(`user:${toId}`).emit("ping:received", {
      id: ping.id,
      fromUserId: fromId,
      fromName: fromProfile?.name,
      fromPhoto: fromProfile?.photos[0],
      message: body.message,
      superlike: !!body.superlike,
    });

    return { ok: true, matched: false, pingId: ping.id };
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

    // Create the DM chat + a `matched` Connection so it shows in Connections.
    const chat = await createMatchConnection(app, ping.fromUserId, ping.toUserId);

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
