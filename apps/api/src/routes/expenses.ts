import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import { createExpenseSchema, updateExpenseSchema } from "@hisab/shared";
import { apiError } from "../lib/errors";

const expenses = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/expenses?page=1&limit=20&category=SOFTWARE
expenses.get("/", async (c) => {
  const user = c.get("user");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20")));
  const category = c.req.query("category");

  const where = {
    userId: user.id,
    ...(category ? { category: category as never } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return c.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// POST /api/expenses
expenses.post("/", zValidator("json", createExpenseSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  if (body.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, userId: user.id },
    });
    if (!client) return apiError(c, "NOT_FOUND", "Client not found");
  }

  const expense = await prisma.expense.create({
    data: { ...body, userId: user.id },
    include: { client: { select: { name: true } } },
  });

  return c.json(expense, 201);
});

// PUT /api/expenses/:id
expenses.put("/:id", zValidator("json", updateExpenseSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = c.req.valid("json");

  const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Expense not found");

  if (body.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, userId: user.id },
    });
    if (!client) return apiError(c, "NOT_FOUND", "Client not found");
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: body,
    include: { client: { select: { name: true } } },
  });

  return c.json(expense);
});

// DELETE /api/expenses/:id
expenses.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } });
  if (!existing) return apiError(c, "NOT_FOUND", "Expense not found");

  await prisma.expense.delete({ where: { id } });

  return c.json({ success: true });
});

export default expenses;
