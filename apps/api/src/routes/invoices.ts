import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@hisab/shared";
import { getNPRRate } from "../lib/exchange-rate";
import { eventBus } from "../lib/events";
import { apiError } from "../lib/errors";
import { audit } from "../lib/audit";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";

const invoices = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// Generate the next invoice number inside a transaction using MAX to avoid race conditions.
// count() + 1 would duplicate numbers under concurrent requests; MAX is safe.
async function nextInvoiceNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string
): Promise<string> {
  const rows = await tx.$queryRaw<[{ max: number | null }]>`
    SELECT MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)) AS max
    FROM "Invoice"
    WHERE "userId" = ${userId}
  `;
  const next = (rows[0].max ?? 0) + 1;
  return `INV-${String(next).padStart(3, "0")}`;
}

// GET /api/invoices?page=1&limit=20
invoices.get("/", async (c) => {
  const user = c.get("user");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20")));

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId: user.id },
      include: { client: { select: { name: true } }, lineItems: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where: { userId: user.id } }),
  ]);

  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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
      user: { select: { name: true, email: true, pan: true, vatNumber: true, logoUrl: true, invoiceTemplate: true, brandColor: true } },
    },
  });
  if (!invoice) return apiError(c, "NOT_FOUND", "Invoice not found");

  const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);
  const tdsAmount = total * (invoice.tdsPercent / 100);
  const netReceivable = total - tdsAmount;
  let nprRate: number | null = null;
  if (invoice.currency !== "NPR") {
    nprRate = await getNPRRate(
      invoice.currency as "USD" | "GBP" | "EUR"
    ).catch(() => null);
  }

  return c.json({
    ...invoice,
    total,
    tdsAmount,
    netReceivable,
    nprRate,
    nprTotal: nprRate ? total * nprRate : null,
    template: invoice.user.invoiceTemplate,
    brandColor: invoice.user.brandColor,
    logoUrl: invoice.user.logoUrl,
    freelancer: {
      name: invoice.user.name,
      email: invoice.user.email,
      pan: invoice.user.pan,
      vatNumber: invoice.user.vatNumber,
    },
  });
});

// POST /api/invoices
invoices.post("/", idempotencyMiddleware, zValidator("json", createInvoiceSchema), async (c) => {
  const user = c.get("user");
  const { lineItems, ...body } = c.req.valid("json");

  // Verify client belongs to user (outside transaction — read-only, no contention)
  const client = await prisma.client.findFirst({
    where: { id: body.clientId, userId: user.id },
  });
  if (!client) return apiError(c, "NOT_FOUND", "Client not found");

  // Wrap number generation + insert in a transaction so two concurrent requests
  // can't read the same MAX and produce duplicate invoice numbers.
  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx, user.id);
    return tx.invoice.create({
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
  });

  audit({
    userId: user.id,
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.created",
    after: { id: invoice.id, number: invoice.number, status: invoice.status, currency: invoice.currency, clientId: invoice.clientId },
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
  if (!existing) return apiError(c, "NOT_FOUND", "Invoice not found");

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

  audit({
    userId: user.id,
    entityType: "invoice",
    entityId: id,
    action: "invoice.updated",
    before: { status: existing.status, currency: existing.currency, dueDate: existing.dueDate, notes: existing.notes },
    after: { status: invoice.status, currency: invoice.currency, dueDate: invoice.dueDate, notes: invoice.notes },
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
    if (!existing) return apiError(c, "NOT_FOUND", "Invoice not found");

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    });
    audit({
      userId: user.id,
      entityType: "invoice",
      entityId: id,
      action: "invoice.status_changed",
      before: { status: existing.status },
      after: { status: invoice.status },
    });

    return c.json(invoice);
  }
);

// POST /api/invoices/:id/send — email invoice link to client, mark as SENT
invoices.post("/:id/send", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { name: true, email: true } },
      lineItems: true,
    },
  });
  if (!invoice) return apiError(c, "NOT_FOUND", "Invoice not found");
  if (invoice.status === "PAID") {
    return apiError(c, "BAD_REQUEST", "Cannot send a paid invoice");
  }

  // Update status FIRST — email is best-effort, don't let email failure block the status change
  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "SENT" },
  });

  const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);
  const portalUrl = `${process.env.WEB_URL}/portal/${invoice.token}`;

  audit({
    userId: user.id,
    entityType: "invoice",
    entityId: id,
    action: "invoice.sent",
    before: { status: invoice.status },
    after: { status: "SENT" },
  });

  eventBus.emit("invoice.sent", {
    to: invoice.client.email,
    clientName: invoice.client.name,
    freelancerName: user.name,
    invoiceNumber: invoice.number,
    total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    portalUrl,
  });

  return c.json({ status: updated.status });
});

// DELETE /api/invoices/:id
invoices.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return apiError(c, "NOT_FOUND", "Invoice not found");

  await prisma.invoice.delete({ where: { id } });

  audit({
    userId: user.id,
    entityType: "invoice",
    entityId: id,
    action: "invoice.deleted",
    before: { id: existing.id, number: existing.number, status: existing.status, currency: existing.currency },
  });

  return c.json({ success: true });
});

export default invoices;
