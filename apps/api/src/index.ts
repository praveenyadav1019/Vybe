import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { loadEnv } from "./env.js";
import { buildApp } from "./app.js";
import { attachSocketIO } from "./socket.js";

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  // Build Fastify on top of a raw HTTP server so Socket.io can share the port
  const httpServer = createServer(app.server);

  // Attach Socket.io
  const corsOrigins =
    env.CORS_ORIGIN === "*"
      ? true
      : env.CORS_ORIGIN.split(",").map((o) => o.trim());

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Transport preference: websocket first, polling fallback
    transports: ["websocket", "polling"],
    // Ping timeout / interval tuning for mobile clients
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  attachSocketIO(io, app);

  // Make io available to route handlers
  app.io = io;

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully…`);
    try {
      io.close();
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Start listening
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(env.PORT, "0.0.0.0", (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });

  app.log.info(`🚀 VYBEON API listening on http://0.0.0.0:${env.PORT}`);
  app.log.info(`   Env: ${env.NODE_ENV}`);
  app.log.info(`   Socket.io: attached`);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
