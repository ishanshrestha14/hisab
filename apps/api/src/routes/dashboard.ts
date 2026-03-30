import { Hono } from "hono";
import { prisma } from "@hisab/db";

const dashboard = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/dashboard/stats
dashboard.get("/stats", async (c) => {
  const user = c.get("user");

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    include: { lineItems: true },
  });

  const total = (statuses: string[]) =>
    invoices
      .filter((inv) => statuses.includes(inv.status))
      .flatMap((inv) => inv.lineItems)
      .reduce((sum, item) => sum + item.total, 0);

  return c.json({
    totalInvoiced: total(["DRAFT", "SENT", "PAID", "OVERDUE"]),
    totalPaid: total(["PAID"]),
    totalOutstanding: total(["SENT", "OVERDUE"]),
    overdueCount: invoices.filter((inv) => inv.status === "OVERDUE").length,
    recentInvoices: invoices.slice(0, 5).map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      currency: inv.currency,
      total: inv.lineItems.reduce((s, i) => s + i.total, 0),
      dueDate: inv.dueDate,
    })),
  });
});

export default dashboard;
