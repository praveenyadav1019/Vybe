import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

// ─── Admin Auth Helper ────────────────────────────────────────────────────────

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  // Dev bypass
  const authHeader = request.headers.authorization ?? "";
  if (authHeader === "Bearer dev-access-token") {
    return true;
  }

  const prisma = request.server.prisma;
  const userId = (request.user as { sub: string }).sub;
  const adminUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!adminUser || adminUser.role !== "admin") {
    reply.status(403).send({ error: "Admin access required" });
    return false;
  }
  return true;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const adminRoutes: FastifyPluginAsync = async (app) => {

  /**
   * GET /admin/stats
   * Overall platform statistics.
   */
  app.get("/admin/stats", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeToday,
      totalParties,
      activeParties,
      totalConnections,
      pendingReports,
      totalMessages,
      bannedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastSeen: { gte: todayMidnight } } }),
      prisma.houseParty.count(),
      prisma.houseParty.count({ where: { status: "active" } }),
      prisma.connection.count(),
      prisma.report.count({ where: { status: "pending" } }),
      prisma.message.count(),
      prisma.user.count({ where: { isBanned: true } }),
    ]);

    return reply.send({
      totalUsers,
      activeToday,
      totalParties,
      activeParties,
      totalConnections,
      pendingReports,
      totalMessages,
      bannedUsers,
    });
  });

  /**
   * GET /admin/users
   * Paginated user list with optional search, role, banned filters.
   */
  app.get("/admin/users", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const query = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit = Math.min(100, parseInt(query.limit ?? "20", 10));
    const skip = (page - 1) * limit;
    const search = query.search ?? "";
    const roleFilter = query.role as "user" | "admin" | undefined;
    const bannedFilter = query.banned;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { profile: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (roleFilter === "user" || roleFilter === "admin") {
      where.role = roleFilter;
    }
    if (bannedFilter === "true") {
      where.isBanned = true;
    } else if (bannedFilter === "false") {
      where.isBanned = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: { select: { name: true, photos: true, verified: true, mode: true, age: true, gender: true } },
          subscription: { select: { plan: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({ users, total, page, limit });
  });

  /**
   * GET /admin/users/:id
   * Full user detail.
   */
  app.get("/admin/users/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const { id } = req.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        verification: true,
        location: true,
        subscription: true,
        _count: {
          select: {
            messages: true,
            reportsMade: true,
            reportsRecv: true,
            connectionsA: true,
            connectionsB: true,
            partyAttendances: true,
          },
        },
      },
    });

    if (!user) return reply.status(404).send({ error: "User not found" });

    return reply.send({ user });
  });

  /**
   * POST /admin/users/:id/ban
   * Ban a user.
   */
  app.post("/admin/users/:id/ban", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const { id } = req.params as { id: string };

    try {
      const user = await prisma.user.update({
        where: { id },
        data: { isBanned: true },
        select: { id: true, isBanned: true },
      });
      return reply.send({ ok: true, user });
    } catch {
      return reply.status(404).send({ error: "User not found" });
    }
  });

  /**
   * POST /admin/users/:id/unban
   * Unban a user.
   */
  app.post("/admin/users/:id/unban", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const { id } = req.params as { id: string };

    try {
      const user = await prisma.user.update({
        where: { id },
        data: { isBanned: false },
        select: { id: true, isBanned: true },
      });
      return reply.send({ ok: true, user });
    } catch {
      return reply.status(404).send({ error: "User not found" });
    }
  });

  /**
   * POST /admin/users/:id/verify
   * Manually verify a user's profile.
   */
  app.post("/admin/users/:id/verify", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const { id } = req.params as { id: string };

    try {
      const profile = await prisma.profile.update({
        where: { userId: id },
        data: { verified: true },
        select: { userId: true, verified: true },
      });
      return reply.send({ ok: true, profile });
    } catch {
      return reply.status(404).send({ error: "User or profile not found" });
    }
  });

  /**
   * DELETE /admin/users/:id
   * Delete a user account.
   */
  app.delete("/admin/users/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const { id } = req.params as { id: string };

    try {
      await prisma.user.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch {
      return reply.status(404).send({ error: "User not found" });
    }
  });

  /**
   * GET /admin/parties
   * Paginated party list.
   */
  app.get("/admin/parties", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const query = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit = Math.min(100, parseInt(query.limit ?? "20", 10));
    const skip = (page - 1) * limit;
    const statusFilter = query.status as string | undefined;
    const cityFilter = query.city ?? "";

    const where: Record<string, unknown> = {};
    if (statusFilter && ["active", "cancelled", "ended", "full"].includes(statusFilter)) {
      where.status = statusFilter;
    }
    if (cityFilter) {
      where.city = { contains: cityFilter, mode: "insensitive" };
    }

    const [parties, total] = await Promise.all([
      prisma.houseParty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          host: { include: { profile: { select: { name: true } } } },
          _count: { select: { attendees: true } },
        },
      }),
      prisma.houseParty.count({ where }),
    ]);

    return reply.send({ parties, total, page, limit });
  });

  /**
   * DELETE /admin/parties/:id
   * Delete a party.
   */
  app.delete("/admin/parties/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const { id } = req.params as { id: string };

    try {
      await prisma.houseParty.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch {
      return reply.status(404).send({ error: "Party not found" });
    }
  });

  /**
   * GET /admin/reports
   * Paginated reports list.
   */
  app.get("/admin/reports", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const query = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit = Math.min(100, parseInt(query.limit ?? "20", 10));
    const skip = (page - 1) * limit;
    const statusFilter = query.status ?? "";

    const where: Record<string, unknown> = {};
    if (statusFilter && ["pending", "resolved"].includes(statusFilter)) {
      where.status = statusFilter;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            include: { profile: { select: { name: true, photos: true } } },
          },
          target: {
            include: { profile: { select: { name: true, photos: true } } },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return reply.send({ reports, total, page, limit });
  });

  /**
   * POST /admin/reports/:id/resolve
   * Resolve a report with an action.
   */
  app.post("/admin/reports/:id/resolve", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;
    const { id } = req.params as { id: string };
    const body = req.body as { action?: string };
    const action = body?.action;

    if (!action || !["warn", "ban", "dismiss"].includes(action)) {
      return reply.status(400).send({ error: "Invalid action. Must be warn, ban, or dismiss." });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.status(404).send({ error: "Report not found" });

    // Apply action
    if (action === "ban") {
      await prisma.user.update({
        where: { id: report.targetId },
        data: { isBanned: true },
      });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: { status: "resolved" },
    });

    return reply.send({ ok: true, report: updated, action });
  });

  /**
   * GET /admin/connections
   * Connection statistics by type.
   */
  app.get("/admin/connections", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return;

    const prisma = req.server.prisma;

    const [total, matched, met_at_venue, met_at_party, stranger_chat] = await Promise.all([
      prisma.connection.count(),
      prisma.connection.count({ where: { type: "matched" } }),
      prisma.connection.count({ where: { type: "met_at_venue" } }),
      prisma.connection.count({ where: { type: "met_at_party" } }),
      prisma.connection.count({ where: { type: "stranger_chat" } }),
    ]);

    return reply.send({
      total,
      byType: { matched, met_at_venue, met_at_party, stranger_chat },
    });
  });
};

export default adminRoutes;
