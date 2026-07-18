import type { Server, Socket } from "socket.io";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { notifyIfOffline } from "./lib/push.js";
import { buildIceServers } from "./lib/ice.js";

// ─── Stranger Chat Types ──────────────────────────────────────────────────────

interface QueuePreferences {
  mode:       "text" | "video" | "audio";
  genderPref: "everyone" | "male" | "female";
  nearbyOnly: boolean;
  lat?:       number;
  lng?:       number;
  country:    string;
  interests:  string[];
}

interface QueueEntry {
  userId:    string;
  prefs:     QueuePreferences;
  gender?:   string; // profile gender for matching
  joinedAt:  number; // epoch ms
}

interface ActiveStrangerSession {
  sessionId: string;
  partnerId: string;
  roomId:    string;
  mode:      string;
  startedAt: number;
}

// ─── Matchmaking Helpers ──────────────────────────────────────────────────────

function genderCompatible(
  myPref: string,
  theirPref: string,
  myGender?: string,
  theirGender?: string
): boolean {
  // Both must accept each other's gender
  const iAcceptThem =
    myPref === "everyone" || myGender === undefined || theirGender === myPref;
  const theyAcceptMe =
    theirPref === "everyone" || theirGender === undefined || myGender === theirPref;
  return iAcceptThem && theyAcceptMe;
}

function interestScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  return b.filter((s) => setA.has(s.toLowerCase())).length;
}

async function getStrangerSession(
  redis: FastifyInstance["redis"],
  userId: string
): Promise<ActiveStrangerSession | null> {
  const raw = await redis.get(`stranger:session:${userId}`);
  return raw ? (JSON.parse(raw) as ActiveStrangerSession) : null;
}

async function clearStrangerSession(
  redis: FastifyInstance["redis"],
  userId: string,
  partnerId: string
): Promise<void> {
  await redis.del(`stranger:session:${userId}`, `stranger:session:${partnerId}`);
}

async function removeFromQueue(
  redis: FastifyInstance["redis"],
  userId: string
): Promise<void> {
  await redis.del(`stranger:q:${userId}`);
  await redis.srem("stranger:queued", userId);
}

// ─── Core matchmaking ─────────────────────────────────────────────────────────

async function tryMatch(
  io: Server,
  app: FastifyInstance,
  userId: string,
  prefs: QueuePreferences,
  myGender?: string
): Promise<void> {
  const candidateIds = await app.redis.smembers("stranger:queued");

  // Sort candidates: nearby first (if nearbyOnly or lat/lng present), then by interest overlap
  const candidates: Array<{ id: string; entry: QueueEntry; score: number }> = [];

  for (const cId of candidateIds) {
    if (cId === userId) continue;

    const raw = await app.redis.get(`stranger:q:${cId}`);
    if (!raw) {
      await app.redis.srem("stranger:queued", cId); // stale
      continue;
    }

    const entry: QueueEntry = JSON.parse(raw);

    // Mode must match
    if (entry.prefs.mode !== prefs.mode) continue;

    // Country must match (unless nearbyOnly overrides)
    if (!prefs.nearbyOnly && entry.prefs.country !== prefs.country) continue;

    // Gender preference compatibility
    if (!genderCompatible(prefs.genderPref, entry.prefs.genderPref, myGender, entry.gender))
      continue;

    // Nearby-only constraint
    if (prefs.nearbyOnly && prefs.lat != null && prefs.lng != null) {
      if (entry.prefs.lat == null || entry.prefs.lng == null) continue;
      const dist = haversineKm(prefs.lat, prefs.lng, entry.prefs.lat, entry.prefs.lng);
      if (dist > 5) continue; // 5 km
    }

    // Score: interest overlap + recency
    const score =
      interestScore(prefs.interests, entry.prefs.interests) * 10 +
      (Date.now() - entry.joinedAt < 30_000 ? 5 : 0); // bonus for fresh entries

    candidates.push({ id: cId, entry, score });
  }

  if (!candidates.length) {
    // No match — broadcast queue position to user
    const position = await app.redis.scard("stranger:queued");
    io.to(`user:${userId}`).emit("stranger:queue-update", {
      position,
      searching: true,
    });
    return;
  }

  // Pick best scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  const matched = candidates[0];

  // Atomically remove both from queue
  await Promise.all([
    removeFromQueue(app.redis, userId),
    removeFromQueue(app.redis, matched.id),
  ]);

  // Create DB session
  const session = await app.prisma.strangerSession.create({
    data: {
      userAId: userId,
      userBId: matched.id,
      mode:    prefs.mode,
    },
  });

  // Store active session state for both users in Redis (2h TTL)
  const sessionPayloadA: ActiveStrangerSession = {
    sessionId: session.id,
    partnerId: matched.id,
    roomId:    session.roomId,
    mode:      prefs.mode,
    startedAt: Date.now(),
  };
  const sessionPayloadB: ActiveStrangerSession = {
    sessionId: session.id,
    partnerId: userId,
    roomId:    session.roomId,
    mode:      prefs.mode,
    startedAt: Date.now(),
  };

  await Promise.all([
    app.redis.set(`stranger:session:${userId}`, JSON.stringify(sessionPayloadA), "EX", 7200),
    app.redis.set(`stranger:session:${matched.id}`, JSON.stringify(sessionPayloadB), "EX", 7200),
  ]);

  // Fetch profile info (anonymous display — no real name/photo until friend request)
  const [profileA, profileB] = await Promise.all([
    app.prisma.profile.findUnique({ where: { userId }, select: { age: true, interests: true, mode: true } }),
    app.prisma.profile.findUnique({ where: { userId: matched.id }, select: { age: true, interests: true, mode: true } }),
  ]);

  const sharedInterests = (profileA?.interests ?? []).filter((i) =>
    (profileB?.interests ?? []).map((x) => x.toLowerCase()).includes(i.toLowerCase())
  );

  // Emit matched event to both
  io.to(`user:${userId}`).emit("stranger:matched", {
    sessionId: session.id,
    roomId:    session.roomId,
    mode:      prefs.mode,
    partner: {
      age:             profileB?.age ?? null,
      sharedInterests: sharedInterests.slice(0, 3),
      mode:            profileB?.mode ?? "happening",
    },
  });

  io.to(`user:${matched.id}`).emit("stranger:matched", {
    sessionId: session.id,
    roomId:    session.roomId,
    mode:      prefs.mode,
    partner: {
      age:             profileA?.age ?? null,
      sharedInterests: sharedInterests.slice(0, 3),
      mode:            profileA?.mode ?? "happening",
    },
  });

  app.log.info({ sessionId: session.id, userAId: userId, userBId: matched.id }, "Stranger matched");
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

      // Dev bypass: allow the hardcoded test token without JWT verification
      if (app.env.NODE_ENV !== "production" && token === "dev-access-token") {
        (socket.data as SocketData).userId = "dev-user-1";
        next();
        return;
      }

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

          // Push-notify recipients who are offline
          const senderProfile = await app.prisma.profile.findUnique({
            where: { userId },
            select: { name: true },
          });
          for (const u of chat.users) {
            if (u.id !== userId) {
              void notifyIfOffline(app, u.id, {
                title: senderProfile?.name ?? "New message",
                body: payload.content.trim().slice(0, 120),
                data: { type: "message", chatId: payload.chatId },
              });
            }
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

    // ── radar:ping ─────────────────────────────────────────────────────────
    socket.on("radar:ping", async (payload: { targetUserId: string }) => {
      try {
        if (!payload.targetUserId) return;
        const rlKey = `vybeon:radarping:${userId}:${payload.targetUserId}`;
        const exists = await app.redis.exists(rlKey);
        if (exists) return; // already pinged this user recently
        await app.redis.set(rlKey, "1", "EX", 300); // 5 min cooldown

        const profile = await app.prisma.profile.findUnique({ where: { userId } });
        io.to(`user:${payload.targetUserId}`).emit("radar:pinged", {
          fromUserId: userId,
          fromName: profile?.name ?? "Someone",
          fromPhoto: profile?.photos[0] ?? null,
        });

        // Push-notify the target if they're offline
        void notifyIfOffline(app, payload.targetUserId, {
          title: `${profile?.name ?? "Someone"} pinged you 💜`,
          body: "Tap to see who's nearby",
          data: { type: "ping", fromUserId: userId },
        });
      } catch (e) {
        app.log.error(e, "radar:ping failed");
      }
    });


    // ── connections:update — broadcast when a new connection is made ───────
    socket.on("connections:request-update", async () => {
      try {
        const count = await app.prisma.connection.count({
          where: { OR: [{ userAId: userId }, { userBId: userId }] },
        });
        socket.emit("connections:update", { total: count });
      } catch (e) {
        app.log.error(e, "connections:request-update failed");
      }
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── STRANGER CHAT ─────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // stranger:join-queue — user wants to find a random match
    socket.on("stranger:join-queue", async (payload: Partial<QueuePreferences>) => {
      try {
        // Rate limit: 30 queue joins per hour
        const rlKey = `vybeon:sq_rl:${userId}`;
        const rlCount = await app.redis.incr(rlKey);
        if (rlCount === 1) await app.redis.expire(rlKey, 3600);
        if (rlCount > 30) {
          socket.emit("stranger:error", { code: "RATE_LIMITED", message: "Too many queue joins. Please wait." });
          return;
        }

        // End any existing session before joining queue
        const existingSession = await getStrangerSession(app.redis, userId);
        if (existingSession) {
          await endStrangerSession(io, app, userId, existingSession, "new_queue");
        }

        // Fetch profile gender for matching
        const profile = await app.prisma.profile.findUnique({
          where: { userId },
          select: { gender: true, interests: true },
        });

        const prefs: QueuePreferences = {
          mode:       payload.mode ?? "text",
          genderPref: payload.genderPref ?? "everyone",
          nearbyOnly: payload.nearbyOnly ?? false,
          lat:        payload.lat,
          lng:        payload.lng,
          country:    payload.country ?? "IN",
          interests:  profile?.interests ?? [],
        };

        const entry: QueueEntry = {
          userId,
          prefs,
          gender:   profile?.gender ?? undefined,
          joinedAt: Date.now(),
        };

        // Store in queue (5 min TTL — auto-cleanup if client drops)
        await app.redis.set(`stranger:q:${userId}`, JSON.stringify(entry), "EX", 300);
        await app.redis.sadd("stranger:queued", userId);

        // Try to find a match immediately
        await tryMatch(io, app, userId, prefs, profile?.gender ?? undefined);
      } catch (e) {
        app.log.error(e, "stranger:join-queue failed");
        socket.emit("stranger:error", { code: "SERVER_ERROR", message: "Failed to join queue" });
      }
    });

    // stranger:leave-queue — user cancels search
    socket.on("stranger:leave-queue", async () => {
      try {
        await removeFromQueue(app.redis, userId);
        socket.emit("stranger:queue-update", { position: 0, searching: false });
      } catch (e) {
        app.log.error(e, "stranger:leave-queue failed");
      }
    });

    // stranger:next — skip current partner and re-queue
    socket.on("stranger:next", async (payload: { preferences?: Partial<QueuePreferences> }) => {
      try {
        const session = await getStrangerSession(app.redis, userId);
        if (!session) {
          socket.emit("stranger:error", { code: "NO_SESSION", message: "No active session" });
          return;
        }

        // End current session
        await endStrangerSession(io, app, userId, session, "skipped");

        // Re-queue with same or updated preferences
        const profile = await app.prisma.profile.findUnique({
          where: { userId },
          select: { gender: true, interests: true },
        });

        const prefs: QueuePreferences = {
          mode:       (payload.preferences?.mode ?? session.mode) as QueuePreferences["mode"],
          genderPref: payload.preferences?.genderPref ?? "everyone",
          nearbyOnly: payload.preferences?.nearbyOnly ?? false,
          lat:        payload.preferences?.lat,
          lng:        payload.preferences?.lng,
          country:    payload.preferences?.country ?? "IN",
          interests:  profile?.interests ?? [],
        };

        const entry: QueueEntry = {
          userId,
          prefs,
          gender:   profile?.gender ?? undefined,
          joinedAt: Date.now(),
        };

        await app.redis.set(`stranger:q:${userId}`, JSON.stringify(entry), "EX", 300);
        await app.redis.sadd("stranger:queued", userId);

        await tryMatch(io, app, userId, prefs, profile?.gender ?? undefined);
      } catch (e) {
        app.log.error(e, "stranger:next failed");
      }
    });

    // stranger:end — end session without re-queuing
    socket.on("stranger:end", async () => {
      try {
        const session = await getStrangerSession(app.redis, userId);
        if (!session) return;
        await endStrangerSession(io, app, userId, session, "ended");
      } catch (e) {
        app.log.error(e, "stranger:end failed");
      }
    });

    // stranger:message — send a message in the current stranger session
    socket.on("stranger:message", async (payload: { content: string; type?: string }) => {
      try {
        const session = await getStrangerSession(app.redis, userId);
        if (!session) {
          socket.emit("stranger:error", { code: "NO_SESSION", message: "No active session" });
          return;
        }

        if (!payload.content?.trim()) return;
        const content = payload.content.trim().slice(0, 2000);

        // Rate limit: 60 messages per minute
        const rlKey = `vybeon:sm_rl:${userId}`;
        const rlCount = await app.redis.incr(rlKey);
        if (rlCount === 1) await app.redis.expire(rlKey, 60);
        if (rlCount > 60) {
          socket.emit("stranger:error", { code: "RATE_LIMITED", message: "Slow down" });
          return;
        }

        const msg = await app.prisma.strangerMessage.create({
          data: {
            sessionId: session.sessionId,
            senderId:  userId,
            content,
            type:      payload.type ?? "text",
          },
        });

        const outbound = {
          id:        msg.id,
          sessionId: session.sessionId,
          senderId:  userId,
          content,
          type:      msg.type,
          createdAt: msg.createdAt,
        };

        // Send to both participants
        socket.emit("stranger:message", outbound);
        io.to(`user:${session.partnerId}`).emit("stranger:message", outbound);
      } catch (e) {
        app.log.error(e, "stranger:message failed");
      }
    });

    // stranger:typing — relay typing indicator to partner
    socket.on("stranger:typing", async (payload: { isTyping: boolean }) => {
      try {
        const session = await getStrangerSession(app.redis, userId);
        if (!session) return;
        io.to(`user:${session.partnerId}`).emit("stranger:typing", {
          userId,
          isTyping: payload.isTyping,
        });
      } catch (e) {
        app.log.error(e, "stranger:typing failed");
      }
    });

    // stranger:friend-request — send friend/ping request to current stranger
    socket.on("stranger:friend-request", async () => {
      try {
        const session = await getStrangerSession(app.redis, userId);
        if (!session) {
          socket.emit("stranger:error", { code: "NO_SESSION", message: "No active session" });
          return;
        }

        // Check if already friends / request pending
        const existing = await app.prisma.matchRequest.findFirst({
          where: {
            OR: [
              { fromUserId: userId, toUserId: session.partnerId },
              { fromUserId: session.partnerId, toUserId: userId },
            ],
          },
        });

        if (existing) {
          socket.emit("stranger:error", { code: "ALREADY_REQUESTED", message: "Request already sent" });
          return;
        }

        await app.prisma.matchRequest.create({
          data: {
            fromUserId: userId,
            toUserId:   session.partnerId,
            message:    "We met in random chat 👋",
          },
        });

        // Notify the partner
        const myProfile = await app.prisma.profile.findUnique({
          where:  { userId },
          select: { name: true, photos: true, age: true },
        });

        io.to(`user:${session.partnerId}`).emit("stranger:friend-request", {
          fromUserId: userId,
          fromName:   myProfile?.name ?? "Someone",
          fromPhoto:  myProfile?.photos[0] ?? null,
          fromAge:    myProfile?.age ?? null,
          sessionId:  session.sessionId,
        });

        socket.emit("stranger:friend-request-sent", { partnerId: session.partnerId });
      } catch (e) {
        app.log.error(e, "stranger:friend-request failed");
      }
    });

    // stranger:upgrade-video — upgrade current text session to video.
    // The user who initiates the upgrade becomes the WebRTC offerer.
    socket.on("stranger:upgrade-video", async () => {
      try {
        const session = await getStrangerSession(app.redis, userId);
        if (!session) return;

        // Update session mode
        await app.prisma.strangerSession.update({
          where: { id: session.sessionId },
          data:  { mode: "video" },
        });

        // Both peers get ICE servers; `isOfferer` tells the client who creates
        // the SDP offer so the peer connection negotiates deterministically.
        const iceServers = buildIceServers(app.env, userId);
        socket.emit("stranger:video-ready", {
          sessionId: session.sessionId,
          roomId:    session.roomId,
          iceServers,
          isOfferer: true,
        });
        io.to(`user:${session.partnerId}`).emit("stranger:video-ready", {
          sessionId: session.sessionId,
          roomId:    session.roomId,
          iceServers: buildIceServers(app.env, session.partnerId),
          isOfferer: false,
        });
      } catch (e) {
        app.log.error(e, "stranger:upgrade-video failed");
      }
    });

    // WebRTC relay for stranger peer connections
    socket.on("stranger:webrtc-offer", async (p: { sdp: unknown }) => {
      const session = await getStrangerSession(app.redis, userId).catch(() => null);
      if (!session) return;
      io.to(`user:${session.partnerId}`).emit("stranger:webrtc-offer", {
        fromUserId: userId,
        sdp: p.sdp,
      });
    });

    socket.on("stranger:webrtc-answer", async (p: { sdp: unknown }) => {
      const session = await getStrangerSession(app.redis, userId).catch(() => null);
      if (!session) return;
      io.to(`user:${session.partnerId}`).emit("stranger:webrtc-answer", {
        fromUserId: userId,
        sdp: p.sdp,
      });
    });

    socket.on("stranger:webrtc-ice", async (p: { candidate: unknown }) => {
      const session = await getStrangerSession(app.redis, userId).catch(() => null);
      if (!session) return;
      io.to(`user:${session.partnerId}`).emit("stranger:webrtc-ice", {
        fromUserId: userId,
        candidate: p.candidate,
      });
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      app.log.info({ userId, socketId: socket.id }, "Socket disconnected");

      // Clean up stranger queue / session on disconnect
      void (async () => {
        try {
          await removeFromQueue(app.redis, userId);
          const session = await getStrangerSession(app.redis, userId);
          if (session) {
            await endStrangerSession(io, app, userId, session, "disconnected");
          }
        } catch (e) {
          app.log.warn(e, "Stranger cleanup on disconnect failed");
        }
      })();

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
 * End a stranger session: persist to DB, notify partner, cleanup Redis.
 */
async function endStrangerSession(
  io: Server,
  app: FastifyInstance,
  endingUserId: string,
  session: ActiveStrangerSession,
  reason: string
): Promise<void> {
  const durationSec = Math.floor((Date.now() - session.startedAt) / 1000);

  await Promise.allSettled([
    app.prisma.strangerSession.update({
      where: { id: session.sessionId },
      data: {
        status:   reason === "reported" ? "reported" : reason === "new_queue" ? "ended" : "ended",
        endedAt:  new Date(),
        endedBy:  endingUserId,
        duration: durationSec,
        skipCount: reason === "skipped"
          ? { increment: 1 }
          : undefined,
      },
    }),
    clearStrangerSession(app.redis, endingUserId, session.partnerId),
  ]);

  // Notify partner their session ended
  io.to(`user:${session.partnerId}`).emit("stranger:session-ended", {
    sessionId: session.sessionId,
    reason,
    duration: durationSec,
  });
}

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
