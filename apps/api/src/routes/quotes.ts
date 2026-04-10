import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import {
  createQuoteSchema,
  updateQuoteSchema,
  updateQuoteStatusSchema,
} from "@hisab/shared";
import { apiError } from "../lib/errors";
import { audit } from "../lib/audit";
import { logger } from "../lib/logger";

const quotes = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// Generate the next quote number inside a transaction
async function nextQuoteNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string
): Promise<string> {
  const rows = await tx.$queryRaw<[{ max: number | null }]>`
    SELECT MAX(CAST(SUBSTRING(number FROM 4) AS INTEGER)) AS max
    FROM "Quote"
    WHERE "userId" = ${userId}
  `;
  const next = (rows[0].max ?? 0) + 1;
  return `QT-${String(next).padStart(3, "0")}`;
}

// GET /api/quotes?page=1&limit=20
quotes.get("/", async (c) => {
  const user = c.get("user");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20")));

  const [data, total] = await Promise.all([
    prisma.quote.findMany({
      where: { userId: user.id },
      include: { client: { select: { name: true } }, lineItems: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quote.count({ where: { userId: user.id } }),
  ]);

  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// GET /api/quotes/:id
quotes.get("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const quote = await prisma.quote.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { name: true, email: true, company: true, country: true } },
      lineItems: true,
    },
  });
  if (!quote) return apiError(c, "NOT_FOUND", "Quote not found");

  const total = quote.lineItems.reduce((sum, li) => sum + li.total, 0);
  return c.json({ ...quote, total });
});

// POST /api/quotes
quotes.post("/", zValidator("json", createQuoteSchema), async (c) => {
  const user = c.get("user");
  const { lineItems, ...body } = c.req.valid("json");

  const client = await prisma.client.findFirst({
    where: { id: body.clientId, userId: user.id },
  });
  if (!client) return apiError(c, "NOT_FOUND", "Client not found");

  const quote = await prisma.$transaction(async (tx) => {
    const number = await nextQuoteNumber(tx, user.id);
    return tx.quote.create({
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
    entityType: "quote",
    entityId: quote.id,
    action: "quote.created",
    after: { id: quote.id, number: quote.number, status: quote.status, clientId: quote.clientId },
  });

  return c.json(quote, 201);
});

// PUT /api/quotes/:id
quotes.put("/:id", zValidator("json", updateQuoteSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { lineItems, ...body } = c.req.valid("json");

  const existing = await prisma.quote.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Quote not found");
  if (existing.status === "CONVERTED") {
    return apiError(c, "BAD_REQUEST", "Cannot edit a converted quote");
  }

  const quote = await prisma.quote.update({
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
    entityType: "quote",
    entityId: id,
    action: "quote.updated",
    before: { status: existing.status },
    after: { status: quote.status },
  });

  return c.json(quote);
});

// PATCH /api/quotes/:id/status
quotes.patch("/:id/status", zValidator("json", updateQuoteStatusSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { status } = c.req.valid("json");

  const existing = await prisma.quote.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Quote not found");
  if (existing.status === "CONVERTED") {
    return apiError(c, "BAD_REQUEST", "Cannot change status of a converted quote");
  }

  const quote = await prisma.quote.update({ where: { id }, data: { status } });

  audit({
    userId: user.id,
    entityType: "quote",
    entityId: id,
    action: "quote.status_changed",
    before: { status: existing.status },
    after: { status: quote.status },
  });

  return c.json(quote);
});

// POST /api/quotes/:id/convert — convert accepted quote to a draft invoice
quotes.post("/:id/convert", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const quote = await prisma.quote.findFirst({
    where: { id, userId: user.id },
    include: { lineItems: true },
  });
  if (!quote) return apiError(c, "NOT_FOUND", "Quote not found");
  if (quote.status === "CONVERTED") {
    return apiError(c, "BAD_REQUEST", "Quote has already been converted");
  }

  // Generate invoice number + create invoice + mark quote as CONVERTED atomically
  const invoice = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<[{ max: number | null }]>`
      SELECT MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)) AS max
      FROM "Invoice"
      WHERE "userId" = ${user.id}
    `;
    const next = (rows[0].max ?? 0) + 1;
    const number = `INV-${String(next).padStart(3, "0")}`;

    const inv = await tx.invoice.create({
      data: {
        userId: user.id,
        clientId: quote.clientId,
        number,
        currency: quote.currency,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notes: quote.notes,
        lineItems: {
          create: quote.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.total,
          })),
        },
      },
      include: { lineItems: true },
    });

    await tx.quote.update({
      where: { id },
      data: { status: "CONVERTED", invoiceId: inv.id },
    });

    return inv;
  });

  logger.info({ quoteId: id, invoiceId: invoice.id }, "Quote converted to invoice");

  audit({
    userId: user.id,
    entityType: "quote",
    entityId: id,
    action: "quote.converted",
    after: { invoiceId: invoice.id, invoiceNumber: invoice.number },
  });

  return c.json({ invoiceId: invoice.id, invoiceNumber: invoice.number }, 201);
});

// DELETE /api/quotes/:id
quotes.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.quote.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Quote not found");
  if (existing.status === "CONVERTED") {
    return apiError(c, "BAD_REQUEST", "Cannot delete a converted quote");
  }

  await prisma.quote.delete({ where: { id } });

  audit({
    userId: user.id,
    entityType: "quote",
    entityId: id,
    action: "quote.deleted",
    before: { number: existing.number, status: existing.status },
  });

  return c.json({ success: true });
});

export default quotes;
