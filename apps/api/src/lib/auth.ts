import type { FastifyRequest } from "fastify";

/**
 * Extract and return the authenticated user's ID from the JWT payload.
 * Throws a 401 error if not present.
 */
export function requireUserId(req: FastifyRequest): string {
  const user = req.user as { sub?: string; id?: string } | undefined;
  const id = user?.sub ?? user?.id;
  if (!id) {
    const err = new Error("Unauthorized") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
  return id;
}
