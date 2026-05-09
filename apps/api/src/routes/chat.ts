import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";

// ─── Validation ───────────────────────────────────────────────────────────────

const sendMessageBody = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(["text", "image", "audio", "video"]).default("text"),
  mediaUrl: z.string().url().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

const chatRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /chats
   * Return all chats for the authenticated user, ordered by most recent activity.
   */
  app.get("/chats", { preHandler: [app.authenticate] }, async (req) => {
    const userId = requireUserId(req);

    const chats = await app.prisma.chat.findMany({
      where: { users: { some: { id: userId } } },
      include: {
        users: {
          include: { profile: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get unread counts per chat
    const chatIds = chats.map((c) => c.id);
    const unreadCounts = await Promise.all(
      chatIds.map((chatId) =>
        app.prisma.message.count({
          where: {
            chatId,
            senderId: { not: userId },
            readAt: null,
          },
        })
      )
    );

    return {
      chats: chats.map((c, i) => {
        const peer = c.users.find((u) => u.id !== userId);
        const lastMsg = c.messages[0];

        return {
          id: c.id,
          peerId: peer?.id ?? null,
          peerName: peer?.profile?.name ?? "Chat",
          peerPhoto: peer?.profile?.photos?.[0] ?? null,
          peerVerified: peer?.profile?.verified ?? false,
          peerIsOnline: peer?.isOnline ?? false,
          lastMessage: lastMsg?.content ?? null,
          lastMessageType: lastMsg?.type ?? null,
          lastMessageAt: lastMsg?.createdAt ?? c.createdAt,
          unreadCount: unreadCounts[i],
        };
      }),
    };
  });

  /**
   * GET /chats/:id/messages
   * Paginated messages for a chat, newest first.
   * Also marks received messages as read.
   */
  app.get("/chats/:id/messages", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const chatId = z.string().min(1).parse((req.params as { id: string }).id);
    const query = req.query as Record<string, string>;

    // Verify membership
    const chat = await app.prisma.chat.findFirst({
      where: { id: chatId, users: { some: { id: userId } } },
    });
    if (!chat) return reply.status(404).send({ error: "Chat not found" });

    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "50", 10)));
    const before = query.before; // cursor: createdAt ISO string

    const messages = await app.prisma.message.findMany({
      where: {
        chatId,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Mark messages from the other user as read
    const now = new Date();
    await app.prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: now },
    });

    return {
      messages: messages.reverse(), // return in ascending order for rendering
      hasMore: messages.length === limit,
      cursor: messages[0]?.createdAt.toISOString() ?? null,
    };
  });

  /**
   * POST /chats/:id/messages
   * Send a message to a chat. Rate limit: 60/minute.
   */
  app.post("/chats/:id/messages", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = requireUserId(req);
    const chatId = z.string().min(1).parse((req.params as { id: string }).id);

    // Rate limit: 60 messages per minute
    const rlKey = `vybeon:msg_rl:${userId}`;
    const count = await app.redis.incr(rlKey);
    if (count === 1) await app.redis.expire(rlKey, 60);
    if (count > 60) {
      return reply.status(429).send({ error: "Message rate limit exceeded (60/minute)" });
    }

    let body: z.infer<typeof sendMessageBody>;
    try {
      body = sendMessageBody.parse(req.body);
    } catch {
      return reply.status(400).send({ error: "Invalid message body" });
    }

    // Verify membership
    const chat = await app.prisma.chat.findFirst({
      where: { id: chatId, users: { some: { id: userId } } },
      include: { users: true },
    });
    if (!chat) return reply.status(404).send({ error: "Chat not found" });

    // Create message
    const message = await app.prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: body.content,
        type: body.type,
        mediaUrl: body.mediaUrl,
      },
    });

    // Emit to all chat participants via Socket.io
    for (const u of chat.users) {
      app.io?.to(`user:${u.id}`).emit("message:new", {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        mediaUrl: message.mediaUrl,
        readAt: message.readAt,
        createdAt: message.createdAt,
      });
    }

    // Create notification for the receiver (not the sender)
    const receiver = chat.users.find((u) => u.id !== userId);
    if (receiver) {
      const senderProfile = await app.prisma.profile.findUnique({ where: { userId } });
      await app.prisma.notification.create({
        data: {
          userId: receiver.id,
          type: "message",
          title: senderProfile?.name ?? "New message",
          body:
            body.type === "text"
              ? body.content.slice(0, 100)
              : `Sent a ${body.type}`,
          data: { chatId, messageId: message.id, senderId: userId },
        },
      });
    }

    return message;
  });

  /**
   * PATCH /chats/:chatId/messages/:messageId/read
   * Mark a specific message as read.
   */
  app.patch(
    "/chats/:chatId/messages/:messageId/read",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = requireUserId(req);
      const { chatId, messageId } = req.params as { chatId: string; messageId: string };

      // Verify membership
      const chat = await app.prisma.chat.findFirst({
        where: { id: chatId, users: { some: { id: userId } } },
      });
      if (!chat) return reply.status(404).send({ error: "Chat not found" });

      await app.prisma.message.updateMany({
        where: { id: messageId, chatId, senderId: { not: userId }, readAt: null },
        data: { readAt: new Date() },
      });

      return { ok: true };
    }
  );
};

export default chatRoutes;
