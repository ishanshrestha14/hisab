import cron from "node-cron";
import { prisma } from "@hisab/db";
import { sendOverdueReminderEmail } from "./email";
import { logger } from "./logger";

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
        const total = invoice.lineItems.reduce((sum, li) => sum + li.total, 0);
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
}
