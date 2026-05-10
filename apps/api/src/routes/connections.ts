import type { FastifyPluginAsync } from "fastify";
import { requireUserId } from "../lib/auth.js";

// ─── Routes ───────────────────────────────────────────────────────────────────

const connectionsRoutes: FastifyPluginAsync = async (app) => {

  /**
   * GET /connections
   * All connections for the authenticated user.
   * Returns recently connected people, nearby active, venue/party connections.
   */
  app.get("/connections", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);
    const query  = req.query as Record<string, string>;
    const filter = query.type ?? "all"; // all | matched | met_at_venue | met_at_party | stranger_chat
    const page   = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit  = Math.min(50, parseInt(query.limit ?? "30", 10));
    const skip   = (page - 1) * limit;

    const typeFilter = filter !== "all" ? { type: filter as any } : {};

    const [connections, total] = await Promise.all([
      app.prisma.connection.findMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          ...typeFilter,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          userA: {
            include: {
              profile:  { select: { name: true, photos: true, verified: true, bio: true, mode: true } },
              location: { select: { lat: true, lng: true, updatedAt: true } },
            },
          },
          userB: {
            include: {
              profile:  { select: { name: true, photos: true, verified: true, bio: true, mode: true } },
              location: { select: { lat: true, lng: true, updatedAt: true } },
            },
          },
        },
      }),
      app.prisma.connection.count({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          ...typeFilter,
        },
      }),
    ]);

    const modeMap: Record<string, string> = {
      dating: "dating", hook: "hook",
      co_travel: "co-travel", night_out: "night-out",
      club_mates: "club-mates", happening: "happening",
    };

    const connectionDtos = connections.map((c) => {
      const other     = c.userAId === userId ? c.userB : c.userA;
      const profile   = other.profile;
      const lastSeen  = other.lastSeen;
      const isOnline  = other.isOnline;

      // Rough distance label (no precise coords exposed)
      return {
        connectionId: c.id,
        type:         c.type,
        metAt:        c.metAt,
        connectedAt:  c.createdAt,
        user: {
          id:       other.id,
          name:     profile?.name ?? "User",
          photos:   profile?.photos ?? [],
          verified: profile?.verified ?? false,
          bio:      profile?.bio ?? null,
          mode:     modeMap[profile?.mode ?? ""] ?? "happening",
          isOnline,
          lastSeen: lastSeen.toISOString(),
        },
      };
    });

    return { connections: connectionDtos, total, page, limit, hasMore: skip + connections.length < total };
  });

  /**
   * GET /connections/nearby-active
   * Connections who are currently online and nearby.
   */
  app.get("/connections/nearby-active", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const connections = await app.prisma.connection.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: {
          where: { isOnline: true },
          include: { profile: { select: { name: true, photos: true, verified: true, mode: true } } },
        },
        userB: {
          where: { isOnline: true },
          include: { profile: { select: { name: true, photos: true, verified: true, mode: true } } },
        },
      },
    });

    const modeMap: Record<string, string> = {
      dating: "dating", hook: "hook",
      co_travel: "co-travel", night_out: "night-out",
      club_mates: "club-mates", happening: "happening",
    };

    const active = connections
      .map((c) => {
        const other = c.userAId === userId ? c.userB : c.userA;
        if (!other.isOnline) return null;
        return {
          id:       other.id,
          name:     other.profile?.name ?? "User",
          photos:   other.profile?.photos ?? [],
          verified: other.profile?.verified ?? false,
          mode:     modeMap[other.profile?.mode ?? ""] ?? "happening",
          isOnline: true,
          connectionType: c.type,
          metAt: c.metAt,
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return { users: active };
  });

  /**
   * GET /connections/recently-met
   * People recently connected (last 7 days).
   */
  app.get("/connections/recently-met", { preHandler: [app.authenticate] }, async (req) => {
    const userId  = requireUserId(req);
    const since   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const connections = await app.prisma.connection.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        userA: { include: { profile: { select: { name: true, photos: true, verified: true } } } },
        userB: { include: { profile: { select: { name: true, photos: true, verified: true } } } },
      },
    });

    return {
      users: connections.map((c) => {
        const other = c.userAId === userId ? c.userB : c.userA;
        return {
          id:       other.id,
          name:     other.profile?.name ?? "User",
          photos:   other.profile?.photos ?? [],
          verified: other.profile?.verified ?? false,
          isOnline: other.isOnline,
          connectionType: c.type,
          metAt:    c.metAt,
          connectedAt: c.createdAt,
        };
      }),
    };
  });

  /**
   * DELETE /connections/:id
   * Remove a connection.
   */
  app.delete("/connections/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId     = requireUserId(req);
    const { id }     = req.params as { id: string };

    const connection = await app.prisma.connection.findUnique({ where: { id } });
    if (!connection) return reply.status(404).send({ error: "Not found" });
    if (connection.userAId !== userId && connection.userBId !== userId) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    await app.prisma.connection.delete({ where: { id } });
    return reply.send({ ok: true });
  });
};

export default connectionsRoutes;
