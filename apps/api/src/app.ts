import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import type { Server } from "socket.io";
import type { Env } from "./env.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import locationRoutes from "./routes/location.js";
import discoveryRoutes from "./routes/discovery.js";
import chatRoutes from "./routes/chat.js";
import callsRoutes from "./routes/calls.js";
import placesRoutes from "./routes/places.js";
import safetyRoutes from "./routes/safety.js";

// ─── Module augmentation ──────────────────────────────────────────────────────

declare module "fastify" {
  interface FastifyInstance {
    env: Env;
    io: Server | null;
    authenticate: (
      req: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) => Promise<void>;
  }
}

// ─── App builder ──────────────────────────────────────────────────────────────

export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
    // Trust reverse-proxy headers (X-Forwarded-For)
    trustProxy: env.NODE_ENV === "production",
  });

  // ── Decorators ─────────────────────────────────────────────────────────────
  app.decorate("env", env);
  app.decorate("io", null as Server | null);

  // ── CORS ───────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin:
      env.CORS_ORIGIN === "*"
        ? true
        : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // ── JWT ────────────────────────────────────────────────────────────────────
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN ?? "15m" },
  });

  // ── Authentication decorator ───────────────────────────────────────────────
  app.decorate(
    "authenticate",
    async function (
      this: FastifyInstance,
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }
  );

  // ── Global rate limit ──────────────────────────────────────────────────────
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      error: "Too many requests. Please slow down.",
      statusCode: 429,
    }),
  });

  // ── Plugins ────────────────────────────────────────────────────────────────
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(profileRoutes);
  await app.register(locationRoutes);
  await app.register(discoveryRoutes);
  await app.register(chatRoutes);
  await app.register(callsRoutes);
  await app.register(placesRoutes);
  await app.register(safetyRoutes);

  // ── Health check ───────────────────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  }));

  // ── Global error handler ───────────────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    app.log.error({ err, url: req.url, method: req.method }, "Unhandled error");
    return reply.status(statusCode).send({
      error: statusCode === 500 ? "Internal server error" : err.message,
    });
  });

  return app;
}
