import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  generateInvoiceFromTimeSchema,
} from "@hisab/shared";
import { apiError } from "../lib/errors";
import { audit } from "../lib/audit";

const timeEntries = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// Reuse the same race-condition-safe invoice number generator
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

// GET /api/time-entries?page=1&limit=20&status=unbilled|billed&clientId=
timeEntries.get("/", async (c) => {
  const user = c.get("user");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20")));
  const status = c.req.query("status"); // "unbilled" | "billed"
  const clientId = c.req.query("clientId");

  const where = {
    userId: user.id,
    ...(status === "unbilled" ? { invoiceId: null } : {}),
    ...(status === "billed" ? { NOT: { invoiceId: null } } : {}),
    ...(clientId ? { clientId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: {
        client: { select: { name: true } },
        invoice: { select: { number: true, id: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.timeEntry.count({ where }),
  ]);

  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// POST /api/time-entries
timeEntries.post("/", zValidator("json", createTimeEntrySchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const client = await prisma.client.findFirst({
    where: { id: body.clientId, userId: user.id },
  });
  if (!client) return apiError(c, "NOT_FOUND", "Client not found");

  const entry = await prisma.timeEntry.create({
    data: { ...body, userId: user.id },
    include: { client: { select: { name: true } } },
  });

  return c.json(entry, 201);
});

// PUT /api/time-entries/:id
timeEntries.put("/:id", zValidator("json", updateTimeEntrySchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = c.req.valid("json");

  const existing = await prisma.timeEntry.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Time entry not found");
  if (existing.invoiceId) return apiError(c, "BAD_REQUEST", "Cannot edit a billed time entry");

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: body,
    include: { client: { select: { name: true } } },
  });

  return c.json(entry);
});

// DELETE /api/time-entries/:id
timeEntries.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.timeEntry.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Time entry not found");
  if (existing.invoiceId) return apiError(c, "BAD_REQUEST", "Cannot delete a billed time entry");

  await prisma.timeEntry.delete({ where: { id } });

  return c.json({ success: true });
});

// POST /api/time-entries/generate-invoice
timeEntries.post(
  "/generate-invoice",
  zValidator("json", generateInvoiceFromTimeSchema),
  async (c) => {
    const user = c.get("user");
    const { entryIds, dueDate, notes } = c.req.valid("json");

    // Fetch and validate all entries belong to user, are unbilled, and share one client+currency
    const entries = await prisma.timeEntry.findMany({
      where: { id: { in: entryIds }, userId: user.id },
      include: { client: { select: { name: true } } },
    });

    if (entries.length !== entryIds.length) {
      return apiError(c, "NOT_FOUND", "One or more time entries not found");
    }
    if (entries.some((e) => e.invoiceId)) {
      return apiError(c, "BAD_REQUEST", "One or more entries are already billed");
    }

    const clientIds = [...new Set(entries.map((e) => e.clientId))];
    if (clientIds.length > 1) {
      return apiError(c, "BAD_REQUEST", "All entries must belong to the same client");
    }
    const currencies = [...new Set(entries.map((e) => e.currency))];
    if (currencies.length > 1) {
      return apiError(c, "BAD_REQUEST", "All entries must use the same currency");
    }

    const clientId = clientIds[0];
    const currency = currencies[0];

    const invoice = await prisma.$transaction(async (tx) => {
      const number = await nextInvoiceNumber(tx, user.id);

      const created = await tx.invoice.create({
        data: {
          userId: user.id,
          clientId,
          number,
          currency,
          issueDate: new Date(),
          dueDate,
          notes,
          lineItems: {
            create: entries.map((e) => ({
              description: `${e.description} (${e.hours}h @ ${e.hourlyRate}/hr)`,
              quantity: e.hours,
              unitPrice: e.hourlyRate,
              total: e.hours * e.hourlyRate,
            })),
          },
        },
        include: { client: true, lineItems: true },
      });

      // Mark entries as billed
      await tx.timeEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { invoiceId: created.id },
      });

      return created;
    });

    audit({
      userId: user.id,
      entityType: "invoice",
      entityId: invoice.id,
      action: "invoice.created",
      after: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        currency: invoice.currency,
        clientId: invoice.clientId,
        source: "timesheet",
        entryCount: entries.length,
      },
    });

    return c.json(invoice, 201);
  }
);

export default timeEntries;
