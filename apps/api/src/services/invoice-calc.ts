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

// An invoice with TDS is settled by the net receivable: the client withholds
// the TDS and deposits it with IRD, so it never arrives as a payment.
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
  const netReceivable = total - tdsAmount;
  const amountPaid = sumPayments(invoice.payments ?? []);
  return {
    total,
    tdsAmount,
    netReceivable,
    amountPaid,
    amountDue: Math.max(0, netReceivable - amountPaid),
  };
}

/** `payable` is the net receivable: what the client actually transfers */
export function paymentExceedsBalance(payable: number, alreadyPaid: number, amount: number): boolean {
  return alreadyPaid + amount > payable + MONEY_EPSILON;
}

/** `payable` is the net receivable: what the client actually transfers */
export function isFullyPaid(payable: number, paid: number): boolean {
  return paid >= payable - MONEY_EPSILON;
}
