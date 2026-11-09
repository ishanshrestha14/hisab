import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));
vi.mock("../lib/exchange-rate", () => ({ getNPRRate: vi.fn() }));
vi.mock("../lib/events", () => ({ eventBus: { emit: vi.fn() } }));

import { prisma } from "@hisab/db";
import { getNPRRate } from "../lib/exchange-rate";
import { eventBus } from "../lib/events";
import type { PrismaMock } from "../test/prisma-mock";
import portal from "./portal";

const db = prisma as unknown as PrismaMock;

// Rate limiters keep state for the life of the module, keyed by IP —
// give each request its own address unless a test is exercising the limit.
let ipCounter = 0;
const freshIp = () => `10.0.0.${++ipCounter}`;

function request(path: string, init: RequestInit = {}, ip = freshIp()) {
  return portal.request(path, {
    ...init,
    headers: { "x-forwarded-for": ip, ...init.headers },
  });
}

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv_internal_id",
    token: "tok_public",
    number: "INV-007",
    status: "SENT",
    currency: "USD",
    issueDate: new Date("2025-07-01"),
    dueDate: new Date("2025-07-31"),
    notes: null,
    tdsPercent: 15,
    lineItems: [
      { description: "Design", quantity: 10, unitPrice: 50, total: 500 },
      { description: "Dev", quantity: 5, unitPrice: 100, total: 500 },
    ],
    payments: [{ amount: 200, paidAt: new Date("2025-07-10") }],
    client: { name: "Acme", email: "ap@acme.com", company: "Acme Inc", country: "US" },
    user: {
      name: "Sita",
      email: "sita@example.com",
      pan: "123456789",
      vatNumber: null,
      logoUrl: null,
      invoiceTemplate: "classic",
      brandColor: "#f59e0b",
    },
    ...overrides,
  };
}

describe("GET /api/portal/:token", () => {
  beforeEach(() => {
    vi.mocked(getNPRRate).mockResolvedValue(135);
  });

  it("returns 404 for an unknown token", async () => {
    db.invoice.findUnique.mockResolvedValue(null);

    const res = await request("/does-not-exist");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Invoice not found" },
    });
  });

  it("looks the invoice up by public token, never by id", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow());

    await request("/tok_public");

    expect(db.invoice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "tok_public" } })
    );
  });

  it("returns computed totals, TDS and NPR conversion", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow());

    const res = await request("/tok_public");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      number: "INV-007",
      total: 1000,
      tdsPercent: 15,
      tdsAmount: 150,
      netReceivable: 850,
      amountPaid: 200,
      amountDue: 650,
      nprRate: 135,
      nprTotal: 135_000,
    });
  });

  it("does not leak internal ids or the freelancer's private fields", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow());

    const body = (await (await request("/tok_public")).json()) as { freelancer: object };

    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("token");
    expect(Object.keys(body.freelancer).sort()).toEqual(["email", "pan", "vatNumber"]);
  });

  it("still renders when the exchange-rate API is down", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow());
    vi.mocked(getNPRRate).mockRejectedValue(new Error("upstream 503"));

    const res = await request("/tok_public");
    const body = (await res.json()) as { nprRate: number | null; nprTotal: number | null };

    expect(res.status).toBe(200);
    expect(body.nprRate).toBeNull();
    expect(body.nprTotal).toBeNull();
  });

  it("skips conversion for NPR invoices", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow({ currency: "NPR" }));

    const body = (await (await request("/tok_public")).json()) as { nprRate: number | null };

    expect(getNPRRate).not.toHaveBeenCalled();
    expect(body.nprRate).toBeNull();
  });

  it("rate-limits a single IP to 30 views per window", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow());
    const ip = "203.0.113.50";

    for (let i = 0; i < 30; i++) {
      expect((await request("/tok_public", {}, ip)).status).toBe(200);
    }
    expect((await request("/tok_public", {}, ip)).status).toBe(429);
    // A different client is unaffected
    expect((await request("/tok_public")).status).toBe(200);
  });
});

describe("POST /api/portal/:token/mark-paid", () => {
  const markPaid = (token = "tok_public", ip?: string) =>
    request(`/${token}/mark-paid`, { method: "POST" }, ip);

  it("returns 404 for an unknown token", async () => {
    db.invoice.findUnique.mockResolvedValue(null);
    expect((await markPaid("nope")).status).toBe(404);
  });

  it.each(["DRAFT", "PAID", "OVERDUE"])("refuses to mark a %s invoice as paid", async (status) => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow({ status }));

    const res = await markPaid();

    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("records the remaining balance as a payment and marks the invoice PAID", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow());
    db.$transaction.mockResolvedValue([]);

    const res = await markPaid();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "PAID" });
    expect(db.payment.create).toHaveBeenCalledWith({
      data: { invoiceId: "inv_internal_id", amount: 800, notes: "Marked as paid via portal" },
    });
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { token: "tok_public" },
      data: { status: "PAID" },
    });
  });

  it("notifies the freelancer via the event bus", async () => {
    db.invoice.findUnique.mockResolvedValue(invoiceRow());
    db.$transaction.mockResolvedValue([]);

    await markPaid();

    expect(eventBus.emit).toHaveBeenCalledWith("invoice.paid", {
      to: "sita@example.com",
      freelancerName: "Sita",
      clientName: "Acme",
      invoiceNumber: "INV-007",
      total: 1000,
      currency: "USD",
    });
  });

  it("rate-limits a single IP to 5 attempts per hour", async () => {
    db.invoice.findUnique.mockResolvedValue(null);
    const ip = "203.0.113.99";

    for (let i = 0; i < 5; i++) {
      expect((await markPaid("x", ip)).status).toBe(404);
    }
    expect((await markPaid("x", ip)).status).toBe(429);
  });
});
