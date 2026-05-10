import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const createPartyBody = z.object({
  title:          z.string().min(3).max(100),
  description:    z.string().max(1000).optional(),
  coverImage:     z.string().url().optional(),
  neighborhood:   z.string().max(200).optional(),
  city:           z.string().min(1).max(100),
  state:          z.string().max(100).optional(),
  lat:            z.number().min(-90).max(90).optional(),
  lng:            z.number().min(-180).max(180).optional(),
  vibeType:       z.string().min(1).max(50),
  musicType:      z.string().max(50).optional(),
  ageMin:         z.number().int().min(18).max(99).default(18),
  ageMax:         z.number().int().min(18).max(99).optional(),
  allowMale:      z.boolean().default(true),
  allowFemale:    z.boolean().default(true),
  allowCouple:    z.boolean().default(true),
  maxAttendees:   z.number().int().min(2).max(500).default(30),
  isByob:         z.boolean().default(false),
  isPaid:         z.boolean().default(false),
  entryFee:       z.number().min(0).optional(),
  requiresVerification: z.boolean().default(false),
  startsAt:       z.string().datetime(),
  endsAt:         z.string().datetime().optional(),
  visibility:     z.enum(["public", "invite_only", "verified_only"]).default("public"),
});

const joinRequestBody = z.object({
  message: z.string().max(200).optional(),
});

const respondRequestBody = z.object({
  requestId: z.string().min(1),
  action:    z.enum(["accept", "reject"]),
});

// ─── DTO helpers ──────────────────────────────────────────────────────────────

function partyDto(party: any, attendeeCount: number, requestStatus: string | null, userId: string) {
  return {
    id:           party.id,
    title:        party.title,
    description:  party.description,
    coverImage:   party.coverImage,
    neighborhood: party.neighborhood,
    city:         party.city,
    state:        party.state,
    vibeType:     party.vibeType,
    musicType:    party.musicType,
    ageMin:       party.ageMin,
    ageMax:       party.ageMax,
    allowMale:    party.allowMale,
    allowFemale:  party.allowFemale,
    allowCouple:  party.allowCouple,
    maxAttendees: party.maxAttendees,
    isByob:       party.isByob,
    isPaid:       party.isPaid,
    entryFee:     party.entryFee,
    requiresVerification: party.requiresVerification,
    startsAt:     party.startsAt,
    endsAt:       party.endsAt,
    status:       party.status,
    visibility:   party.visibility,
    attendeeCount,
    isFull:       attendeeCount >= party.maxAttendees,
    isHost:       party.hostId === userId,
    requestStatus,
    host: party.host ? {
      id:       party.host.id,
      name:     party.host.profile?.name ?? "Anonymous",
      photo:    party.host.profile?.photos?.[0] ?? null,
      verified: party.host.profile?.verified ?? false,
    } : null,
    // Expose lat/lng only if accepted attendee or host
    lat: (party.hostId === userId || requestStatus === 'accepted') ? party.lat : null,
    lng: (party.hostId === userId || requestStatus === 'accepted') ? party.lng : null,
    createdAt: party.createdAt,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const partiesRoutes: FastifyPluginAsync = async (app) => {

  /**
   * POST /parties
   * Host a new house party.
   */
  app.post("/parties", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    let body: z.infer<typeof createPartyBody>;
    try {
      body = createPartyBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "Invalid party data" });
    }

    // Rate limit: max 3 active parties per user
    const activeCount = await app.prisma.houseParty.count({
      where: { hostId: userId, status: "active" },
    });
    if (activeCount >= 3) {
      return reply.status(429).send({ error: "You already have 3 active parties. End one first." });
    }

    const party = await app.prisma.houseParty.create({
      data: {
        hostId:      userId,
        title:       body.title,
        description: body.description,
        coverImage:  body.coverImage,
        neighborhood: body.neighborhood,
        city:        body.city,
        state:       body.state,
        lat:         body.lat,
        lng:         body.lng,
        vibeType:    body.vibeType,
        musicType:   body.musicType,
        ageMin:      body.ageMin,
        ageMax:      body.ageMax,
        allowMale:   body.allowMale,
        allowFemale: body.allowFemale,
        allowCouple: body.allowCouple,
        maxAttendees: body.maxAttendees,
        isByob:      body.isByob,
        isPaid:      body.isPaid,
        entryFee:    body.entryFee,
        requiresVerification: body.requiresVerification,
        startsAt:    new Date(body.startsAt),
        endsAt:      body.endsAt ? new Date(body.endsAt) : undefined,
        visibility:  body.visibility,
      },
      include: {
        host: { include: { profile: { select: { name: true, photos: true, verified: true } } } },
      },
    });

    // Auto-add host as attendee
    await app.prisma.partyAttendee.create({
      data: { partyId: party.id, userId },
    });

    // Emit socket event to notify nearby users
    if (app.io) {
      app.io.emit("party:created", {
        partyId:  party.id,
        title:    party.title,
        city:     party.city,
        vibeType: party.vibeType,
        startsAt: party.startsAt,
        hostName: party.host.profile?.name ?? "Anonymous",
      });
    }

    return reply.status(201).send({ party: partyDto(party, 1, "accepted", userId) });
  });

  /**
   * GET /parties/nearby
   * Browse active parties near the user.
   */
  app.get("/parties/nearby", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);
    const query  = req.query as Record<string, string>;
    const city   = query.city ?? "";
    const page   = Math.max(1, parseInt(query.page ?? "1", 10));
    const limit  = Math.min(30, parseInt(query.limit ?? "20", 10));
    const skip   = (page - 1) * limit;

    const now = new Date();

    const [parties, total] = await Promise.all([
      app.prisma.houseParty.findMany({
        where: {
          status:  "active",
          startsAt: { gte: now },
          ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        },
        orderBy: { startsAt: "asc" },
        skip,
        take: limit,
        include: {
          host: {
            include: { profile: { select: { name: true, photos: true, verified: true } } },
          },
          _count: { select: { attendees: true } },
          joinRequests: {
            where: { userId },
            select: { status: true },
          },
        },
      }),
      app.prisma.houseParty.count({
        where: {
          status:   "active",
          startsAt: { gte: now },
          ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        },
      }),
    ]);

    const partiesDtos = parties.map((p) => {
      const requestStatus = p.joinRequests[0]?.status ?? null;
      return partyDto(p, p._count.attendees, requestStatus, userId);
    });

    return { parties: partiesDtos, total, page, limit, hasMore: skip + parties.length < total };
  });

  /**
   * GET /parties/hosting
   * Parties the authenticated user is hosting.
   */
  app.get("/parties/hosting", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const parties = await app.prisma.houseParty.findMany({
      where: { hostId: userId },
      orderBy: { startsAt: "desc" },
      take: 20,
      include: {
        host: { include: { profile: { select: { name: true, photos: true, verified: true } } } },
        _count: { select: { attendees: true } },
        joinRequests: { where: { userId }, select: { status: true } },
      },
    });

    return {
      parties: parties.map((p) => partyDto(p, p._count.attendees, "accepted", userId)),
    };
  });

  /**
   * GET /parties/attending
   * Parties the user is attending or has requested to join.
   */
  app.get("/parties/attending", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const attendances = await app.prisma.partyAttendee.findMany({
      where: { userId },
      include: {
        party: {
          include: {
            host: { include: { profile: { select: { name: true, photos: true, verified: true } } } },
            _count: { select: { attendees: true } },
            joinRequests: { where: { userId }, select: { status: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 20,
    });

    return {
      parties: attendances.map((a) =>
        partyDto(a.party, a.party._count.attendees, "accepted", userId)
      ),
    };
  });

  /**
   * GET /parties/:id
   * Get single party details.
   */
  app.get("/parties/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId  = requireUserId(req);
    const { id }  = req.params as { id: string };

    const party = await app.prisma.houseParty.findUnique({
      where: { id },
      include: {
        host: { include: { profile: { select: { name: true, photos: true, verified: true } } } },
        _count: { select: { attendees: true } },
        joinRequests: { where: { userId }, select: { status: true } },
        attendees: {
          take: 10,
          include: {
            user: { include: { profile: { select: { name: true, photos: true, verified: true } } } },
          },
          orderBy: { joinedAt: "desc" },
        },
      },
    });

    if (!party) return reply.status(404).send({ error: "Party not found" });

    const requestStatus = party.joinRequests[0]?.status ?? null;
    const dto = partyDto(party, party._count.attendees, requestStatus, userId);

    // Attach attendee previews
    const attendeeList = party.attendees.map((a) => ({
      id:       a.user.id,
      name:     a.user.profile?.name ?? "User",
      photo:    a.user.profile?.photos?.[0] ?? null,
      verified: a.user.profile?.verified ?? false,
    }));

    return { party: { ...dto, attendees: attendeeList } };
  });

  /**
   * POST /parties/:id/join
   * Send a join request for a party.
   */
  app.post("/parties/:id/join", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId  = requireUserId(req);
    const { id }  = req.params as { id: string };
    let body: z.infer<typeof joinRequestBody>;
    try {
      body = joinRequestBody.parse(req.body ?? {});
    } catch {
      body = {};
    }

    const party = await app.prisma.houseParty.findUnique({
      where: { id },
      include: { _count: { select: { attendees: true } } },
    });

    if (!party) return reply.status(404).send({ error: "Party not found" });
    if (party.status !== "active") return reply.status(400).send({ error: "Party is not active" });
    if (party.hostId === userId) return reply.status(400).send({ error: "You are the host" });
    if (party._count.attendees >= party.maxAttendees) {
      return reply.status(400).send({ error: "Party is full" });
    }

    // Check existing request
    const existing = await app.prisma.partyJoinRequest.findUnique({
      where: { partyId_userId: { partyId: id, userId } },
    });
    if (existing) {
      return reply.status(400).send({ error: "Already requested to join", status: existing.status });
    }

    // Public parties: auto-accept; invite_only/verified: pending
    const autoAccept = party.visibility === "public";

    const joinReq = await app.prisma.partyJoinRequest.create({
      data: {
        partyId: id,
        userId,
        status:  autoAccept ? "accepted" : "pending",
        message: body.message,
      },
    });

    if (autoAccept) {
      await app.prisma.partyAttendee.upsert({
        where:  { partyId_userId: { partyId: id, userId } },
        create: { partyId: id, userId },
        update: {},
      });
    }

    // Notify host
    if (app.io) {
      app.io.to(`user:${party.hostId}`).emit("party:join-request", {
        partyId:   id,
        partyTitle: party.title,
        userId,
        autoAccepted: autoAccept,
      });
      if (autoAccept) {
        app.io.to(`user:${userId}`).emit("party:user-joined", {
          partyId: id,
          partyTitle: party.title,
        });
      }
    }

    return reply.send({ request: joinReq });
  });

  /**
   * POST /parties/:id/respond
   * Host accepts or rejects a join request.
   */
  app.post("/parties/:id/respond", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId  = requireUserId(req);
    const { id }  = req.params as { id: string };
    let body: z.infer<typeof respondRequestBody>;
    try {
      body = respondRequestBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "Invalid body" });
    }

    const party = await app.prisma.houseParty.findUnique({ where: { id } });
    if (!party) return reply.status(404).send({ error: "Party not found" });
    if (party.hostId !== userId) return reply.status(403).send({ error: "Only host can respond" });

    const joinReq = await app.prisma.partyJoinRequest.findUnique({
      where: { id: body.requestId },
    });
    if (!joinReq || joinReq.partyId !== id) {
      return reply.status(404).send({ error: "Request not found" });
    }

    const updated = await app.prisma.partyJoinRequest.update({
      where: { id: body.requestId },
      data:  { status: body.action === "accept" ? "accepted" : "rejected" },
    });

    if (body.action === "accept") {
      await app.prisma.partyAttendee.upsert({
        where:  { partyId_userId: { partyId: id, userId: joinReq.userId } },
        create: { partyId: id, userId: joinReq.userId },
        update: {},
      });

      // Create connection record
      await app.prisma.connection.upsert({
        where: {
          userAId_userBId: {
            userAId: userId < joinReq.userId ? userId : joinReq.userId,
            userBId: userId < joinReq.userId ? joinReq.userId : userId,
          },
        },
        create: {
          userAId: userId < joinReq.userId ? userId : joinReq.userId,
          userBId: userId < joinReq.userId ? joinReq.userId : userId,
          type: "met_at_party",
          metAt: party.title,
        },
        update: {},
      });

      if (app.io) {
        app.io.to(`user:${joinReq.userId}`).emit("party:user-joined", {
          partyId:    id,
          partyTitle: party.title,
        });
      }
    }

    return reply.send({ request: updated });
  });

  /**
   * PATCH /parties/:id
   * Host updates party details.
   */
  app.patch("/parties/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const { id } = req.params as { id: string };

    const party = await app.prisma.houseParty.findUnique({ where: { id } });
    if (!party) return reply.status(404).send({ error: "Not found" });
    if (party.hostId !== userId) return reply.status(403).send({ error: "Forbidden" });

    const patchSchema = createPartyBody.partial();
    let body: z.infer<typeof patchSchema>;
    try {
      body = patchSchema.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "Invalid data" });
    }

    const updated = await app.prisma.houseParty.update({
      where: { id },
      data: {
        ...body,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt:   body.endsAt   ? new Date(body.endsAt)   : undefined,
      },
    });

    return reply.send({ party: updated });
  });

  /**
   * DELETE /parties/:id
   * Host cancels the party.
   */
  app.delete("/parties/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const { id } = req.params as { id: string };

    const party = await app.prisma.houseParty.findUnique({ where: { id } });
    if (!party) return reply.status(404).send({ error: "Not found" });
    if (party.hostId !== userId) return reply.status(403).send({ error: "Forbidden" });

    await app.prisma.houseParty.update({
      where: { id },
      data:  { status: "cancelled" },
    });

    // Notify all attendees
    if (app.io) {
      app.io.emit("party:cancelled", { partyId: id, partyTitle: party.title });
    }

    return reply.send({ ok: true });
  });

  /**
   * GET /parties/:id/requests
   * Host views pending join requests.
   */
  app.get("/parties/:id/requests", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const { id } = req.params as { id: string };

    const party = await app.prisma.houseParty.findUnique({ where: { id } });
    if (!party) return reply.status(404).send({ error: "Not found" });
    if (party.hostId !== userId) return reply.status(403).send({ error: "Forbidden" });

    const requests = await app.prisma.partyJoinRequest.findMany({
      where: { partyId: id, status: "pending" },
      include: {
        user: {
          include: { profile: { select: { name: true, photos: true, age: true, verified: true, bio: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      requests: requests.map((r) => ({
        id:      r.id,
        message: r.message,
        createdAt: r.createdAt,
        user: {
          id:       r.user.id,
          name:     r.user.profile?.name ?? "User",
          photo:    r.user.profile?.photos?.[0] ?? null,
          age:      r.user.profile?.age ?? null,
          verified: r.user.profile?.verified ?? false,
          bio:      r.user.profile?.bio ?? null,
        },
      })),
    };
  });
};

export default partiesRoutes;
