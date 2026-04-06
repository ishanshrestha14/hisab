import { prisma } from "@hisab/db";

export type AuditAction =
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "invoice.status_changed"
  | "invoice.sent";

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
    .catch((err) => console.error("[audit] Failed to write audit log:", err));
}
