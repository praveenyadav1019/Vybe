import "dotenv/config";
import { Server } from "socket.io";
import { loadEnv } from "./env.js";
import { buildApp } from "./app.js";
import { attachSocketIO } from "./socket.js";

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  // Initialize Fastify plugins without starting the server yet
  await app.ready();

  // Attach Socket.IO directly to Fastify's underlying http.Server so both
  // HTTP requests and WebSocket upgrades share the same port correctly.
  const corsOrigins =
    env.CORS_ORIGIN === "*"
      ? true
      : env.CORS_ORIGIN.split(",").map((o) => o.trim());

  const io = new Server(app.server, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  attachSocketIO(io, app);
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

  // Start Fastify (and its underlying http.Server) on all interfaces
  await app.listen({ port: env.PORT, host: "0.0.0.0" });

  app.log.info(`🚀 VYBEON API listening on http://0.0.0.0:${env.PORT}`);
  app.log.info(`   Env: ${env.NODE_ENV}`);
  app.log.info(`   Socket.io: attached`);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
