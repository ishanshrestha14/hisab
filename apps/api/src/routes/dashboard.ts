import { Hono } from "hono";
import { prisma } from "@hisab/db";
import { getAllNPRRates } from "../lib/exchange-rate";

const dashboard = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/dashboard/stats
dashboard.get("/stats", async (c) => {
  const user = c.get("user");

  const [invoices, nprRates] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId: user.id },
      include: { lineItems: true, client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getAllNPRRates(user.id).catch(() => ({ USD: 0, GBP: 0, EUR: 0 })),
  ]);

  const sumLineItems = (statuses: string[]) =>
    invoices
      .filter((inv) => statuses.includes(inv.status))
      .flatMap((inv) => inv.lineItems)
      .reduce((sum, item) => sum + item.total, 0);

  const toNPR = (currency: string, amount: number) => {
    if (currency === "NPR") return amount;
    const rate = nprRates[currency as keyof typeof nprRates] ?? 0;
    return amount * rate;
  };

  const totalPaidNPR = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce(
      (sum, inv) =>
        sum +
        toNPR(
          inv.currency,
          inv.lineItems.reduce((s, i) => s + i.total, 0)
        ),
      0
    );

  return c.json({
    totalInvoiced: sumLineItems(["DRAFT", "SENT", "PAID", "OVERDUE"]),
    totalPaid: sumLineItems(["PAID"]),
    totalOutstanding: sumLineItems(["SENT", "OVERDUE"]),
    overdueCount: invoices.filter((inv) => inv.status === "OVERDUE").length,
    totalPaidNPR,
    nprRates,
    recentInvoices: invoices.slice(0, 5).map((inv) => ({
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
