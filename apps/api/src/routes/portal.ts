import { Hono } from "hono";
import { prisma } from "@hisab/db";
import { getNPRRate } from "../lib/exchange-rate";
import { sendPaidNotificationEmail } from "../lib/email";

const portal = new Hono();

// GET /api/portal/:token — public, no auth
portal.get("/:token", async (c) => {
  const { token } = c.req.param();

  const invoice = await prisma.invoice.findUnique({
    where: { token },
    include: {
      client: {
        select: { name: true, email: true, company: true, country: true },
      },
      lineItems: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!invoice) return c.json({ error: "Invoice not found" }, 404);

  const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);

  // Get NPR rate for display (best-effort — don't fail if API is down)
  let nprRate: number | null = null;
  if (invoice.currency !== "NPR") {
    nprRate = await getNPRRate(
      invoice.currency as "USD" | "GBP" | "EUR",
      invoice.userId
    ).catch(() => null);
  }

  return c.json({
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    total,
    nprRate,
    nprTotal: nprRate ? total * nprRate : null,
    client: invoice.client,
    freelancer: invoice.user,
    lineItems: invoice.lineItems,
  });
});

// POST /api/portal/:token/mark-paid — public, no auth
portal.post("/:token/mark-paid", async (c) => {
  const { token } = c.req.param();

  const invoice = await prisma.invoice.findUnique({
    where: { token },
    include: {
      user: { select: { name: true, email: true } },
      client: { select: { name: true } },
      lineItems: true,
    },
  });
  if (!invoice) return c.json({ error: "Invoice not found" }, 404);

  if (invoice.status === "PAID") {
    return c.json({ error: "Invoice is already marked as paid" }, 400);
  }

  const updated = await prisma.invoice.update({
    where: { token },
    data: { status: "PAID" },
  });

  // Notify the freelancer — best-effort, don't fail the request if email fails
  const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);
  sendPaidNotificationEmail({
    to: invoice.user.email,
    freelancerName: invoice.user.name,
    clientName: invoice.client.name,
    invoiceNumber: invoice.number,
    total,
    currency: invoice.currency,
  }).catch((err) => console.error("Failed to send paid notification:", err));

  return c.json({ status: updated.status });
});

export default portal;
