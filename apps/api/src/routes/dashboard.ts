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

type CurrencyRow = {
  currency: string;
  invoiced: number | null;
  collected: number | null;
  outstanding: number | null;
};

// GET /api/dashboard/stats
//
// Amounts in different currencies are never added together directly.
// Collected and outstanding are net of TDS and include partial payments.
// `byCurrency` holds per-currency totals; the `*NPR` fields convert each
// currency at today's rate and sum them. The top-level `totalInvoiced` /
// `totalPaid` / `totalOutstanding` mix currencies and are kept only so older
// clients keep working.
dashboard.get("/stats", async (c) => {
  const user = c.get("user");

  // Run all queries in parallel — SQL does the aggregation, not JS
  const [aggRows, currencyRows, recentInvoices, nprRates] = await Promise.all([
    // Single-pass aggregate: legacy totals and overdue count.
    // The join yields one row per line item, so invoices are counted DISTINCT.
    prisma.$queryRaw<AggRow[]>`
      SELECT
        SUM(li.total) FILTER (WHERE i.status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE')) AS "totalInvoiced",
        SUM(li.total) FILTER (WHERE i.status = 'PAID')                                AS "totalPaid",
        SUM(li.total) FILTER (WHERE i.status IN ('SENT', 'OVERDUE'))                  AS "totalOutstanding",
        COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'OVERDUE')                      AS "overdueCount"
      FROM "Invoice" i
      JOIN "LineItem" li ON li."invoiceId" = i.id
      WHERE i."userId" = ${user.id}
    `,
    // Per-currency totals, computed per invoice so partial payments count.
    // Collected is money received: the net receivable once PAID, otherwise
    // the payments recorded so far. Outstanding is what is still owed.
    prisma.$queryRaw<CurrencyRow[]>`
      WITH inv AS (
        SELECT
          i.currency,
          i.status,
          (SELECT COALESCE(SUM(li.total), 0) FROM "LineItem" li WHERE li."invoiceId" = i.id) AS gross,
          (SELECT COALESCE(SUM(p.amount), 0) FROM "Payment"  p  WHERE p."invoiceId"  = i.id) AS paid,
          i."tdsPercent" / 100.0 AS tds
        FROM "Invoice" i
        WHERE i."userId" = ${user.id}
      )
      SELECT
        currency,
        SUM(gross) AS invoiced,
        SUM(CASE
              WHEN status = 'PAID'                THEN gross * (1 - tds)
              WHEN status IN ('SENT', 'OVERDUE') THEN LEAST(paid, gross * (1 - tds))
              ELSE 0
            END) AS collected,
        SUM(CASE
              WHEN status IN ('SENT', 'OVERDUE') THEN GREATEST(gross * (1 - tds) - paid, 0)
              ELSE 0
            END) AS outstanding
      FROM inv
      GROUP BY currency
      ORDER BY invoiced DESC
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

  const byCurrency = currencyRows.map((row) => ({
    currency: row.currency,
    invoiced: Number(row.invoiced ?? 0),
    collected: Number(row.collected ?? 0),
    outstanding: Number(row.outstanding ?? 0),
  }));

  const toNPR = (currency: string, amount: number) =>
    currency === "NPR" ? amount : amount * (nprRates[currency as keyof typeof nprRates] ?? 0);
  const sumNPR = (field: "invoiced" | "collected" | "outstanding") =>
    byCurrency.reduce((sum, row) => sum + toNPR(row.currency, row[field]), 0);

  return c.json({
    totalInvoiced: Number(agg?.totalInvoiced ?? 0),
    totalPaid: Number(agg?.totalPaid ?? 0),
    totalOutstanding: Number(agg?.totalOutstanding ?? 0),
    overdueCount: Number(agg?.overdueCount ?? 0),
    totalPaidNPR: sumNPR("collected"),
    totalOutstandingNPR: sumNPR("outstanding"),
    totalInvoicedNPR: sumNPR("invoiced"),
    byCurrency,
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
