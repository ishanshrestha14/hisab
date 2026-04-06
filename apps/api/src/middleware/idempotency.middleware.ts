import type { MiddlewareHandler } from "hono";
import { prisma } from "@hisab/db";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Reads the `Idempotency-Key` request header. If a cached response exists for
// this (key, userId) pair within the TTL, returns it immediately without
// executing the handler. Otherwise runs the handler and caches the result.
//
// Only apply to non-idempotent routes (POST). Requires requireAuth to have
// already run so that c.get("user") is populated.
export const idempotencyMiddleware: MiddlewareHandler = async (c, next) => {
  const key = c.req.header("idempotency-key");
  if (!key) return next();

  const user = c.get("user") as { id: string } | undefined;
  if (!user) return next();

  const cutoff = new Date(Date.now() - TTL_MS);

  const existing = await prisma.idempotencyKey.findFirst({
    where: { key, userId: user.id, createdAt: { gte: cutoff } },
  });

  if (existing) {
    return c.json(existing.response, existing.statusCode as 200 | 201);
  }

  await next();

  // Clone before reading so the original response stream is untouched
  try {
    const responseBody = await c.res.clone().json();
    await prisma.idempotencyKey.create({
      data: { key, userId: user.id, statusCode: c.res.status, response: responseBody as object },
    });
  } catch {
    // Unique constraint violation = concurrent request already cached it — safe to ignore
  }
};
