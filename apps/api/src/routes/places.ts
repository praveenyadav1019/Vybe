import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

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

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const placesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /places/happening
   * Return venues that are currently active/happening.
   * Sorted by crowd score descending.
   * Optional: filter by proximity.
   */
  app.get("/places/happening", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);
    const query = req.query as Record<string, string>;

    const userLat = query.lat ? parseFloat(query.lat) : null;
    const userLng = query.lng ? parseFloat(query.lng) : null;
    const radiusM = query.radius ? Math.min(20000, parseFloat(query.radius)) : 5000;

    // Get user's location if not provided in query
    let effectiveLat = userLat;
    let effectiveLng = userLng;

    if (effectiveLat === null || effectiveLng === null) {
      const loc = await app.prisma.userLocation.findUnique({ where: { userId } });
      if (loc) {
        effectiveLat = loc.lat;
        effectiveLng = loc.lng;
      }
    }

    // Fetch happening places with their activity
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const places = await app.prisma.place.findMany({
      where: { isHappening: true },
      include: {
        activity: true,
        checkins: {
          where: { createdAt: { gte: twoHoursAgo } },
          select: { id: true },
        },
      },
      orderBy: { activity: { crowdScore: "desc" } },
      take: 50,
    });

    // Filter by proximity if location available
    const filtered = places
      .map((p) => {
        let distance: number | null = null;
        let distanceStr = "Nearby";

        if (effectiveLat !== null && effectiveLng !== null) {
          distance = haversineM(effectiveLat, effectiveLng, p.lat, p.lng);
          distanceStr = formatDistance(distance);
        }

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          address: p.address,
          description: p.description,
          tags: p.tags,
          photos: p.photos,
          isHappening: p.isHappening,
          vibeScore: p.activity?.vibeScore ?? 0,
          crowdScore: p.activity?.crowdScore ?? 0,
          activeUsers: p.checkins.length > 0 ? p.checkins.length : (p.activity?.activeUsers ?? 0),
          distance: distanceStr,
          distanceM: distance,
        };
      })
      .filter((p) => {
        if (p.distanceM !== null && p.distanceM > radiusM) return false;
        return true;
      })
      .sort((a, b) => (b.crowdScore ?? 0) - (a.crowdScore ?? 0));

    return { places: filtered };
  });

  /**
   * GET /places/:id
   * Get detailed info for a specific place.
   */
  app.get("/places/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const placeId = z.string().min(1).parse((req.params as { id: string }).id);

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const place = await app.prisma.place.findUnique({
      where: { id: placeId },
      include: {
        activity: true,
        checkins: {
          where: { createdAt: { gte: twoHoursAgo } },
          select: { id: true, createdAt: true },
        },
      },
    });

    if (!place) return reply.status(404).send({ error: "Place not found" });

    // Check if current user is checked in
    const myCheckin = await app.prisma.placeCheckin.findFirst({
      where: { placeId, userId, createdAt: { gte: twoHoursAgo } },
    });

    // Distance
    let distanceStr = "Nearby";
    const loc = await app.prisma.userLocation.findUnique({ where: { userId } });
    if (loc) {
      const dist = haversineM(loc.lat, loc.lng, place.lat, place.lng);
      distanceStr = formatDistance(dist);
    }

    return {
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      description: place.description,
      tags: place.tags,
      photos: place.photos,
      isHappening: place.isHappening,
      vibeScore: place.activity?.vibeScore ?? 0,
      crowdScore: place.activity?.crowdScore ?? 0,
      activeUsers: place.checkins.length > 0 ? place.checkins.length : (place.activity?.activeUsers ?? 0),
      distance: distanceStr,
      isCheckedIn: !!myCheckin,
    };
  });

  /**
   * POST /places/:id/checkin
   * Check in to a venue. Increments active user count.
   */
  app.post("/places/:id/checkin", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const placeId = z.string().min(1).parse((req.params as { id: string }).id);

    const place = await app.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) return reply.status(404).send({ error: "Place not found" });

    // Prevent duplicate checkins within 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recent = await app.prisma.placeCheckin.findFirst({
      where: { placeId, userId, createdAt: { gte: twoHoursAgo } },
    });

    if (!recent) {
      await app.prisma.placeCheckin.create({ data: { placeId, userId } });

      // Increment active users
      await app.prisma.placeActivity.upsert({
        where: { placeId },
        create: { placeId, activeUsers: 1, vibeScore: 7.0, crowdScore: 5.0 },
        update: { activeUsers: { increment: 1 } },
      });
    }

    return { ok: true, alreadyCheckedIn: !!recent };
  });

  /**
   * GET /places
   * Search / list all places.
   */
  app.get("/places", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);
    const query = req.query as Record<string, string>;

    const search = query.q?.trim();
    const category = query.category;
    const happening = query.happening === "true";

    const places = await app.prisma.place.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { tags: { has: search } },
          ],
        }),
        ...(category && { category }),
        ...(happening && { isHappening: true }),
      },
      include: { activity: true },
      orderBy: { activity: { crowdScore: "desc" } },
      take: 100,
    });

    // Get user location for distances
    const loc = await app.prisma.userLocation.findUnique({ where: { userId } });

    return {
      places: places.map((p) => {
        let distanceStr = "Nearby";
        if (loc) {
          const dist = haversineM(loc.lat, loc.lng, p.lat, p.lng);
          distanceStr = formatDistance(dist);
        }
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          address: p.address,
          tags: p.tags,
          photos: p.photos,
          isHappening: p.isHappening,
          vibeScore: p.activity?.vibeScore ?? 0,
          crowdScore: p.activity?.crowdScore ?? 0,
          activeUsers: p.activity?.activeUsers ?? 0,
          distance: distanceStr,
        };
      }),
    };
  });
};

export default placesRoutes;
