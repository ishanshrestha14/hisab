import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hisab/db", () => import("../test/prisma-mock"));
vi.mock("../lib/exchange-rate", () => ({ getAllNPRRates: vi.fn() }));

import { prisma } from "@hisab/db";
import { getAllNPRRates } from "../lib/exchange-rate";
import type { PrismaMock } from "../test/prisma-mock";
import dashboard from "./dashboard";

const db = prisma as unknown as PrismaMock;
const USER = { id: "user_1", email: "sita@example.com", name: "Sita" };

const app = new Hono<{ Variables: { user: typeof USER } }>();
app.use("*", async (c, next) => {
  c.set("user", USER);
  await next();
});
app.route("/", dashboard);

function stubQueries(overdueCount: number, byCurrency: unknown[]) {
  db.$queryRaw
    .mockResolvedValueOnce([
      { totalInvoiced: 1500, totalPaid: 500, totalOutstanding: 1000, overdueCount: BigInt(overdueCount) },
    ])
    .mockResolvedValueOnce(byCurrency);
  db.invoice.findMany.mockResolvedValue([]);
  vi.mocked(getAllNPRRates).mockResolvedValue({ USD: 140, GBP: 170, EUR: 150 });
}

describe("GET /stats", () => {
  it("reports totals per currency instead of one mixed-currency figure", async () => {
    stubQueries(0, [
      { currency: "USD", invoiced: 1000, collected: 400, outstanding: 600 },
      { currency: "GBP", invoiced: 500, collected: 100, outstanding: 400 },
    ]);

    const body = (await (await app.request("/stats")).json()) as Record<string, unknown>;

    expect(body.byCurrency).toEqual([
      { currency: "USD", invoiced: 1000, collected: 400, outstanding: 600 },
      { currency: "GBP", invoiced: 500, collected: 100, outstanding: 400 },
    ]);
  });

  it("converts every currency to NPR for combined totals", async () => {
    stubQueries(0, [
      { currency: "USD", invoiced: 1000, collected: 400, outstanding: 600 },
      { currency: "NPR", invoiced: 20000, collected: 5000, outstanding: 15000 },
    ]);

    const body = (await (await app.request("/stats")).json()) as Record<string, unknown>;

    expect(body.totalPaidNPR).toBe(400 * 140 + 5000);
    expect(body.totalOutstandingNPR).toBe(600 * 140 + 15000);
    expect(body.totalInvoicedNPR).toBe(1000 * 140 + 20000);
  });

  it("counts overdue invoices, not line items", async () => {
    stubQueries(2, []);

    await app.request("/stats");

    const [sql] = db.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(sql.join("?")).toContain("COUNT(DISTINCT i.id)");
  });

  it("keeps the legacy totals for older clients", async () => {
    stubQueries(3, []);

    const body = (await (await app.request("/stats")).json()) as Record<string, unknown>;

    expect(body).toMatchObject({ totalInvoiced: 1500, totalPaid: 500, totalOutstanding: 1000, overdueCount: 3 });
  });
});
