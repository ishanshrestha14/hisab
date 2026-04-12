import { Hono } from "hono";
import { prisma } from "@hisab/db";
import { getAllNPRRates } from "../lib/exchange-rate";
import { apiError } from "../lib/errors";

const reports = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// ─── Nepal Fiscal Year helpers ────────────────────────────────────────────────
// Nepal FY runs Shrawan 1 → Ashad end, approximately July 16 → July 15 next year.
// BS year ≈ AD year + 57 for months after BS New Year (mid-April).
// fyStartBS: the BS year in which Shrawan falls (e.g. 2081 for FY 2081/82).

function fyBounds(fyStartBS: number): { start: Date; end: Date; label: string } {
  const adStart = fyStartBS - 57; // Gregorian year when this FY's Shrawan falls
  const start = new Date(Date.UTC(adStart, 6, 16));              // July 16 00:00 UTC
  const end   = new Date(Date.UTC(adStart + 1, 6, 15, 23, 59, 59, 999)); // July 15 end UTC
  return {
    start,
    end,
    label: `${fyStartBS}/${String(fyStartBS + 1).slice(-2)}`,
  };
}

function currentFYStartBS(): number {
  const now   = new Date();
  const month = now.getUTCMonth() + 1; // 1-12
  const day   = now.getUTCDate();
  const year  = now.getUTCFullYear();
  // After July 16: we are in the FY that started this calendar year
  const adStart = month > 7 || (month === 7 && day >= 16) ? year : year - 1;
  return adStart + 57;
}

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
  };
  type ClientRow = {
    clientId:      string;
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

    // Breakdown by currency
    prisma.$queryRaw<CurrencyRow[]>`
      SELECT
        i.currency,
        SUM(li.total) FILTER (WHERE i.status IN ('DRAFT','SENT','PAID','OVERDUE')) AS "totalInvoiced",
        SUM(li.total) FILTER (WHERE i.status = 'PAID')                             AS "totalPaid",
        SUM(li.total) FILTER (WHERE i.status IN ('SENT','OVERDUE'))                AS "totalOutstanding"
      FROM "Invoice" i
      JOIN "LineItem" li ON li."invoiceId" = i.id
      WHERE i."userId"    = ${user.id}
        AND i."issueDate" >= ${start}
        AND i."issueDate" <= ${end}
      GROUP BY i.currency
      ORDER BY "totalInvoiced" DESC NULLS LAST
    `,

    // Breakdown by client (top 20)
    prisma.$queryRaw<ClientRow[]>`
      SELECT
        i."clientId",
        c.name                                                                         AS "clientName",
        SUM(li.total) FILTER (WHERE i.status IN ('DRAFT','SENT','PAID','OVERDUE'))     AS "totalInvoiced",
        SUM(li.total) FILTER (WHERE i.status = 'PAID')                                AS "totalPaid",
        COUNT(DISTINCT i.id)                                                           AS "invoiceCount"
      FROM "Invoice" i
      JOIN "LineItem" li ON li."invoiceId" = i.id
      JOIN "Client"   c  ON c.id = i."clientId"
      WHERE i."userId"    = ${user.id}
        AND i."issueDate" >= ${start}
        AND i."issueDate" <= ${end}
      GROUP BY i."clientId", c.name
      ORDER BY "totalInvoiced" DESC NULLS LAST
      LIMIT 20
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

  // NPR equivalent of amount collected in the FY
  const totalPaidNPR = byCurrencyRows.reduce((sum, row) => {
    const paid = Number(row.totalPaid ?? 0);
    if (row.currency === "NPR") return sum + paid;
    return sum + paid * (nprRates[row.currency as keyof typeof nprRates] ?? 0);
  }, 0);

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
      invoiceCount:     Number(agg?.invoiceCount     ?? 0),
      paidCount:        Number(agg?.paidCount        ?? 0),
      tdsWithheld:      Number(agg?.tdsWithheld      ?? 0),
    },
    byCurrency: byCurrencyRows.map((r) => ({
      currency:         r.currency,
      totalInvoiced:    Number(r.totalInvoiced    ?? 0),
      totalPaid:        Number(r.totalPaid        ?? 0),
      totalOutstanding: Number(r.totalOutstanding ?? 0),
    })),
    byClient: byClientRows.map((r) => ({
      clientId:      r.clientId,
      clientName:    r.clientName,
      totalInvoiced: Number(r.totalInvoiced ?? 0),
      totalPaid:     Number(r.totalPaid     ?? 0),
      invoiceCount:  Number(r.invoiceCount),
    })),
    availableFYs,
    nprRates,
  });
});

export default reports;
