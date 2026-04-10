import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import {
  createRecurringInvoiceSchema,
  updateRecurringInvoiceSchema,
} from "@hisab/shared";
import { apiError } from "../lib/errors";

const recurring = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/recurring
recurring.get("/", async (c) => {
  const user = c.get("user");
  const data = await prisma.recurringInvoice.findMany({
    where: { userId: user.id },
    include: { client: { select: { name: true } }, lineItems: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json(data);
});

// GET /api/recurring/:id
recurring.get("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const ri = await prisma.recurringInvoice.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { name: true, email: true } },
      lineItems: true,
    },
  });
  if (!ri) return apiError(c, "NOT_FOUND", "Recurring invoice not found");
  return c.json(ri);
});

// POST /api/recurring
recurring.post("/", zValidator("json", createRecurringInvoiceSchema), async (c) => {
  const user = c.get("user");
  const { lineItems, ...body } = c.req.valid("json");

  const client = await prisma.client.findFirst({
    where: { id: body.clientId, userId: user.id },
  });
  if (!client) return apiError(c, "NOT_FOUND", "Client not found");

  const ri = await prisma.recurringInvoice.create({
    data: {
      ...body,
      userId: user.id,
      lineItems: {
        create: lineItems.map((item) => ({
          ...item,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { client: true, lineItems: true },
  });

  return c.json(ri, 201);
});

// PATCH /api/recurring/:id
recurring.patch("/:id", zValidator("json", updateRecurringInvoiceSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { lineItems, ...body } = c.req.valid("json");

  const existing = await prisma.recurringInvoice.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Recurring invoice not found");

  const ri = await prisma.recurringInvoice.update({
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

  return c.json(ri);
});

// DELETE /api/recurring/:id
recurring.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.recurringInvoice.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Recurring invoice not found");

  await prisma.recurringInvoice.delete({ where: { id } });
  return c.json({ success: true });
});

export default recurring;
