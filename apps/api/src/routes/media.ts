import type { FastifyPluginAsync } from "fastify";
import { createPresignedDownload, isStorageConfigured } from "../lib/storage.js";

/**
 * Media proxy.
 *
 * Profile photos live in a PRIVATE bucket ("Block all public access"), so they
 * can't be fetched directly. Stored photo URLs instead point here, and we
 * 302-redirect to a short-lived presigned GET.
 *
 * Why a redirect rather than storing a presigned URL directly: presigned URLs
 * expire, and photo URLs are persisted on the profile indefinitely. This keeps
 * stored URLs stable forever while each fetch gets fresh credentials.
 *
 * Deliberately unauthenticated: profile photos are shown to other users, and
 * requiring a bearer token would break <Image> loading in the client. Object
 * keys are UUIDs (`photos/<userId>/<uuid>.jpg`) so they aren't enumerable.
 */
const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.get("/media/*", async (req, reply) => {
    if (!isStorageConfigured(app.env)) {
      return reply.status(503).send({ error: "Storage is not configured" });
    }

    const key = (req.params as { "*": string })["*"];
    if (!key) return reply.status(400).send({ error: "Missing object key" });

    // Only ever serve from the photos/ prefix, and refuse traversal attempts.
    if (!key.startsWith("photos/") || key.includes("..")) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    try {
      const url = await createPresignedDownload(app.env, key, 900);
      // Allow CDN/client caching for slightly less than the signature lifetime.
      return reply.header("Cache-Control", "private, max-age=600").redirect(url, 302);
    } catch (err) {
      app.log.error({ err, key }, "media presign failed");
      return reply.status(404).send({ error: "Not found" });
    }
  });
};

export default mediaRoutes;
