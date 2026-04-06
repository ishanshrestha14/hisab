import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@hisab/shared";
import { getNPRRate } from "../lib/exchange-rate";
import { sendInvoiceEmail } from "../lib/email";
import { apiError } from "../lib/errors";
import { audit } from "../lib/audit";

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
  if (!invoice) return apiError(c, "NOT_FOUND", "Invoice not found");

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

  sendInvoiceEmail({
    to: invoice.client.email,
    clientName: invoice.client.name,
    freelancerName: user.name,
    invoiceNumber: invoice.number,
    total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    portalUrl,
  }).catch((err) => console.error("Failed to send invoice email:", err));

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
