import type { Redis } from "ioredis";
import type { DistanceBucket } from "@vybeon/types";
import { toDistanceBucket } from "../lib/distance-bucket.js";

const GEO_KEY = "vybeon:users:geo";
const META_PREFIX = "vybeon:loc:meta:";

export class GeoService {
  constructor(
    private redis: Redis,
    private ttlSeconds: number
  ) {}

  async setUserLocation(userId: string, lng: number, lat: number) {
    await this.redis.geoadd(GEO_KEY, lng, lat, userId);
    await this.redis.set(`${META_PREFIX}${userId}`, String(Date.now()), "EX", this.ttlSeconds);
  }

  async removeUser(userId: string) {
    await this.redis.zrem(GEO_KEY, userId);
    await this.redis.del(`${META_PREFIX}${userId}`);
  }

  /**
   * Returns other user ids within radius (meters) with distance in meters.
   * Filters out stale entries (no meta TTL).
   */
  async nearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    excludeUserId?: string
  ): Promise<{ userId: string; distanceM: number }[]> {
    const raw = await this.redis.georadius(
      GEO_KEY,
      lng,
      lat,
      radiusMeters,
      "m",
      "WITHDIST",
      "ASC"
    );

    const results: { userId: string; distanceM: number }[] = [];

    for (const row of raw) {
      const [userId, dist] = row as unknown as [string, string];
      if (excludeUserId && userId === excludeUserId) continue;
      const alive = await this.redis.exists(`${META_PREFIX}${userId}`);
      if (!alive) {
        await this.redis.zrem(GEO_KEY, userId);
        continue;
      }
      results.push({ userId, distanceM: Number(dist) });
    }

    return results;
  }

  bucketForDistance(meters: number): DistanceBucket {
    return toDistanceBucket(meters);
  }
}
