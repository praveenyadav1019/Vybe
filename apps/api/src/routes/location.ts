import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const updateLocationBody = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
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

function toDistanceBucket(meters: number): string {
  if (meters <= 25) return "same_place";
  if (meters < 100) return "under_100m";
  return "nearby";
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const locationRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /location/update
   * Update the authenticated user's GPS location.
   * Stores in Postgres for persistence and Redis GEO for fast nearby queries.
   */
  app.post("/location/update", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    let body: z.infer<typeof updateLocationBody>;
    try {
      body = updateLocationBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "lat and lng are required (-90..90, -180..180)" });
    }

    // Persist to Postgres
    await app.prisma.userLocation.upsert({
      where: { userId },
      create: { userId, lat: body.lat, lng: body.lng, accuracy: body.accuracy },
      update: { lat: body.lat, lng: body.lng, accuracy: body.accuracy },
    });

    // Update Redis GEO index
    await app.geo.setUserLocation(userId, body.lng, body.lat);

    // Mark user as online
    await app.redis.set(`vybeon:online:${userId}`, "1", "EX", 300);
    await app.prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });

    return { ok: true };
  });

  /**
   * GET /location/nearby
   * Return a privacy-safe list of nearby users within the given radius.
   * Never exposes exact coordinates – only distance buckets.
   */
  app.get("/location/nearby", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const query = req.query as Record<string, string>;

    // Parse & validate query params
    const radiusResult = z.coerce.number().min(50).max(5000).safeParse(query.radius ?? 500);
    const radius = radiusResult.success ? radiusResult.data : 500;

    const modeFilter = query.mode as string | undefined;

    // Get requester's location
    const myLocation = await app.prisma.userLocation.findUnique({ where: { userId } });
    if (!myLocation) {
      return reply.status(400).send({ error: "Your location is unknown. Call /location/update first." });
    }

    // Query Redis GEO for nearby users
    const hits = await app.geo.nearby(myLocation.lng, myLocation.lat, radius, userId);
    if (!hits.length) return { users: [] };

    const nearbyIds = hits.map((h) => h.userId);

    // Fetch user + profile data in one query
    const users = await app.prisma.user.findMany({
      where: { id: { in: nearbyIds } },
      include: { profile: true },
    });

    // Fetch blocks (both directions)
    const blocks = await app.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: nearbyIds } },
          { blockedId: userId, blockerId: { in: nearbyIds } },
        ],
      },
    });
    const blockedSet = new Set<string>();
    for (const b of blocks) {
      blockedSet.add(b.blockedId);
      blockedSet.add(b.blockerId);
    }
    blockedSet.delete(userId); // don't remove self

    const result = hits
      .map((hit) => {
        if (blockedSet.has(hit.userId)) return null;

        const user = users.find((u) => u.id === hit.userId);
        if (!user || !user.profile) return null;

        // Apply mode filter
        if (modeFilter && user.profile.mode !== modeFilter) return null;

        const distanceBucket = app.geo.bucketForDistance(hit.distanceM);

        return {
          id: user.id,
          name: user.profile.name,
          age: user.profile.age ?? undefined,
          photoUrl: user.profile.photos[0] ?? undefined,
          verified: user.profile.verified,
          mode: user.profile.mode,
          interests: user.profile.interests.slice(0, 3),
          isOnline: user.isOnline,
          distanceBucket,
          // NEVER expose exact coordinates
        };
      })
      .filter(Boolean);

    return { users: result };
  });
};

export default locationRoutes;
