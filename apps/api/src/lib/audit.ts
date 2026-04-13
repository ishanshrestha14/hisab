import { prisma } from "@hisab/db";
import { logger } from "./logger";

export type AuditAction =
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "invoice.status_changed"
  | "invoice.sent"
  | "invoice.paid"
  | "payment.created"
  | "payment.deleted"
  | "quote.created"
  | "quote.updated"
  | "quote.deleted"
  | "quote.status_changed"
  | "quote.converted";

// Fire-and-forget — audit failures are logged but never block the user request.
export function audit(params: {
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: object | null;
  after?: object | null;
}): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
      },
    })
    .catch((err) => logger.error({ err }, "Failed to write audit log"));
}
