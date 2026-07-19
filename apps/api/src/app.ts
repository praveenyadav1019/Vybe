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
import safetyRoutes from "./routes/safety.js";
import clubmatesRoutes from "./routes/clubmates.js";
import connectionsRoutes from "./routes/connections.js";
import mediaRoutes from "./routes/media.js";
import strangerRoutes from "./routes/stranger.js";
import adminRoutes from "./routes/admin.js";

// ─── Module augmentation ──────────────────────────────────────────────────────

declare module "fastify" {
  interface FastifyInstance {
    env: Env;
    io: Server | null;
    authenticate: (
      req: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) => Promise<void>;
    placesService: import("./lib/google-places.js").GooglePlacesService | null;
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
  // placesService is decorated after plugin init below (value depends on env key)

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
      // Dev bypass: allow the hardcoded test token without JWT verification
      if (env.NODE_ENV !== "production") {
        const rawAuth = request.headers.authorization ?? "";
        const token = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : rawAuth;
        if (token === "dev-access-token") {
          (request as unknown as { user: { sub: string; phone: string } }).user = {
            sub: "dev-user-1",
            phone: "dev",
          };
          return;
        }
      }
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

  // Initialize Google Places if key available
  const placesService = env.GOOGLE_PLACES_API_KEY
    ? new (await import("./lib/google-places.js")).GooglePlacesService(env.GOOGLE_PLACES_API_KEY)
    : null;
  app.decorate("placesService", placesService);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(profileRoutes);
  await app.register(locationRoutes);
  await app.register(discoveryRoutes);
  await app.register(chatRoutes);
  await app.register(callsRoutes);
  await app.register(safetyRoutes);
  await app.register(clubmatesRoutes);
  await app.register(connectionsRoutes);
  await app.register(mediaRoutes);
  await app.register(strangerRoutes);
  await app.register(adminRoutes);

  // ── Health check ───────────────────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  }));

  // ── Global error handler ───────────────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    app.log.error({ err, url: req.url, method: req.method }, "Unhandled error");
    return reply.status(statusCode).send({
      error: statusCode === 500 ? "Internal server error" : message,
    });
  });

  return app;
}
