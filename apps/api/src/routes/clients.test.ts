import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));

import { prisma } from "@hisab/db";
import type { PrismaMock } from "../test/prisma-mock";
import clients from "./clients";

const db = prisma as unknown as PrismaMock;
const USER = { id: "user_1", email: "sita@example.com", name: "Sita" };

const app = new Hono<{ Variables: { user: typeof USER } }>();
app.use("*", async (c, next) => {
  c.set("user", USER);
  await next();
});
app.route("/", clients);

type Statement = {
  invoices: Record<string, unknown>[];
  summary: Record<string, number>;
};

function inv(overrides: Record<string, unknown>) {
  return {
    id: "inv",
    number: "INV-001",
    status: "SENT",
    currency: "USD",
    tdsPercent: 0,
    lineItems: [{ total: 1000 }],
    payments: [],
    ...overrides,
  };
}

async function statement(invoices: unknown[]) {
  db.client.findFirst.mockResolvedValue({ id: "c1", userId: USER.id, name: "Acme" });
  db.invoice.findMany.mockResolvedValue(invoices);
  return (await (await app.request("/c1/statement")).json()) as Statement;
}

describe("GET /:id/statement", () => {
  it("returns 404 for another user's client", async () => {
    db.client.findFirst.mockResolvedValue(null);

    const res = await app.request("/c_other/statement");

    expect(res.status).toBe(404);
    expect(db.client.findFirst).toHaveBeenCalledWith({ where: { id: "c_other", userId: USER.id } });
  });

  it("subtracts partial payments from the balance", async () => {
    const body = await statement([inv({ payments: [{ amount: 300 }] })]);

    expect(body.invoices[0]).toMatchObject({ amountPaid: 300, collected: 300, balance: 700 });
    expect(body.summary).toMatchObject({ totalPaid: 300, totalOutstanding: 700 });
  });

  it("owes only the net receivable on a TDS invoice", async () => {
    const body = await statement([inv({ tdsPercent: 15, payments: [{ amount: 500 }] })]);

    // net 850, 500 received
    expect(body.invoices[0]).toMatchObject({ netReceivable: 850, balance: 350 });
    expect(body.summary.totalOutstanding).toBe(350);
  });

  it("counts a PAID invoice as collected at its net, even without payment records", async () => {
    const body = await statement([inv({ status: "PAID", tdsPercent: 15 })]);

    expect(body.invoices[0]).toMatchObject({ collected: 850, balance: 0 });
    expect(body.summary).toMatchObject({ totalPaid: 850, totalOutstanding: 0, paidCount: 1 });
  });

  it("leaves drafts out of collected and outstanding", async () => {
    const body = await statement([inv({ status: "DRAFT", payments: [] })]);

    expect(body.invoices[0]).toMatchObject({ collected: 0, balance: 0 });
    expect(body.summary).toMatchObject({ totalInvoiced: 1000, totalPaid: 0, totalOutstanding: 0 });
  });

  it("does not send raw payment rows", async () => {
    const body = await statement([inv({ payments: [{ id: "pay_1", amount: 100 }] })]);

    expect(body.invoices[0]).not.toHaveProperty("payments");
  });
});
