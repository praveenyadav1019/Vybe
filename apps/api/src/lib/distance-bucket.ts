import type { DistanceBucket } from "@vybeon/types";

/** Convert meters to privacy-safe bucket; never expose raw coordinates. */
export function toDistanceBucket(meters: number): DistanceBucket {
  if (meters <= 25) return "same_place";
  if (meters < 100) return "under_100m";
  return "nearby";
}
