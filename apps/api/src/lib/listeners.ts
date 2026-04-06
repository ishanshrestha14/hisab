import { eventBus } from "./events";
import { sendInvoiceEmail, sendPaidNotificationEmail } from "./email";

// Call once at server startup (in index.ts) to wire all event listeners.
// Add new listeners here as the app grows — routes stay decoupled from side-effects.
export function registerListeners(): void {
  eventBus.on("invoice.sent", async (payload) => { await sendInvoiceEmail(payload); });
  eventBus.on("invoice.paid", async (payload) => { await sendPaidNotificationEmail(payload); });
}
