import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));

import { prisma } from "@hisab/db";
import type { PrismaMock } from "../test/prisma-mock";
import { idempotencyMiddleware } from "./idempotency.middleware";

const db = prisma as unknown as PrismaMock;

function buildApp(user: { id: string } | null = { id: "user_1" }) {
  const handler = vi.fn(() => ({ id: "inv_new", number: "INV-001" }));
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (user) c.set("user" as never, user as never);
    await next();
  });
  app.post("/invoices", idempotencyMiddleware, (c) => c.json(handler(), 201));
  return { app, handler };
}

const post = (app: Hono, key?: string) =>
  app.request("/invoices", {
    method: "POST",
    headers: key ? { "Idempotency-Key": key } : {},
  });

describe("idempotencyMiddleware", () => {
  it("is a pass-through when no Idempotency-Key header is sent", async () => {
    const { app, handler } = buildApp();

    const res = await post(app);

    expect(res.status).toBe(201);
    expect(handler).toHaveBeenCalledOnce();
    expect(db.idempotencyKey.findFirst).not.toHaveBeenCalled();
  });

  it("is a pass-through when there is no authenticated user", async () => {
    const { app, handler } = buildApp(null);

    await post(app, "key-1");

    expect(handler).toHaveBeenCalledOnce();
    expect(db.idempotencyKey.findFirst).not.toHaveBeenCalled();
  });

  it("runs the handler and caches the response on first use of a key", async () => {
    const { app, handler } = buildApp();
    db.idempotencyKey.findFirst.mockResolvedValue(null);

    const res = await post(app, "key-1");

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "inv_new", number: "INV-001" });
    expect(handler).toHaveBeenCalledOnce();
    expect(db.idempotencyKey.create).toHaveBeenCalledWith({
      data: {
        key: "key-1",
        userId: "user_1",
        statusCode: 201,
        response: { id: "inv_new", number: "INV-001" },
      },
    });
  });

  it("replays the cached response without re-running the handler", async () => {
    const { app, handler } = buildApp();
    db.idempotencyKey.findFirst.mockResolvedValue({
      statusCode: 201,
      response: { id: "inv_original", number: "INV-001" },
    });

    const res = await post(app, "key-1");

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "inv_original", number: "INV-001" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("only honours keys from the last 24 hours, scoped to the user", async () => {
    vi.useFakeTimers({ now: new Date("2025-07-02T12:00:00Z") });
    const { app } = buildApp();
    db.idempotencyKey.findFirst.mockResolvedValue(null);

    await post(app, "key-1");

    expect(db.idempotencyKey.findFirst).toHaveBeenCalledWith({
      where: {
        key: "key-1",
        userId: "user_1",
        createdAt: { gte: new Date("2025-07-01T12:00:00Z") },
      },
    });
    vi.useRealTimers();
  });

  it("still returns the response when a concurrent request cached it first", async () => {
    const { app } = buildApp();
    db.idempotencyKey.findFirst.mockResolvedValue(null);
    db.idempotencyKey.create.mockRejectedValue(new Error("Unique constraint failed"));

    const res = await post(app, "key-1");

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "inv_new", number: "INV-001" });
  });
});
