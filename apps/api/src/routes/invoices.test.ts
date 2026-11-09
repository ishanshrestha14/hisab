import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));
vi.mock("../lib/exchange-rate", () => ({ getNPRRate: vi.fn() }));
vi.mock("../lib/events", () => ({ eventBus: { emit: vi.fn() } }));
vi.mock("../lib/audit", () => ({ audit: vi.fn() }));

import { prisma } from "@hisab/db";
import { audit } from "../lib/audit";
import { eventBus } from "../lib/events";
import { getNPRRate } from "../lib/exchange-rate";
import { createPrismaMock, type PrismaMock } from "../test/prisma-mock";
import invoices from "./invoices";

const db = prisma as unknown as PrismaMock;
const USER = { id: "user_1", email: "sita@example.com", name: "Sita" };
const CLIENT_ID = "clx0client00000000000001";

// Mount the router behind a stub of requireAuth that injects a fixed user
const app = new Hono<{ Variables: { user: typeof USER } }>();
app.use("*", async (c, next) => {
  c.set("user", USER);
  await next();
});
app.route("/", invoices);

const json = (method: string, body: unknown, headers: Record<string, string> = {}) => ({
  method,
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv_1",
    userId: USER.id,
    token: "tok_1",
    number: "INV-001",
    status: "SENT",
    currency: "USD",
    tdsPercent: 0,
    dueDate: new Date("2025-07-31"),
    lineItems: [{ total: 600 }, { total: 400 }],
    payments: [],
    client: { name: "Acme", email: "ap@acme.com" },
    user: { name: "Sita", email: USER.email, invoiceTemplate: "classic", brandColor: "#f59e0b", logoUrl: null, pan: null, vatNumber: null },
    ...overrides,
  };
}

describe("ownership", () => {
  it.each([
    ["GET", "/inv_other"],
    ["PUT", "/inv_other"],
    ["PATCH", "/inv_other/status"],
    ["POST", "/inv_other/send"],
    ["POST", "/inv_other/payments"],
    ["DELETE", "/inv_other"],
  ])("%s %s returns 404 for another user's invoice", async (method, path) => {
    db.invoice.findFirst.mockResolvedValue(null);
    const body =
      path.endsWith("/status") ? { status: "PAID" }
      : path.endsWith("/payments") ? { amount: 10 }
      : method === "PUT" ? { notes: "x" }
      : undefined;

    const res = await app.request(path, body ? json(method, body) : { method });

    expect(res.status).toBe(404);
    expect(db.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv_other", userId: USER.id } })
    );
    expect(db.invoice.update).not.toHaveBeenCalled();
    expect(db.invoice.delete).not.toHaveBeenCalled();
  });
});

describe("GET /", () => {
  it("paginates and clamps the page size to 100", async () => {
    db.invoice.findMany.mockResolvedValue([]);
    db.invoice.count.mockResolvedValue(250);

    db.invoice.groupBy.mockResolvedValue([]);

    const res = await app.request("/?page=3&limit=500");

    expect(await res.json()).toEqual({
      data: [],
      pagination: { page: 3, limit: 100, total: 250, totalPages: 3 },
      counts: { ALL: 0, DRAFT: 0, SENT: 0, PAID: 0, OVERDUE: 0 },
    });
    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER.id }, skip: 200, take: 100 })
    );
  });

  it("filters by status on the server so pagination covers every matching invoice", async () => {
    db.invoice.findMany.mockResolvedValue([]);
    db.invoice.count.mockResolvedValue(42);
    db.invoice.groupBy.mockResolvedValue([]);

    const res = await app.request("/?status=OVERDUE&page=2");

    expect(res.status).toBe(200);
    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER.id, status: "OVERDUE" }, skip: 20 })
    );
    expect(db.invoice.count).toHaveBeenCalledWith({ where: { userId: USER.id, status: "OVERDUE" } });
    expect(((await res.json()) as { pagination: unknown }).pagination).toEqual({ page: 2, limit: 20, total: 42, totalPages: 3 });
  });

  it("returns per-status counts across all pages, independent of the filter", async () => {
    db.invoice.findMany.mockResolvedValue([]);
    db.invoice.count.mockResolvedValue(3);
    db.invoice.groupBy.mockResolvedValue([
      { status: "SENT", _count: { _all: 3 } },
      { status: "PAID", _count: { _all: 7 } },
    ]);

    const body = (await (await app.request("/?status=SENT")).json()) as { counts: unknown };

    expect(body.counts).toEqual({ ALL: 10, DRAFT: 0, SENT: 3, PAID: 7, OVERDUE: 0 });
    expect(db.invoice.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ["status"], where: { userId: USER.id } })
    );
  });

  it("rejects an unknown status", async () => {
    const res = await app.request("/?status=LOST");

    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("BAD_REQUEST");
    expect(db.invoice.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /:id", () => {
  it("returns totals with TDS and payments applied", async () => {
    db.invoice.findFirst.mockResolvedValue(
      invoiceRow({ tdsPercent: 15, payments: [{ amount: 250 }] })
    );
    vi.mocked(getNPRRate).mockResolvedValue(140);

    const body = await (await app.request("/inv_1")).json();

    expect(body).toMatchObject({
      total: 1000,
      tdsAmount: 150,
      netReceivable: 850,
      amountPaid: 250,
      amountDue: 600,
      nprRate: 140,
      nprTotal: 140_000,
    });
  });
});

describe("POST /", () => {
  const payload = {
    clientId: CLIENT_ID,
    currency: "USD",
    issueDate: "2025-07-01",
    dueDate: "2025-07-31",
    lineItems: [
      { description: "Design", quantity: 10, unitPrice: 50 },
      { description: "Hosting", quantity: 1, unitPrice: 20 },
    ],
  };

  // Run the transaction callback against a fake tx so we can inspect the insert
  function stubTransaction(maxExisting: number | null) {
    const tx = createPrismaMock();
    tx.$queryRaw.mockResolvedValue([{ max: maxExisting }]);
    tx.invoice.create.mockImplementation(async ({ data }) => ({ id: "inv_new", status: "DRAFT", ...data }));
    db.$transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));
    return tx;
  }

  it("rejects an invoice with no line items", async () => {
    const res = await app.request("/", json("POST", { ...payload, lineItems: [] }));
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 when the client belongs to someone else", async () => {
    db.client.findFirst.mockResolvedValue(null);

    const res = await app.request("/", json("POST", payload));

    expect(res.status).toBe(404);
    expect(db.client.findFirst).toHaveBeenCalledWith({ where: { id: CLIENT_ID, userId: USER.id } });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("assigns the next sequential number and server-computes line totals", async () => {
    db.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
    const tx = stubTransaction(41);

    const res = await app.request("/", json("POST", payload));

    expect(res.status).toBe(201);
    const { data } = tx.invoice.create.mock.calls[0][0];
    expect(data.number).toBe("INV-042");
    expect(data.userId).toBe(USER.id);
    expect(data.lineItems.create).toEqual([
      { description: "Design", quantity: 10, unitPrice: 50, total: 500 },
      { description: "Hosting", quantity: 1, unitPrice: 20, total: 20 },
    ]);
  });

  it("ignores a client-supplied line total", async () => {
    db.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
    const tx = stubTransaction(0);

    await app.request(
      "/",
      json("POST", { ...payload, lineItems: [{ description: "x", quantity: 2, unitPrice: 5, total: 999_999 }] })
    );

    expect(tx.invoice.create.mock.calls[0][0].data.lineItems.create[0].total).toBe(10);
  });

  it("writes an audit entry", async () => {
    db.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
    stubTransaction(0);

    await app.request("/", json("POST", payload));

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER.id, entityId: "inv_new", action: "invoice.created" })
    );
  });
});

describe("POST /:id/payments", () => {
  beforeEach(() => {
    db.payment.create.mockImplementation(async ({ data }) => ({ id: "pay_1", ...data }));
  });

  it("refuses payments on a draft invoice", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ status: "DRAFT" }));

    const res = await app.request("/inv_1/payments", json("POST", { amount: 100 }));

    expect(res.status).toBe(400);
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it("refuses a payment larger than the outstanding balance", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ payments: [{ amount: 900 }] }));

    const res = await app.request("/inv_1/payments", json("POST", { amount: 100.01 }));

    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe("Payment exceeds the balance due");
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it("records a partial payment without changing status", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow());

    const res = await app.request("/inv_1/payments", json("POST", { amount: 300 }));

    expect(res.status).toBe(201);
    expect(((await res.json()) as { status: string }).status).toBe("SENT");
    expect(db.invoice.update).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("marks the invoice PAID and notifies when the final payment lands", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ payments: [{ amount: 700 }] }));

    const res = await app.request("/inv_1/payments", json("POST", { amount: 300 }));

    expect(res.status).toBe(201);
    expect(((await res.json()) as { status: string }).status).toBe("PAID");
    expect(db.invoice.update).toHaveBeenCalledWith({ where: { id: "inv_1" }, data: { status: "PAID" } });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "invoice.paid",
      expect.objectContaining({ invoiceNumber: "INV-001", total: 1000, to: "ap@acme.com" })
    );
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "invoice.paid" }));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "payment.created" }));
  });
});

describe("POST /:id/payments with TDS", () => {
  beforeEach(() => {
    db.payment.create.mockImplementation(async ({ data }) => ({ id: "pay_1", ...data }));
  });

  it("marks a TDS invoice PAID when the client pays the net receivable", async () => {
    // total 1000, 15% TDS withheld by the client → 850 arrives
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ tdsPercent: 15 }));

    const res = await app.request("/inv_1/payments", json("POST", { amount: 850 }));

    expect(res.status).toBe(201);
    expect(((await res.json()) as { status: string }).status).toBe("PAID");
    expect(db.invoice.update).toHaveBeenCalledWith({ where: { id: "inv_1" }, data: { status: "PAID" } });
  });

  it("refuses a payment above the net receivable", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ tdsPercent: 15 }));

    const res = await app.request("/inv_1/payments", json("POST", { amount: 850.01 }));

    expect(res.status).toBe(400);
    expect(db.payment.create).not.toHaveBeenCalled();
  });
});

describe("DELETE /:id/payments/:paymentId", () => {
  it("reverts a PAID invoice to SENT when it is no longer fully paid", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ status: "PAID" }));
    db.payment.findFirst.mockResolvedValue({ id: "pay_1", amount: 300 });
    db.payment.aggregate.mockResolvedValue({ _sum: { amount: 700 } });
    db.lineItem.findMany.mockResolvedValue([{ total: 1000 }]);

    const res = await app.request("/inv_1/payments/pay_1", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(db.payment.delete).toHaveBeenCalledWith({ where: { id: "pay_1" } });
    expect(db.invoice.update).toHaveBeenCalledWith({ where: { id: "inv_1" }, data: { status: "SENT" } });
  });

  it("keeps a TDS invoice PAID while payments still cover the net receivable", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ status: "PAID", tdsPercent: 15 }));
    db.payment.findFirst.mockResolvedValue({ id: "pay_extra", amount: 50 });
    db.payment.aggregate.mockResolvedValue({ _sum: { amount: 850 } });
    db.lineItem.findMany.mockResolvedValue([{ total: 1000 }]);

    await app.request("/inv_1/payments/pay_extra", { method: "DELETE" });

    expect(db.invoice.update).not.toHaveBeenCalled();
  });

  it("only deletes payments that belong to the invoice", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow());
    db.payment.findFirst.mockResolvedValue(null);

    const res = await app.request("/inv_1/payments/pay_of_other_invoice", { method: "DELETE" });

    expect(res.status).toBe(404);
    expect(db.payment.findFirst).toHaveBeenCalledWith({
      where: { id: "pay_of_other_invoice", invoiceId: "inv_1" },
    });
    expect(db.payment.delete).not.toHaveBeenCalled();
  });
});

describe("POST /:id/send", () => {
  beforeEach(() => {
    vi.stubEnv("WEB_URL", "https://hisab.test");
  });

  it("refuses to re-send a paid invoice", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ status: "PAID" }));

    const res = await app.request("/inv_1/send", { method: "POST" });

    expect(res.status).toBe(400);
    expect(db.invoice.update).not.toHaveBeenCalled();
  });

  it("marks the invoice SENT and emails a portal link built from the public token", async () => {
    db.invoice.findFirst.mockResolvedValue(invoiceRow({ status: "DRAFT" }));
    db.invoice.update.mockResolvedValue({ status: "SENT" });

    const res = await app.request("/inv_1/send", { method: "POST" });

    expect(await res.json()).toEqual({ status: "SENT" });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "invoice.sent",
      expect.objectContaining({ to: "ap@acme.com", total: 1000, portalUrl: "https://hisab.test/portal/tok_1" })
    );
  });
});
