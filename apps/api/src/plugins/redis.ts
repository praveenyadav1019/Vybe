import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Redis } from "ioredis";
import { GeoService } from "../services/geo.service.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
    geo: GeoService;
  }
}

const redisPlugin: FastifyPluginAsync = async (app) => {
  const redis = new Redis(app.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: false,
  });

  redis.on("error", (err) => app.log.error({ err }, "Redis error"));
  redis.on("connect", () => app.log.info("Redis connected"));

  const geo = new GeoService(redis, app.env.LOCATION_TTL_SECONDS);

  app.decorate("redis", redis);
  app.decorate("geo", geo);

  app.addHook("onClose", async () => {
    await redis.quit();
  });
};

export default fp(redisPlugin);
