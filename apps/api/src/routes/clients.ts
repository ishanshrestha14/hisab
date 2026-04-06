import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import { createClientSchema, updateClientSchema } from "@hisab/shared";
import { apiError } from "../lib/errors";

// Each route file gets its own Hono instance — mounted at /api/clients in index.ts
const clients = new Hono<{
  Variables: { user: { id: string; email: string; name: string } };
}>();

// GET /api/clients
clients.get("/", async (c) => {
  const user = c.get("user");
  const data = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json(data);
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
