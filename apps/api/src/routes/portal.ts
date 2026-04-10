import { Hono, type Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { prisma } from "@hisab/db";
import { getNPRRate } from "../lib/exchange-rate";
import { eventBus } from "../lib/events";
import { apiError } from "../lib/errors";

const keyFromIP = (c: Context) =>
  (c.req.header("x-forwarded-for") ?? "unknown").split(",")[0].trim();

// 30 requests per 15 minutes per IP — covers invoice view/PDF load
const viewLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-6",
  keyGenerator: keyFromIP,
});

// 5 requests per hour per IP — mark-paid is a write action, stricter limit
const markPaidLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-6",
  keyGenerator: keyFromIP,
});

const portal = new Hono();

// GET /api/portal/:token — public, no auth
portal.get("/:token", viewLimiter, async (c) => {
  const { token } = c.req.param();

  const invoice = await prisma.invoice.findUnique({
    where: { token },
    include: {
      client: {
        select: { name: true, email: true, company: true, country: true },
      },
      lineItems: true,
      user: { select: { name: true, email: true, pan: true, vatNumber: true } },
    },
  });

  if (!invoice) return apiError(c, "NOT_FOUND", "Invoice not found");

  const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);

  // Get NPR rate for display (best-effort — don't fail if API is down)
  let nprRate: number | null = null;
  if (invoice.currency !== "NPR") {
    nprRate = await getNPRRate(
      invoice.currency as "USD" | "GBP" | "EUR"
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
    freelancer: {
      name: invoice.user.name,
      email: invoice.user.email,
      pan: invoice.user.pan,
      vatNumber: invoice.user.vatNumber,
    },
    lineItems: invoice.lineItems,
  });
});

// POST /api/portal/:token/mark-paid — public, no auth
portal.post("/:token/mark-paid", markPaidLimiter, async (c) => {
  const { token } = c.req.param();

  const invoice = await prisma.invoice.findUnique({
    where: { token },
    include: {
      user: { select: { name: true, email: true } },
      client: { select: { name: true } },
      lineItems: true,
    },
  });
  if (!invoice) return apiError(c, "NOT_FOUND", "Invoice not found");

  if (invoice.status !== "SENT") {
    return apiError(c, "BAD_REQUEST", "Only sent invoices can be marked as paid");
  }

  const updated = await prisma.invoice.update({
    where: { token },
    data: { status: "PAID" },
  });

  // Notify the freelancer via event bus — fire-and-forget, decoupled from email impl
  const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);
  eventBus.emit("invoice.paid", {
    to: invoice.user.email,
    freelancerName: invoice.user.name,
    clientName: invoice.client.name,
    invoiceNumber: invoice.number,
    total,
    currency: invoice.currency,
  });

  return c.json({ status: updated.status });
});

export default portal;
