import { Redis } from "ioredis";
import type { Env } from "../env.js";

export function createRedis(env: Env) {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
}
