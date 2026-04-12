import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import { createClientSchema, updateClientSchema } from "@hisab/shared";
import { apiError } from "../lib/errors";

// Each route file gets its own Hono instance — mounted at /api/clients in index.ts
const clients = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/clients?page=1&limit=20
clients.get("/", async (c) => {
  const user = c.get("user");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20")));

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where: { userId: user.id } }),
  ]);

  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// POST /api/clients
clients.post("/", zValidator("json", createClientSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const client = await prisma.client.create({
    data: { ...body, userId: user.id },
  });
  return c.json(client, 201);
});

// PUT /api/clients/:id
clients.put("/:id", zValidator("json", updateClientSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = c.req.valid("json");

  // Ensure the client belongs to this user before updating
  const existing = await prisma.client.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return apiError(c, "NOT_FOUND", "Client not found");

  const updated = await prisma.client.update({
    where: { id },
    data: body,
  });
  return c.json(updated);
});

// GET /api/clients/:id/statement — all invoices for one client with totals
clients.get("/:id/statement", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const client = await prisma.client.findFirst({
    where: { id, userId: user.id },
  });
  if (!client) return apiError(c, "NOT_FOUND", "Client not found");

  const invoices = await prisma.invoice.findMany({
    where: { clientId: id, userId: user.id },
    include: { lineItems: true },
    orderBy: { issueDate: "asc" },
  });

  const invoicesWithTotals = invoices.map((inv) => {
    const total = inv.lineItems.reduce((s, li) => s + li.total, 0);
    const tdsAmount = total * (inv.tdsPercent / 100);
    const netReceivable = total - tdsAmount;
    return { ...inv, total, tdsAmount, netReceivable };
  });

  const summary = invoicesWithTotals.reduce(
    (acc, inv) => {
      acc.invoiceCount++;
      acc.totalInvoiced += inv.total;
      if (inv.status === "PAID") {
        acc.totalPaid += inv.total;
        acc.paidCount++;
      } else if (inv.status === "SENT" || inv.status === "OVERDUE") {
        acc.totalOutstanding += inv.total;
      }
      return acc;
    },
    { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, invoiceCount: 0, paidCount: 0 }
  );

  return c.json({ client, invoices: invoicesWithTotals, summary });
});

// DELETE /api/clients/:id
clients.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.client.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return apiError(c, "NOT_FOUND", "Client not found");

  await prisma.client.delete({ where: { id } });
  return c.json({ success: true });
});

export default clients;
