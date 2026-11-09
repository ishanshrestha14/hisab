import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));
vi.mock("../lib/exchange-rate", () => ({ getAllNPRRates: vi.fn() }));

import { prisma } from "@hisab/db";
import { getAllNPRRates } from "../lib/exchange-rate";
import type { PrismaMock } from "../test/prisma-mock";
import reports from "./reports";

const db = prisma as unknown as PrismaMock;
const USER = { id: "user_1", email: "sita@example.com", name: "Sita" };

const app = new Hono<{ Variables: { user: typeof USER } }>();
app.use("*", async (c, next) => {
  c.set("user", USER);
  await next();
});
app.route("/", reports);

type Body = {
  summary: Record<string, number>;
  byCurrency: Record<string, unknown>[];
  byClient: Record<string, unknown>[];
};

function stub({
  byCurrency = [] as unknown[],
  byClient = [] as unknown[],
} = {}) {
  db.$queryRaw
    .mockResolvedValueOnce([
      { totalInvoiced: 1, totalPaid: 1, totalOutstanding: 0, invoiceCount: 2n, paidCount: 1n, tdsWithheld: 15 },
    ])
    .mockResolvedValueOnce(byCurrency)
    .mockResolvedValueOnce(byClient)
    .mockResolvedValueOnce([{ year: 2083 }]);
  vi.mocked(getAllNPRRates).mockResolvedValue({ USD: 140, GBP: 170, EUR: 150 });
}

const get = async () => (await (await app.request("/fiscal-year?fy=2083")).json()) as Body;

describe("GET /fiscal-year", () => {
  it("converts invoiced, outstanding and TDS to NPR currency by currency", async () => {
    stub({
      byCurrency: [
        { currency: "USD", totalInvoiced: 1000, totalPaid: 400, totalOutstanding: 600, tdsWithheld: 60 },
        { currency: "NPR", totalInvoiced: 50000, totalPaid: 0, totalOutstanding: 50000, tdsWithheld: 0 },
      ],
    });

    const { summary } = await get();

    expect(summary.totalInvoicedNPR).toBe(1000 * 140 + 50000);
    expect(summary.totalOutstandingNPR).toBe(600 * 140 + 50000);
    expect(summary.totalPaidNPR).toBe(400 * 140);
    expect(summary.tdsWithheldNPR).toBe(60 * 140);
  });

  it("reports TDS withheld per currency", async () => {
    stub({
      byCurrency: [{ currency: "USD", totalInvoiced: 1000, totalPaid: 1000, totalOutstanding: 0, tdsWithheld: 150 }],
    });

    const { byCurrency } = await get();

    expect(byCurrency[0]).toMatchObject({ currency: "USD", tdsWithheld: 150 });
  });

  it("combines a client's currencies in NPR and ranks clients by that total", async () => {
    stub({
      byClient: [
        { clientId: "c_small", clientName: "Small", currency: "USD", totalInvoiced: 100, totalPaid: 100, invoiceCount: 1n },
        { clientId: "c_big", clientName: "Big", currency: "USD", totalInvoiced: 500, totalPaid: 0, invoiceCount: 1n },
        { clientId: "c_big", clientName: "Big", currency: "GBP", totalInvoiced: 200, totalPaid: 200, invoiceCount: 2n },
      ],
    });

    const { byClient } = await get();

    expect(byClient.map((r) => r.clientId)).toEqual(["c_big", "c_small"]);
    expect(byClient[0]).toMatchObject({
      clientName: "Big",
      currencies: ["USD", "GBP"],
      invoiceCount: 3,
      totalInvoicedNPR: 500 * 140 + 200 * 170,
      totalPaidNPR: 200 * 170,
    });
  });

  it("keeps the legacy fields for older clients", async () => {
    stub({
      byClient: [{ clientId: "c1", clientName: "One", currency: "USD", totalInvoiced: 100, totalPaid: 40, invoiceCount: 1n }],
    });

    const body = await get();

    expect(body.summary).toMatchObject({ totalInvoiced: 1, tdsWithheld: 15, invoiceCount: 2, paidCount: 1 });
    expect(body.byClient[0]).toMatchObject({ totalInvoiced: 100, totalPaid: 40 });
  });
});
