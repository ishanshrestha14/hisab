import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));
vi.mock("../lib/audit", () => ({ audit: vi.fn() }));

import { prisma } from "@hisab/db";
import type { PrismaMock } from "../test/prisma-mock";
import quotes from "./quotes";

const db = prisma as unknown as PrismaMock;
const USER = { id: "user_1", email: "sita@example.com", name: "Sita" };

const app = new Hono<{ Variables: { user: typeof USER } }>();
app.use("*", async (c, next) => {
  c.set("user", USER);
  await next();
});
app.route("/", quotes);

type ListBody = { pagination: Record<string, number>; counts: Record<string, number> };

describe("GET /", () => {
  it("filters by status on the server", async () => {
    db.quote.findMany.mockResolvedValue([]);
    db.quote.count.mockResolvedValue(25);
    db.quote.groupBy.mockResolvedValue([]);

    const res = await app.request("/?status=SENT&page=2");
    const body = (await res.json()) as ListBody;

    expect(res.status).toBe(200);
    expect(db.quote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER.id, status: "SENT" }, skip: 20 })
    );
    expect(db.quote.count).toHaveBeenCalledWith({ where: { userId: USER.id, status: "SENT" } });
    expect(body.pagination).toEqual({ page: 2, limit: 20, total: 25, totalPages: 2 });
  });

  it("returns per-status counts across every quote", async () => {
    db.quote.findMany.mockResolvedValue([]);
    db.quote.count.mockResolvedValue(0);
    db.quote.groupBy.mockResolvedValue([
      { status: "DRAFT", _count: { _all: 2 } },
      { status: "CONVERTED", _count: { _all: 5 } },
    ]);

    const body = (await (await app.request("/")).json()) as ListBody;

    expect(body.counts).toEqual({ ALL: 7, DRAFT: 2, SENT: 0, ACCEPTED: 0, DECLINED: 0, CONVERTED: 5 });
  });

  it("rejects an unknown status", async () => {
    const res = await app.request("/?status=LOST");

    expect(res.status).toBe(400);
    expect(db.quote.findMany).not.toHaveBeenCalled();
  });
});
