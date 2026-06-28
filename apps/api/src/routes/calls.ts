import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const requestCallBody = z.object({
  targetUserId: z.string().min(1),
  type: z.enum(["audio", "video"]),
});

// ─── Agora token helper ───────────────────────────────────────────────────────

/**
 * Generate an Agora RTC token.
 * Falls back to a placeholder string if AGORA_APP_CERTIFICATE is not configured.
 */
async function generateAgoraToken(
  appId: string | undefined,
  appCertificate: string | undefined,
  channelName: string,
  uid: number,
  role: number,
  expireSeconds: number
): Promise<string> {
  if (!appId || !appCertificate) {
    // Return a clearly-labelled placeholder so clients know to skip Agora init
    return `DEV_TOKEN_NO_CERT_${channelName}_${uid}`;
  }

  try {
    const { RtcTokenBuilder, RtcRole } = await import("agora-token");
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expireSeconds;
    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs,
      privilegeExpiredTs
    );
  } catch {
    // agora-token not installed or cert invalid – return placeholder
    return `AGORA_TOKEN_ERROR_${channelName}_${uid}`;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const callsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /calls/request
   * Initiate an audio or video call to another user.
   * Video calls require both users to be verified.
   */
  app.post("/calls/request", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);

    let body: z.infer<typeof requestCallBody>;
    try {
      body = requestCallBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "targetUserId and type (audio|video) are required" });
    }

    if (body.targetUserId === userId) {
      return reply.status(400).send({ error: "Cannot call yourself" });
    }

    // Video calls: both users must be verified
    if (body.type === "video") {
      const [callerProfile, receiverProfile] = await Promise.all([
        app.prisma.profile.findUnique({ where: { userId } }),
        app.prisma.profile.findUnique({ where: { userId: body.targetUserId } }),
      ]);
      if (!callerProfile?.verified || !receiverProfile?.verified) {
        return reply.status(403).send({
          error: "Both users must be face-verified to make video calls",
        });
      }
    }

    // Block check
    const block = await app.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: body.targetUserId },
          { blockerId: body.targetUserId, blockedId: userId },
        ],
      },
    });
    if (block) return reply.status(403).send({ error: "Cannot call this user" });

    // Must have a mutual chat (i.e. matched users)
    const mutualChat = await app.prisma.chat.findFirst({
      where: {
        AND: [
          { users: { some: { id: userId } } },
          { users: { some: { id: body.targetUserId } } },
        ],
      },
    });
    if (!mutualChat) {
      return reply.status(403).send({ error: "You must match before calling" });
    }

    // No active call already in progress
    const activeCall = await app.prisma.callSession.findFirst({
      where: {
        status: { in: ["ringing", "active"] },
        users: { some: { id: userId } },
      },
    });
    if (activeCall) {
      return reply.status(409).send({ error: "You already have an active call" });
    }

    const channelName = `call_${randomUUID()}`;
    const tokenExpirySeconds = 3600; // 1 hour

    // Generate Agora RTC token for the initiator (uid = 1)
    const agoraToken = await generateAgoraToken(
      app.env.AGORA_APP_ID,
      app.env.AGORA_APP_CERTIFICATE,
      channelName,
      1, // initiator uid
      1, // RtcRole.PUBLISHER
      tokenExpirySeconds
    );

    const call = await app.prisma.callSession.create({
      data: {
        type: body.type as any,
        status: "ringing",
        channelName,
        agoraToken,
        users: { connect: [{ id: userId }, { id: body.targetUserId }] },
      },
    });

    // Fetch caller's profile for the notification
    const callerProfile = await app.prisma.profile.findUnique({ where: { userId } });

    // Notify receiver via socket
    app.io?.to(`user:${body.targetUserId}`).emit("call:incoming", {
      id: call.id,
      type: call.type,
      fromUserId: userId,
      fromName: callerProfile?.name,
      fromPhoto: callerProfile?.photos[0],
    });

    // In-app notification for receiver
    await app.prisma.notification.create({
      data: {
        userId: body.targetUserId,
        type: "call",
        title: `Incoming ${body.type} call`,
        body: `${callerProfile?.name ?? "Someone"} is calling you`,
        data: { callId: call.id, fromUserId: userId, type: body.type },
      },
    });

    return {
      ok: true,
      callId: call.id,
      channelName,
      agoraToken,
      type: body.type,
    };
  });

  /**
   * POST /calls/:id/accept
   * Accept an incoming call. Generates Agora token for the receiver.
   */
  app.post("/calls/:id/accept", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const callId = z.string().min(1).parse((req.params as { id: string }).id);

    const call = await app.prisma.callSession.findFirst({
      where: { id: callId, status: "ringing", users: { some: { id: userId } } },
      include: { users: true },
    });

    if (!call) {
      return reply.status(404).send({ error: "Call not found or no longer ringing" });
    }

    // Determine initiator (the other user)
    const initiator = call.users.find((u) => u.id !== userId);

    const tokenExpirySeconds = 3600;
    const receiverToken = await generateAgoraToken(
      app.env.AGORA_APP_ID,
      app.env.AGORA_APP_CERTIFICATE,
      call.channelName!,
      2, // receiver uid
      1, // RtcRole.PUBLISHER
      tokenExpirySeconds
    );

    const updated = await app.prisma.callSession.update({
      where: { id: callId },
      data: { status: "active", startedAt: new Date() },
    });

    // Notify initiator
    if (initiator) {
      app.io?.to(`user:${initiator.id}`).emit("call:accepted", {
        id: callId,
        channelName: call.channelName,
        agoraToken: call.agoraToken, // initiator's existing token
      });
    }

    return {
      ok: true,
      channelName: updated.channelName,
      agoraToken: receiverToken,
    };
  });

  /**
   * GET /calls/:id/agora-token
   * Return Agora join credentials for a participant. Token is signed with
   * uid 0 (valid for any uid), so either party can join the channel.
   */
  app.get("/calls/:id/agora-token", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const callId = z.string().min(1).parse((req.params as { id: string }).id);

    const call = await app.prisma.callSession.findFirst({
      where: { id: callId, users: { some: { id: userId } } },
    });
    if (!call || !call.channelName) {
      return reply.status(404).send({ error: "Call not found" });
    }

    const token = await generateAgoraToken(
      app.env.AGORA_APP_ID,
      app.env.AGORA_APP_CERTIFICATE,
      call.channelName,
      0, // uid 0 → token usable by any uid
      1, // RtcRole.PUBLISHER
      3600
    );

    return {
      ok: true,
      appId: app.env.AGORA_APP_ID ?? null,
      channelName: call.channelName,
      token,
    };
  });

  /**
   * POST /calls/:id/reject
   * Reject an incoming call.
   */
  app.post("/calls/:id/reject", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const callId = z.string().min(1).parse((req.params as { id: string }).id);

    const call = await app.prisma.callSession.findFirst({
      where: { id: callId, status: "ringing", users: { some: { id: userId } } },
      include: { users: true },
    });

    if (!call) {
      return reply.status(404).send({ error: "Call not found" });
    }

    await app.prisma.callSession.update({
      where: { id: callId },
      data: { status: "rejected" as any },
    });

    // Notify initiator
    const initiator = call.users.find((u) => u.id !== userId);
    if (initiator) {
      app.io?.to(`user:${initiator.id}`).emit("call:rejected", { id: callId });
    }

    return { ok: true };
  });

  /**
   * POST /calls/:id/end
   * End an active call and calculate duration.
   */
  app.post("/calls/:id/end", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const callId = z.string().min(1).parse((req.params as { id: string }).id);

    const call = await app.prisma.callSession.findFirst({
      where: {
        id: callId,
        status: { in: ["ringing", "active"] },
        users: { some: { id: userId } },
      },
      include: { users: true },
    });

    if (!call) {
      return reply.status(404).send({ error: "Call not found or already ended" });
    }

    const endedAt = new Date();
    const duration =
      call.startedAt ? Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000) : 0;

    await app.prisma.callSession.update({
      where: { id: callId },
      data: { status: "ended", endedAt, duration },
    });

    // Notify all participants
    for (const u of call.users) {
      app.io?.to(`user:${u.id}`).emit("call:ended", { id: callId, duration });
    }

    return { ok: true, duration };
  });

  /**
   * GET /calls/history
   * Get the current user's call history.
   */
  app.get("/calls/history", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);
    const query = req.query as Record<string, string>;
    const limit = Math.min(50, parseInt(query.limit ?? "20", 10));

    const calls = await app.prisma.callSession.findMany({
      where: { users: { some: { id: userId } } },
      include: { users: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      calls: calls.map((c) => {
        const peer = c.users.find((u) => u.id !== userId);
        return {
          id: c.id,
          type: c.type,
          status: c.status,
          peerId: peer?.id,
          peerName: peer?.profile?.name,
          peerPhoto: peer?.profile?.photos?.[0],
          duration: c.duration,
          startedAt: c.startedAt,
          createdAt: c.createdAt,
        };
      }),
    };
  });
};

export default callsRoutes;
