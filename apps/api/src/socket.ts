import type { Server, Socket } from "socket.io";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocketData {
  userId: string;
}

function socketUserId(s: Socket): string {
  return (s.data as SocketData).userId;
}

// ─── Socket.io attachment ─────────────────────────────────────────────────────

export function attachSocketIO(io: Server, app: FastifyInstance): void {
  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers?.authorization ?? "").replace("Bearer ", "");

      if (!token) throw new Error("Unauthorized – no token");

      const decoded = jwt.verify(token, app.env.JWT_SECRET) as {
        sub?: string;
        phone?: string;
      };

      if (!decoded.sub) throw new Error("Unauthorized – invalid payload");
      (socket.data as SocketData).userId = decoded.sub;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socketUserId(socket);
    app.log.info({ userId, socketId: socket.id }, "Socket connected");

    // Join the user's personal room (for targeted events)
    void socket.join(`user:${userId}`);

    // Mark user online
    void (async () => {
      try {
        await app.redis.set(`vybeon:online:${userId}`, "1", "EX", 300);
        await app.prisma.user.update({
          where: { id: userId },
          data: { isOnline: true },
        });
      } catch (e) {
        app.log.error(e, "Failed to mark user online");
      }
    })();

    // ── user:online heartbeat ──────────────────────────────────────────────
    socket.on("user:online", async () => {
      try {
        await app.redis.set(`vybeon:online:${userId}`, "1", "EX", 300);
        socket.emit("nearby:update", { ok: true });
      } catch (e) {
        app.log.error(e, "user:online handler failed");
      }
    });

    // ── location:update ───────────────────────────────────────────────────
    socket.on(
      "location:update",
      async (payload: { lat: number; lng: number; accuracy?: number }) => {
        try {
          if (
            typeof payload.lat !== "number" ||
            typeof payload.lng !== "number" ||
            payload.lat < -90 ||
            payload.lat > 90 ||
            payload.lng < -180 ||
            payload.lng > 180
          ) {
            return;
          }

          // Persist to Postgres
          await app.prisma.userLocation.upsert({
            where: { userId },
            create: { userId, lat: payload.lat, lng: payload.lng, accuracy: payload.accuracy },
            update: { lat: payload.lat, lng: payload.lng, accuracy: payload.accuracy },
          });

          // Update Redis GEO
          await app.geo.setUserLocation(userId, payload.lng, payload.lat);
          await app.redis.set(`vybeon:online:${userId}`, "1", "EX", 300);

          // Notify nearby subscribers in surrounding rooms
          await broadcastNearbyUpdate(io, app, userId, payload.lng, payload.lat);
        } catch (e) {
          app.log.error(e, "location:update handler failed");
        }
      }
    );

    // ── nearby:subscribe ──────────────────────────────────────────────────
    socket.on("nearby:subscribe", async (payload?: { radius?: number }) => {
      try {
        const radius = Math.min(5000, Math.max(50, payload?.radius ?? 500));
        const loc = await app.prisma.userLocation.findUnique({ where: { userId } });
        if (!loc) return;

        const hits = await app.geo.nearby(loc.lng, loc.lat, radius, userId);
        const ids = hits.map((h) => h.userId);
        if (!ids.length) {
          socket.emit("nearby:update", { users: [] });
          return;
        }

        const users = await app.prisma.user.findMany({
          where: { id: { in: ids } },
          include: { profile: true },
        });

        const nearby = hits
          .map((h) => {
            const u = users.find((u) => u.id === h.userId);
            if (!u || !u.profile) return null;
            return {
              id: u.id,
              name: u.profile.name,
              age: u.profile.age,
              photoUrl: u.profile.photos[0],
              verified: u.profile.verified,
              mode: u.profile.mode,
              interests: u.profile.interests.slice(0, 3),
              isOnline: u.isOnline,
              distanceBucket: app.geo.bucketForDistance(h.distanceM),
            };
          })
          .filter(Boolean);

        socket.emit("nearby:update", { users: nearby });
      } catch (e) {
        app.log.error(e, "nearby:subscribe handler failed");
      }
    });

    // ── message:send ──────────────────────────────────────────────────────
    socket.on(
      "message:send",
      async (payload: { chatId: string; content: string; type?: string }) => {
        try {
          if (!payload.chatId || !payload.content?.trim()) return;

          // Verify user is a participant in this chat
          const chat = await app.prisma.chat.findFirst({
            where: { id: payload.chatId, users: { some: { id: userId } } },
            include: { users: true },
          });
          if (!chat) {
            socket.emit("error", { event: "message:send", error: "Chat not found" });
            return;
          }

          // Rate limit check via Redis
          const rlKey = `vybeon:msg_rl:${userId}`;
          const count = await app.redis.incr(rlKey);
          if (count === 1) await app.redis.expire(rlKey, 60);
          if (count > 60) {
            socket.emit("error", { event: "message:send", error: "Rate limit exceeded" });
            return;
          }

          // Join the chat room if not already in it
          void socket.join(`chat:${payload.chatId}`);

          // Persist message
          const message = await app.prisma.message.create({
            data: {
              chatId: payload.chatId,
              senderId: userId,
              content: payload.content.trim().slice(0, 4000),
              type: payload.type ?? "text",
            },
          });

          const msgDto = {
            id: message.id,
            chatId: message.chatId,
            senderId: message.senderId,
            content: message.content,
            type: message.type,
            mediaUrl: message.mediaUrl,
            readAt: message.readAt,
            createdAt: message.createdAt,
          };

          // Emit to all chat participants
          for (const u of chat.users) {
            io.to(`user:${u.id}`).emit("message:new", msgDto);
          }
        } catch (e) {
          app.log.error(e, "message:send handler failed");
        }
      }
    );

    // ── typing:start ──────────────────────────────────────────────────────
    socket.on("typing:start", (payload: { chatId: string }) => {
      if (!payload.chatId) return;
      socket.to(`chat:${payload.chatId}`).emit("typing:update", {
        chatId: payload.chatId,
        userId,
        isTyping: true,
      });
      // Also broadcast to users in personal rooms (if not in chat room)
      void (async () => {
        try {
          const chat = await app.prisma.chat.findFirst({
            where: { id: payload.chatId, users: { some: { id: userId } } },
            include: { users: true },
          });
          if (!chat) return;
          for (const u of chat.users) {
            if (u.id !== userId) {
              io.to(`user:${u.id}`).emit("typing:update", {
                chatId: payload.chatId,
                userId,
                isTyping: true,
              });
            }
          }
        } catch {
          /* ignore */
        }
      })();
    });

    // ── typing:stop ───────────────────────────────────────────────────────
    socket.on("typing:stop", (payload: { chatId: string }) => {
      if (!payload.chatId) return;
      socket.to(`chat:${payload.chatId}`).emit("typing:update", {
        chatId: payload.chatId,
        userId,
        isTyping: false,
      });
      void (async () => {
        try {
          const chat = await app.prisma.chat.findFirst({
            where: { id: payload.chatId, users: { some: { id: userId } } },
            include: { users: true },
          });
          if (!chat) return;
          for (const u of chat.users) {
            if (u.id !== userId) {
              io.to(`user:${u.id}`).emit("typing:update", {
                chatId: payload.chatId,
                userId,
                isTyping: false,
              });
            }
          }
        } catch {
          /* ignore */
        }
      })();
    });

    // ── call:request ──────────────────────────────────────────────────────
    socket.on(
      "call:request",
      async (payload: { targetUserId: string; type: "audio" | "video" }) => {
        try {
          if (!payload.targetUserId || !payload.type) return;

          const callerProfile = await app.prisma.profile.findUnique({
            where: { userId },
          });

          io.to(`user:${payload.targetUserId}`).emit("call:incoming", {
            fromUserId: userId,
            fromName: callerProfile?.name,
            fromPhoto: callerProfile?.photos[0],
            type: payload.type,
          });
        } catch (e) {
          app.log.error(e, "call:request handler failed");
        }
      }
    );

    // ── call:accept ───────────────────────────────────────────────────────
    socket.on("call:accept", (payload: { callId: string }) => {
      socket.broadcast.emit("call:accepted", { callId: payload.callId, userId });
    });

    // ── call:reject ───────────────────────────────────────────────────────
    socket.on("call:reject", (payload: { callId: string }) => {
      socket.broadcast.emit("call:rejected", { callId: payload.callId });
    });

    // ── call:end ──────────────────────────────────────────────────────────
    socket.on("call:end", (payload: { callId: string }) => {
      socket.broadcast.emit("call:ended", { callId: payload.callId });
    });

    // ── WebRTC relay ──────────────────────────────────────────────────────
    socket.on(
      "webrtc:offer",
      (p: { targetUserId: string; sdp: unknown; callId?: string }) => {
        if (!p.targetUserId) return;
        io.to(`user:${p.targetUserId}`).emit("webrtc:offer", {
          fromUserId: userId,
          sdp: p.sdp,
          callId: p.callId,
        });
      }
    );

    socket.on(
      "webrtc:answer",
      (p: { targetUserId: string; sdp: unknown; callId?: string }) => {
        if (!p.targetUserId) return;
        io.to(`user:${p.targetUserId}`).emit("webrtc:answer", {
          fromUserId: userId,
          sdp: p.sdp,
          callId: p.callId,
        });
      }
    );

    socket.on(
      "webrtc:ice",
      (p: { targetUserId: string; candidate: unknown; callId?: string }) => {
        if (!p.targetUserId) return;
        io.to(`user:${p.targetUserId}`).emit("webrtc:ice", {
          fromUserId: userId,
          candidate: p.candidate,
          callId: p.callId,
        });
      }
    );

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      app.log.info({ userId, socketId: socket.id }, "Socket disconnected");
      try {
        await app.redis.del(`vybeon:online:${userId}`);
        await app.prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: new Date() },
        });
      } catch (e) {
        app.log.error(e, "Failed to mark user offline on disconnect");
      }
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * After a location update, find nearby users subscribed to nearby events
 * and push fresh nearby data to them.
 */
async function broadcastNearbyUpdate(
  io: Server,
  app: FastifyInstance,
  updatedUserId: string,
  lng: number,
  lat: number
): Promise<void> {
  try {
    // Find users within 1km who might want a nearby update
    const hits = await app.geo.nearby(lng, lat, 1000, updatedUserId);
    if (!hits.length) return;

    const updatedProfile = await app.prisma.profile.findUnique({
      where: { userId: updatedUserId },
    });
    const updatedUser = await app.prisma.user.findUnique({ where: { id: updatedUserId } });

    if (!updatedProfile || !updatedUser) return;

    const nearbyUserInfo = {
      id: updatedUserId,
      name: updatedProfile.name,
      age: updatedProfile.age,
      photoUrl: updatedProfile.photos[0],
      verified: updatedProfile.verified,
      mode: updatedProfile.mode,
      isOnline: updatedUser.isOnline,
    };

    // Emit to each nearby user's personal room
    for (const hit of hits) {
      io.to(`user:${hit.userId}`).emit("nearby:moved", {
        user: {
          ...nearbyUserInfo,
          distanceBucket: app.geo.bucketForDistance(hit.distanceM),
        },
      });
    }
  } catch (e) {
    app.log.error(e, "broadcastNearbyUpdate failed");
  }
}
