import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));

import { prisma } from "@hisab/db";
import type { PrismaMock } from "../test/prisma-mock";
import recurring from "./recurring";

const db = prisma as unknown as PrismaMock;
const USER = { id: "user_1", email: "sita@example.com", name: "Sita" };

const app = new Hono<{ Variables: { user: typeof USER } }>();
app.use("*", async (c, next) => {
  c.set("user", USER);
  await next();
});
app.route("/", recurring);

const patch = (path: string, body: unknown) =>
  app.request(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("GET /:id", () => {
  it("returns 404 for another user's schedule", async () => {
    db.recurringInvoice.findFirst.mockResolvedValue(null);

    const res = await app.request("/ri_other");

    expect(res.status).toBe(404);
    expect(db.recurringInvoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ri_other", userId: USER.id } })
    );
  });
});

describe("PATCH /:id", () => {
  it("does not update another user's schedule", async () => {
    db.recurringInvoice.findFirst.mockResolvedValue(null);

    const res = await patch("/ri_other", { active: false });

    expect(res.status).toBe(404);
    expect(db.recurringInvoice.update).not.toHaveBeenCalled();
  });

  it("replaces line items and recomputes their totals", async () => {
    db.recurringInvoice.findFirst.mockResolvedValue({ id: "ri_1", userId: USER.id });
    db.recurringInvoice.update.mockResolvedValue({ id: "ri_1" });

    const res = await patch("/ri_1", {
      interval: "QUARTERLY",
      lineItems: [{ description: "Retainer", quantity: 2, unitPrice: 750 }],
    });

    expect(res.status).toBe(200);
    expect(db.recurringInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ri_1" },
        data: expect.objectContaining({
          interval: "QUARTERLY",
          lineItems: {
            deleteMany: {},
            create: [{ description: "Retainer", quantity: 2, unitPrice: 750, total: 1500 }],
          },
        }),
      })
    );
  });

  it("leaves line items alone when only pausing", async () => {
    db.recurringInvoice.findFirst.mockResolvedValue({ id: "ri_1", userId: USER.id });
    db.recurringInvoice.update.mockResolvedValue({ id: "ri_1" });

    await patch("/ri_1", { active: false });

    const { data } = db.recurringInvoice.update.mock.calls[0][0];
    expect(data).toEqual({ active: false });
  });

  it("rejects a client change, which the schedule cannot take", async () => {
    db.recurringInvoice.findFirst.mockResolvedValue({ id: "ri_1", userId: USER.id });
    db.recurringInvoice.update.mockResolvedValue({ id: "ri_1" });

    await patch("/ri_1", { clientId: "clxsomeoneelse000000001", active: true });

    const { data } = db.recurringInvoice.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("clientId");
  });
});
