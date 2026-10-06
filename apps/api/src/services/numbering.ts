import type { prisma } from "@hisab/db";

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// "INV-001", "QT-042", "INV-1234" — pads to 3 digits, never truncates
export function formatDocNumber(prefix: "INV" | "QT", n: number): string {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

// Must run inside a $transaction. Uses MAX rather than count() + 1 so deleted
// invoices don't cause a number to be reused, and concurrent creates inside
// separate transactions can't read the same count.
export async function nextInvoiceNumber(tx: Tx, userId: string): Promise<string> {
  const rows = await tx.$queryRaw<[{ max: number | null }]>`
    SELECT MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)) AS max
    FROM "Invoice"
    WHERE "userId" = ${userId}
  `;
  return formatDocNumber("INV", (rows[0]?.max ?? 0) + 1);
}

export async function nextQuoteNumber(tx: Tx, userId: string): Promise<string> {
  const rows = await tx.$queryRaw<[{ max: number | null }]>`
    SELECT MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)) AS max
    FROM "Quote"
    WHERE "userId" = ${userId}
  `;
  return formatDocNumber("QT", (rows[0]?.max ?? 0) + 1);
}
