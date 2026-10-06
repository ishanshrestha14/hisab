import cron from "node-cron";
import { prisma } from "@hisab/db";
import { sendOverdueReminderEmail } from "./email";
import { logger } from "./logger";
import { nextInvoiceNumber } from "../services/numbering";
import { nextRunDate, recurringDueDate } from "../services/recurrence";
import { sumLineItems } from "../services/invoice-calc";

// Runs every day at 08:00 UTC
// Finds SENT invoices past their due date, marks them OVERDUE, emails the freelancer
export function startCronJobs() {
  // Runs every day at 08:00 UTC
  // Finds SENT invoices past their due date, marks them OVERDUE, emails the freelancer
  cron.schedule("0 8 * * *", async () => {
    try {
      const overdue = await prisma.invoice.findMany({
        where: {
          status: "SENT",
          dueDate: { lt: new Date() },
        },
        include: {
          user: { select: { name: true, email: true } },
          client: { select: { name: true } },
          lineItems: true,
        },
      });

      if (overdue.length === 0) return;

      await prisma.invoice.updateMany({
        where: { id: { in: overdue.map((inv) => inv.id) } },
        data: { status: "OVERDUE" },
      });

      logger.info({ count: overdue.length }, "Marked invoices as OVERDUE");

      for (const invoice of overdue) {

        const total = sumLineItems(invoice.lineItems);
        const portalUrl = `${process.env.WEB_URL}/portal/${invoice.token}`;

        sendOverdueReminderEmail({
          to: invoice.user.email,
          freelancerName: invoice.user.name,
          clientName: invoice.client.name,
          invoiceNumber: invoice.number,
          total,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          portalUrl,
        }).catch((err) =>
          logger.error({ invoiceNumber: invoice.number, err }, "Failed to send overdue email")
        );
      }
    } catch (err) {
      logger.error({ err }, "Overdue cron job failed");
    }
  });

  // Runs every day at 06:00 UTC — generates invoices from active recurring schedules
  cron.schedule("0 6 * * *", async () => {
    try {
      const due = await prisma.recurringInvoice.findMany({
        where: { active: true, nextRunAt: { lte: new Date() } },
        include: { lineItems: true },
      });

      if (due.length === 0) return;

      logger.info({ count: due.length }, "Processing recurring invoices");

      for (const ri of due) {
        try {
          await prisma.$transaction(async (tx) => {
            const number = await nextInvoiceNumber(tx, ri.userId);
            const dueDate = recurringDueDate(ri.nextRunAt, ri.daysBefore);

            await tx.invoice.create({
              data: {
                userId: ri.userId,
                clientId: ri.clientId,
                number,
                currency: ri.currency,
                issueDate: new Date(),
                dueDate,
                notes: ri.notes,
                lineItems: {
                  create: ri.lineItems.map((li) => ({
                    description: li.description,
                    quantity: li.quantity,
                    unitPrice: li.unitPrice,
                    total: li.total,
                  })),
                },
              },
            });

            await tx.recurringInvoice.update({
              where: { id: ri.id },
              data: { nextRunAt: nextRunDate(ri.interval, ri.nextRunAt) },
            });
          });

          logger.info({ recurringId: ri.id }, "Generated invoice from recurring schedule");
        } catch (err) {
          logger.error({ recurringId: ri.id, err }, "Failed to generate recurring invoice");
        }
      }
    } catch (err) {
      logger.error({ err }, "Recurring invoice cron job failed");
    }
  });
}
