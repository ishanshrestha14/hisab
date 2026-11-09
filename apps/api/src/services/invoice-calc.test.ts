import { describe, expect, it } from "vitest";
import {
  computeInvoiceTotals,
  isFullyPaid,
  lineItemTotal,
  paymentExceedsBalance,
  sumLineItems,
  sumPayments,
} from "./invoice-calc";

describe("lineItemTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineItemTotal({ quantity: 3, unitPrice: 150 })).toBe(450);
  });

  it("supports fractional quantities (e.g. hours)", () => {
    expect(lineItemTotal({ quantity: 2.5, unitPrice: 40 })).toBe(100);
  });
});

describe("sumLineItems / sumPayments", () => {
  it("returns 0 for empty lists", () => {
    expect(sumLineItems([])).toBe(0);
    expect(sumPayments([])).toBe(0);
  });

  it("adds up totals and amounts", () => {
    expect(sumLineItems([{ total: 100 }, { total: 250.5 }])).toBe(350.5);
    expect(sumPayments([{ amount: 10 }, { amount: 15 }])).toBe(25);
  });
});

describe("computeInvoiceTotals", () => {
  it("computes gross, TDS, net, paid and due — due is net of TDS", () => {
    const totals = computeInvoiceTotals({
      lineItems: [{ total: 1000 }, { total: 500 }],
      tdsPercent: 15,
      payments: [{ amount: 400 }],
    });

    expect(totals).toEqual({
      total: 1500,
      tdsAmount: 225,
      netReceivable: 1275,
      amountPaid: 400,
      amountDue: 875,
    });
  });

  it("treats missing payments as unpaid", () => {
    const totals = computeInvoiceTotals({ lineItems: [{ total: 200 }], tdsPercent: 0 });
    expect(totals.amountPaid).toBe(0);
    expect(totals.amountDue).toBe(200);
    expect(totals.tdsAmount).toBe(0);
    expect(totals.netReceivable).toBe(200);
  });

  it("never reports a negative amount due", () => {
    const totals = computeInvoiceTotals({
      lineItems: [{ total: 100 }],
      tdsPercent: 0,
      payments: [{ amount: 60 }, { amount: 60 }],
    });
    expect(totals.amountDue).toBe(0);
  });

  it("withholds the full amount at 100% TDS", () => {
    const totals = computeInvoiceTotals({ lineItems: [{ total: 80 }], tdsPercent: 100 });
    expect(totals.netReceivable).toBe(0);
    expect(totals.amountDue).toBe(0);
  });

  it("is settled when the client pays the net and withholds TDS", () => {
    const totals = computeInvoiceTotals({
      lineItems: [{ total: 60500 }],
      tdsPercent: 15,
      payments: [{ amount: 51425 }],
    });
    expect(totals.amountDue).toBe(0);
    expect(isFullyPaid(totals.netReceivable, totals.amountPaid)).toBe(true);
  });
});

describe("paymentExceedsBalance", () => {
  it("allows a payment that exactly settles the balance", () => {
    expect(paymentExceedsBalance(100, 60, 40)).toBe(false);
  });

  it("rejects a payment above the balance", () => {
    expect(paymentExceedsBalance(100, 60, 40.01)).toBe(true);
  });

  it("tolerates float rounding noise", () => {
    // 0.1 + 0.2 = 0.30000000000000004
    expect(paymentExceedsBalance(0.3, 0.1, 0.2)).toBe(false);
  });
});

describe("isFullyPaid", () => {
  it("is true when paid equals total", () => {
    expect(isFullyPaid(100, 100)).toBe(true);
  });

  it("is false when a cent is outstanding", () => {
    expect(isFullyPaid(100, 99.99)).toBe(false);
  });

  it("tolerates float rounding noise", () => {
    expect(isFullyPaid(0.3, 0.1 + 0.2)).toBe(true);
    expect(isFullyPaid(0.30000000000000004, 0.3)).toBe(true);
  });
});
