import { Hono } from "hono";
import { prisma } from "@hisab/db";
import { getAllNPRRates } from "../lib/exchange-rate";
import { apiError } from "../lib/errors";
import { currentFYStartBS, fyBounds } from "../services/fiscal-year";

const reports = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/reports/fiscal-year?fy=2081
// fy = fyStartBS (e.g. 2081 → FY 2081/82). Defaults to current FY.
reports.get("/fiscal-year", async (c) => {
  const user = c.get("user");
  const fyParam = c.req.query("fy");

  const fyStartBS = fyParam ? parseInt(fyParam, 10) : currentFYStartBS();
  if (isNaN(fyStartBS) || fyStartBS < 2060 || fyStartBS > 2110) {
    return apiError(c, "BAD_REQUEST", "Invalid fiscal year");
  }

  const { start, end, label } = fyBounds(fyStartBS);

  type SummaryRow = {
    totalInvoiced:    number | null;
    totalPaid:        number | null;
    totalOutstanding: number | null;
    invoiceCount:     bigint;
    paidCount:        bigint;
    tdsWithheld:      number | null;
  };
  type CurrencyRow = {
    currency:         string;
    totalInvoiced:    number | null;
    totalPaid:        number | null;
    totalOutstanding: number | null;
    tdsWithheld:      number | null;
  };
  type ClientRow = {
    clientId:      string;
    currency:      string;
    clientName:    string;
    totalInvoiced: number | null;
    totalPaid:     number | null;
    invoiceCount:  bigint;
  };
  type FYRow = { year: number };

  const [summaryRows, byCurrencyRows, byClientRows, availableFYsRaw, nprRates] = await Promise.all([
    // Overall summary for the FY
    prisma.$queryRaw<SummaryRow[]>`
      SELECT
        SUM(li.total)        FILTER (WHERE i.status IN ('DRAFT','SENT','PAID','OVERDUE')) AS "totalInvoiced",
        SUM(li.total)        FILTER (WHERE i.status = 'PAID')                             AS "totalPaid",
        SUM(li.total)        FILTER (WHERE i.status IN ('SENT','OVERDUE'))                AS "totalOutstanding",
        COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('DRAFT','SENT','PAID','OVERDUE')) AS "invoiceCount",
        COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'PAID')                            AS "paidCount",
        SUM(li.total * i."tdsPercent" / 100.0) FILTER (WHERE i.status = 'PAID')          AS "tdsWithheld"
      FROM "Invoice" i
      JOIN "LineItem" li ON li."invoiceId" = i.id
      WHERE i."userId"    = ${user.id}
        AND i."issueDate" >= ${start}
        AND i."issueDate" <= ${end}
    `,

    // Breakdown by currency, computed per invoice so partial payments count.
    // Collected = net receivable once PAID, otherwise payments received.
    prisma.$queryRaw<CurrencyRow[]>`
      WITH inv AS (
        SELECT
          i.currency,
          i.status,
          (SELECT COALESCE(SUM(li.total), 0) FROM "LineItem" li WHERE li."invoiceId" = i.id) AS gross,
          (SELECT COALESCE(SUM(p.amount), 0) FROM "Payment"  p  WHERE p."invoiceId"  = i.id) AS paid,
          i."tdsPercent" / 100.0 AS tds
        FROM "Invoice" i
        WHERE i."userId"    = ${user.id}
          AND i."issueDate" >= ${start}
          AND i."issueDate" <= ${end}
      )
      SELECT
        currency,
        SUM(gross) AS "totalInvoiced",
        SUM(CASE
              WHEN status = 'PAID'               THEN gross * (1 - tds)
              WHEN status IN ('SENT','OVERDUE') THEN LEAST(paid, gross * (1 - tds))
              ELSE 0
            END) AS "totalPaid",
        SUM(CASE
              WHEN status IN ('SENT','OVERDUE') THEN GREATEST(gross * (1 - tds) - paid, 0)
              ELSE 0
            END) AS "totalOutstanding",
        SUM(CASE WHEN status = 'PAID' THEN gross * tds ELSE 0 END) AS "tdsWithheld"
      FROM inv
      GROUP BY currency
      ORDER BY "totalInvoiced" DESC NULLS LAST
    `,

    // Breakdown by client and currency; combined per client in NPR below
    prisma.$queryRaw<ClientRow[]>`
      WITH inv AS (
        SELECT
          i.id,
          i."clientId",
          i.currency,
          i.status,
          (SELECT COALESCE(SUM(li.total), 0) FROM "LineItem" li WHERE li."invoiceId" = i.id) AS gross,
          (SELECT COALESCE(SUM(p.amount), 0) FROM "Payment"  p  WHERE p."invoiceId"  = i.id) AS paid,
          i."tdsPercent" / 100.0 AS tds
        FROM "Invoice" i
        WHERE i."userId"    = ${user.id}
          AND i."issueDate" >= ${start}
          AND i."issueDate" <= ${end}
      )
      SELECT
        inv."clientId",
        c.name AS "clientName",
        inv.currency,
        SUM(gross) AS "totalInvoiced",
        SUM(CASE
              WHEN status = 'PAID'               THEN gross * (1 - tds)
              WHEN status IN ('SENT','OVERDUE') THEN LEAST(paid, gross * (1 - tds))
              ELSE 0
            END) AS "totalPaid",
        COUNT(*) AS "invoiceCount"
      FROM inv
      JOIN "Client" c ON c.id = inv."clientId"
      GROUP BY inv."clientId", c.name, inv.currency
    `,

    // All fiscal years that have at least one invoice for this user
    prisma.$queryRaw<FYRow[]>`
      SELECT DISTINCT
        CASE
          WHEN EXTRACT(MONTH FROM "issueDate") > 7
            OR (EXTRACT(MONTH FROM "issueDate") = 7 AND EXTRACT(DAY FROM "issueDate") >= 16)
          THEN EXTRACT(YEAR FROM "issueDate")::int + 57
          ELSE EXTRACT(YEAR FROM "issueDate")::int + 56
        END AS year
      FROM "Invoice"
      WHERE "userId" = ${user.id}
      ORDER BY year DESC
    `,

    getAllNPRRates().catch(() => ({ USD: 0, GBP: 0, EUR: 0 })),
  ]);

  const agg = summaryRows[0];

  // Currencies are never added together directly: each is converted to NPR
  // at today's rate first. The unconverted summary/byClient totals are kept
  // only for older clients.
  const toNPR = (currency: string, amount: number | null) =>
    currency === "NPR"
      ? Number(amount ?? 0)
      : Number(amount ?? 0) * (nprRates[currency as keyof typeof nprRates] ?? 0);
  const sumNPR = (field: "totalInvoiced" | "totalPaid" | "totalOutstanding" | "tdsWithheld") =>
    byCurrencyRows.reduce((sum, row) => sum + toNPR(row.currency, row[field]), 0);
  const totalPaidNPR = sumNPR("totalPaid");

  // Fold client × currency rows into one row per client, ranked by NPR total
  const clients = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      currencies: string[];
      totalInvoiced: number;
      totalPaid: number;
      totalInvoicedNPR: number;
      totalPaidNPR: number;
      invoiceCount: number;
    }
  >();
  for (const r of byClientRows) {
    const row = clients.get(r.clientId) ?? {
      clientId: r.clientId,
      clientName: r.clientName,
      currencies: [],
      totalInvoiced: 0,
      totalPaid: 0,
      totalInvoicedNPR: 0,
      totalPaidNPR: 0,
      invoiceCount: 0,
    };
    row.currencies.push(r.currency);
    row.totalInvoiced += Number(r.totalInvoiced ?? 0);
    row.totalPaid += Number(r.totalPaid ?? 0);
    row.totalInvoicedNPR += toNPR(r.currency, r.totalInvoiced);
    row.totalPaidNPR += toNPR(r.currency, r.totalPaid);
    row.invoiceCount += Number(r.invoiceCount);
    clients.set(r.clientId, row);
  }
  const byClient = [...clients.values()]
    .sort((a, b) => b.totalInvoicedNPR - a.totalInvoicedNPR)
    .slice(0, 20);

  // Always include the current FY in the selector even if empty
  const fySet = new Set(availableFYsRaw.map((r) => Number(r.year)));
  fySet.add(currentFYStartBS());
  const availableFYs = Array.from(fySet).sort((a, b) => b - a);

  return c.json({
    fy: label,
    fyStartBS,
    period: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      totalInvoiced:    Number(agg?.totalInvoiced    ?? 0),
      totalPaid:        Number(agg?.totalPaid        ?? 0),
      totalOutstanding: Number(agg?.totalOutstanding ?? 0),
      totalPaidNPR,
      totalInvoicedNPR:    sumNPR("totalInvoiced"),
      totalOutstandingNPR: sumNPR("totalOutstanding"),
      tdsWithheldNPR:      sumNPR("tdsWithheld"),
      invoiceCount:     Number(agg?.invoiceCount     ?? 0),
      paidCount:        Number(agg?.paidCount        ?? 0),
      tdsWithheld:      Number(agg?.tdsWithheld      ?? 0),
    },
    byCurrency: byCurrencyRows.map((r) => ({
      currency:         r.currency,
      totalInvoiced:    Number(r.totalInvoiced    ?? 0),
      totalPaid:        Number(r.totalPaid        ?? 0),
      totalOutstanding: Number(r.totalOutstanding ?? 0),
      tdsWithheld:      Number(r.tdsWithheld      ?? 0),
    })),
    byClient,
    availableFYs,
    nprRates,
  });
});

export default reports;
