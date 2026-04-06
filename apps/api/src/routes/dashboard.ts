import { Hono } from "hono";
import { prisma } from "@hisab/db";
import { getAllNPRRates } from "../lib/exchange-rate";

const dashboard = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

type AggRow = {
  totalInvoiced: number | null;
  totalPaid: number | null;
  totalOutstanding: number | null;
  overdueCount: bigint;
};

type PaidByCurrency = { currency: string; total: number };

// GET /api/dashboard/stats
dashboard.get("/stats", async (c) => {
  const user = c.get("user");

  // Run all queries in parallel — SQL does the aggregation, not JS
  const [aggRows, paidByCurrency, recentInvoices, nprRates] = await Promise.all([
    // Single-pass aggregate: totals and overdue count
    prisma.$queryRaw<AggRow[]>`
      SELECT
        SUM(li.total) FILTER (WHERE i.status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE')) AS "totalInvoiced",
        SUM(li.total) FILTER (WHERE i.status = 'PAID')                                AS "totalPaid",
        SUM(li.total) FILTER (WHERE i.status IN ('SENT', 'OVERDUE'))                  AS "totalOutstanding",
        COUNT(*)      FILTER (WHERE i.status = 'OVERDUE')                             AS "overdueCount"
      FROM "Invoice" i
      JOIN "LineItem" li ON li."invoiceId" = i.id
      WHERE i."userId" = ${user.id}
    `,
    // Paid totals grouped by currency — needed to convert each to NPR
    prisma.$queryRaw<PaidByCurrency[]>`
      SELECT i.currency, SUM(li.total) AS total
      FROM "Invoice" i
      JOIN "LineItem" li ON li."invoiceId" = i.id
      WHERE i."userId" = ${user.id} AND i.status = 'PAID'
      GROUP BY i.currency
    `,
    // Only the 5 most recent invoices for the activity list
    prisma.invoice.findMany({
      where: { userId: user.id },
      include: { lineItems: true, client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getAllNPRRates().catch(() => ({ USD: 0, GBP: 0, EUR: 0 })),
  ]);

  const agg = aggRows[0];

  const totalPaidNPR = paidByCurrency.reduce((sum, row) => {
    const amount = Number(row.total);
    if (row.currency === "NPR") return sum + amount;
    return sum + amount * (nprRates[row.currency as keyof typeof nprRates] ?? 0);
  }, 0);

  return c.json({
    totalInvoiced: Number(agg?.totalInvoiced ?? 0),
    totalPaid: Number(agg?.totalPaid ?? 0),
    totalOutstanding: Number(agg?.totalOutstanding ?? 0),
    overdueCount: Number(agg?.overdueCount ?? 0),
    totalPaidNPR,
    nprRates,
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      currency: inv.currency,
      total: inv.lineItems.reduce((s, i) => s + i.total, 0),
      dueDate: inv.dueDate,
      clientName: inv.client.name,
    })),
  });
});

export default dashboard;
