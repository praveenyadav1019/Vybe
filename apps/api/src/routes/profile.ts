import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";
import path from "path";

// ─── Validation schemas ───────────────────────────────────────────────────────

const patchProfileBody = z.object({
  name: z.string().min(1).max(50).optional(),
  age: z.number().int().min(18).max(99).optional(),
  gender: z.string().max(32).optional(),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string().max(30)).max(20).optional(),
  mode: z
    .enum(["dating", "hook", "co_travel", "night_out", "club_mates", "happening"])
    .optional(),
  safetyMode: z.boolean().optional(),
});

const pushTokenBody = z.object({
  pushToken: z.string().min(10).max(512),
});

const photoUrlsBody = z.object({
  urls: z.array(z.string().url()).min(1).max(6),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS = 6;

// ─── Routes ───────────────────────────────────────────────────────────────────

const profileRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /me
   * Return the authenticated user's full profile.
   */
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    // Dev bypass: return a mock user so the app stays logged in during local testing
    if (app.env.NODE_ENV !== "production" && userId === "dev-user-1") {
      return {
        user: {
          id: "dev-user-1",
          phone: "***-dev",
          name: "Praveen",
          age: 26,
          gender: "male",
          bio: "Dev user for local testing",
          photos: ["https://randomuser.me/api/portraits/men/10.jpg"],
          interests: ["Music", "Travel", "Nightlife"],
          isVerified: true,
          isPremium: false,
          activeMode: "happening",
          isOnline: true,
          lastSeen: new Date().toISOString(),
          safetyMode: false,
          privacyLevel: "public",
          createdAt: new Date().toISOString(),
        },
      };
    }

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        verification: true,
        location: true,
        subscription: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const p = user.profile;
    const modeMap: Record<string, string> = {
      dating: "dating",
      hook: "hook",
      co_travel: "co-travel",
      night_out: "night-out",
      club_mates: "club-mates",
      happening: "happening",
    };

    return {
      user: {
        id: user.id,
        phone: user.phone.slice(0, -4) + "****",
        name: p?.name ?? "",
        age: p?.age ?? 0,
        gender: p?.gender ?? "prefer-not-to-say",
        bio: p?.bio ?? undefined,
        photos: p?.photos ?? [],
        interests: p?.interests ?? [],
        isVerified: p?.verified ?? false,
        isPremium: user.subscription?.plan !== "free",
        activeMode: modeMap[p?.mode ?? "happening"] ?? "happening",
        isOnline: user.isOnline,
        lastSeen: user.lastSeen.toISOString(),
        safetyMode: p?.safetyMode ?? false,
        privacyLevel: "public",
        createdAt: user.createdAt.toISOString(),
      },
    };
  });

  /**
   * PATCH /me
   * Update profile fields.
   */
  app.patch("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    let body: z.infer<typeof patchProfileBody>;
    try {
      body = patchProfileBody.parse(req.body);
    } catch (err) {
      return reply.status(400).send({ error: "Invalid request body", details: err });
    }

    if (Object.keys(body).length === 0) {
      return reply.status(400).send({ error: "No fields to update" });
    }

    const profile = await app.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: body.name ?? "VYBEON Member",
        age: body.age,
        gender: body.gender,
        bio: body.bio,
        interests: body.interests ?? [],
        mode: body.mode as any,
        safetyMode: body.safetyMode ?? false,
      },
      update: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.age !== undefined && { age: body.age }),
        ...(body.gender !== undefined && { gender: body.gender }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.interests !== undefined && { interests: body.interests }),
        ...(body.mode !== undefined && { mode: body.mode as any }),
        ...(body.safetyMode !== undefined && { safetyMode: body.safetyMode }),
      },
    });

    return { ok: true, profile };
  });

  /**
   * POST /me/photos
   * Accept an array of photo URLs (client handles upload to storage, sends CDN URLs).
   * In production the mobile client uploads directly to S3 via presigned URLs,
   * then calls this endpoint with the resulting CDN URLs.
   */
  app.post("/me/photos", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    let body: z.infer<typeof photoUrlsBody>;
    try {
      body = photoUrlsBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "urls must be an array of up to 6 valid URLs" });
    }

    const existing = await app.prisma.profile.findUnique({ where: { userId } });
    const currentPhotos = existing?.photos ?? [];

    if (currentPhotos.length + body.urls.length > MAX_PHOTOS) {
      return reply.status(400).send({
        error: `Maximum ${MAX_PHOTOS} photos allowed. You have ${currentPhotos.length} currently.`,
      });
    }

    const photos = [...currentPhotos, ...body.urls];

    const profile = await app.prisma.profile.upsert({
      where: { userId },
      create: { userId, name: "VYBEON Member", photos },
      update: { photos },
    });

    return { ok: true, photos: profile.photos };
  });

  /**
   * DELETE /me/photos/:index
   * Remove a photo by index from the user's photos array.
   */
  app.delete("/me/photos/:index", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const index = parseInt((req.params as { index: string }).index, 10);

    if (isNaN(index) || index < 0) {
      return reply.status(400).send({ error: "Invalid photo index" });
    }

    const profile = await app.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      return reply.status(404).send({ error: "Profile not found" });
    }

    if (index >= profile.photos.length) {
      return reply.status(400).send({ error: `Photo at index ${index} does not exist` });
    }

    const photos = [...profile.photos];
    photos.splice(index, 1);

    const updated = await app.prisma.profile.update({
      where: { userId },
      data: { photos },
    });

    return { ok: true, photos: updated.photos };
  });

  /**
   * PATCH /me/push-token
   * Register or update FCM/APNs push notification token.
   */
  app.patch("/me/push-token", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    let body: z.infer<typeof pushTokenBody>;
    try {
      body = pushTokenBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "pushToken is required" });
    }

    await app.prisma.user.update({
      where: { id: userId },
      data: { pushToken: body.pushToken },
    });

    return { ok: true };
  });

  /**
   * GET /users/:id
   * View another user's public profile.
   * Respects block relationships and privacy.
   */
  app.get("/users/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const viewerId = requireUserId(req);
    const targetId = z.string().min(1).parse((req.params as { id: string }).id);

    if (targetId === viewerId) {
      // Self-view – return full profile
      const self = await app.prisma.profile.findUnique({ where: { userId: viewerId } });
      return self ?? reply.status(404).send({ error: "Profile not found" });
    }

    // Check block relationships
    const block = await app.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetId },
          { blockerId: targetId, blockedId: viewerId },
        ],
      },
    });

    if (block) {
      return reply.status(404).send({ error: "User not found" });
    }

    const [targetUser, targetProfile, targetVerification] = await Promise.all([
      app.prisma.user.findUnique({ where: { id: targetId } }),
      app.prisma.profile.findUnique({ where: { userId: targetId } }),
      app.prisma.verification.findUnique({ where: { userId: targetId } }),
    ]);

    if (!targetUser || !targetProfile) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Calculate distance (if both have locations)
    let distanceBucket: string | undefined;
    const [viewerLoc, targetLoc] = await Promise.all([
      app.prisma.userLocation.findUnique({ where: { userId: viewerId } }),
      app.prisma.userLocation.findUnique({ where: { userId: targetId } }),
    ]);

    if (viewerLoc && targetLoc) {
      const dist = app.geo.bucketForDistance(
        haversineM(viewerLoc.lat, viewerLoc.lng, targetLoc.lat, targetLoc.lng)
      );
      distanceBucket = dist;
    }

    return {
      id: targetUser.id,
      name: targetProfile.name,
      age: targetProfile.age,
      gender: targetProfile.gender,
      bio: targetProfile.bio,
      interests: targetProfile.interests,
      photos: targetProfile.photos,
      verified: targetProfile.verified,
      verificationStatus: targetVerification?.status ?? "none",
      mode: targetProfile.mode,
      isOnline: targetUser.isOnline,
      lastSeen: !targetUser.isOnline ? targetUser.lastSeen : undefined,
      distanceBucket,
    };
  });

  /**
   * POST /me/verify-face
   * Submit liveness / face verification (placeholder – integrate with vendor).
   */
  app.post("/me/verify-face", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    // In production: integrate with Onfido, Jumio, or Sumsub.
    // For now mark as verified directly (dev/staging only).
    const verification = await app.prisma.verification.upsert({
      where: { userId },
      create: { userId, status: "verified", livenessScore: 0.97 },
      update: { status: "verified", livenessScore: 0.97 },
    });

    await app.prisma.profile.updateMany({
      where: { userId },
      data: { verified: true },
    });

    return { ok: true, status: verification.status };
  });
};

// ─── Haversine distance ───────────────────────────────────────────────────────

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

export default profileRoutes;
