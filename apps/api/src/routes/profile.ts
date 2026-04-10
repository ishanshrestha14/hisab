import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@hisab/db";
import { updateProfileSchema } from "@hisab/shared";
import { apiError } from "../lib/errors";

const profile = new Hono<{
  Variables: { user: { id: string } };
}>();

// GET /api/profile — return PAN / VAT for the current user
profile.get("/", async (c) => {
  const user = c.get("user");
  const data = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pan: true, vatNumber: true, logoUrl: true, invoiceTemplate: true, brandColor: true },
  });
  if (!data) return apiError(c, "NOT_FOUND", "User not found");
  return c.json(data);
});

// PATCH /api/profile — update PAN / VAT / branding
profile.patch("/", zValidator("json", updateProfileSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: body,
    select: { pan: true, vatNumber: true, logoUrl: true, invoiceTemplate: true, brandColor: true },
  });
  return c.json(updated);
});

export default profile;
