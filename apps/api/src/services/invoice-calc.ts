// Pure invoice arithmetic — no Prisma, no Hono. Shared by the invoice, portal
// and client-statement routes so the numbers shown everywhere agree.

// Tolerance for float comparisons on money (sub-cent rounding noise)
export const MONEY_EPSILON = 0.001;

export function lineItemTotal(item: { quantity: number; unitPrice: number }): number {
  return item.quantity * item.unitPrice;
}

export function sumLineItems(items: { total: number }[]): number {
  return items.reduce((sum, li) => sum + li.total, 0);
}

export function sumPayments(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export interface InvoiceTotals {
  total: number;
  tdsAmount: number;
  netReceivable: number;
  amountPaid: number;
  amountDue: number;
}

export function computeInvoiceTotals(invoice: {
  lineItems: { total: number }[];
  tdsPercent: number;
  payments?: { amount: number }[];
}): InvoiceTotals {
  const total = sumLineItems(invoice.lineItems);
  const tdsAmount = total * (invoice.tdsPercent / 100);
  const amountPaid = sumPayments(invoice.payments ?? []);
  return {
    total,
    tdsAmount,
    netReceivable: total - tdsAmount,
    amountPaid,
    amountDue: Math.max(0, total - amountPaid),
  };
}

export function paymentExceedsBalance(total: number, alreadyPaid: number, amount: number): boolean {
  return alreadyPaid + amount > total + MONEY_EPSILON;
}

export function isFullyPaid(total: number, paid: number): boolean {
  return paid >= total - MONEY_EPSILON;
}
