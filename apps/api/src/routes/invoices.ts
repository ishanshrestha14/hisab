import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@hisab/shared";
import { getNPRRate } from "../lib/exchange-rate";
const invoices = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// Auto-generate invoice number: INV-001, INV-002, ...
async function generateInvoiceNumber(userId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { userId } });
  return `INV-${String(count + 1).padStart(3, "0")}`;
}

// GET /api/invoices
invoices.get("/", async (c) => {
  const user = c.get("user");
  const data = await prisma.invoice.findMany({
    where: { userId: user.id },
    include: { client: { select: { name: true } }, lineItems: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json(data);
});

// GET /api/invoices/:id
invoices.get("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { name: true, email: true, company: true, country: true } },
      lineItems: true,
    },
  });
  if (!invoice) return c.json({ error: "Not found" }, 404);

  const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);
  let nprRate: number | null = null;
  if (invoice.currency !== "NPR") {
    nprRate = await getNPRRate(
      invoice.currency as "USD" | "GBP" | "EUR",
      user.id
    ).catch(() => null);
  }

  return c.json({
    ...invoice,
    total,
    nprRate,
    nprTotal: nprRate ? total * nprRate : null,
    freelancer: { name: user.name, email: user.email },
  });
});

// POST /api/invoices
invoices.post("/", zValidator("json", createInvoiceSchema), async (c) => {
  const user = c.get("user");
  const { lineItems, ...body } = c.req.valid("json");

  // Verify client belongs to user
  const client = await prisma.client.findFirst({
    where: { id: body.clientId, userId: user.id },
  });
  if (!client) return c.json({ error: "Client not found" }, 404);

  const number = await generateInvoiceNumber(user.id);

  const invoice = await prisma.invoice.create({
    data: {
      ...body,
      userId: user.id,
      number,
      lineItems: {
        create: lineItems.map((item) => ({
          ...item,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { client: true, lineItems: true },
  });

  return c.json(invoice, 201);
});

// PUT /api/invoices/:id
invoices.put("/:id", zValidator("json", updateInvoiceSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { lineItems, ...body } = c.req.valid("json");

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...body,
      ...(lineItems && {
        lineItems: {
          deleteMany: {},
          create: lineItems.map((item) => ({
            ...item,
            total: item.quantity * item.unitPrice,
          })),
        },
      }),
    },
    include: { client: true, lineItems: true },
  });

  return c.json(invoice);
});

// PATCH /api/invoices/:id/status
invoices.patch(
  "/:id/status",
  zValidator("json", updateInvoiceStatusSchema),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.param();
    const { status } = c.req.valid("json");

    const existing = await prisma.invoice.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    });
    return c.json(invoice);
  }
);

// DELETE /api/invoices/:id
invoices.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await prisma.invoice.delete({ where: { id } });
  return c.json({ success: true });
});

export default invoices;
