import { describe, expect, it } from "vitest";
import {
  createClientSchema,
  createExpenseSchema,
  createInvoiceSchema,
  createPaymentSchema,
  createRecurringInvoiceSchema,
  generateInvoiceFromTimeSchema,
  lineItemSchema,
  signUpSchema,
  updateInvoiceSchema,
  updateProfileSchema,
} from "./schemas";

const CLIENT_ID = "clx0client00000000000001";

const validInvoice = {
  clientId: CLIENT_ID,
  issueDate: "2025-07-01",
  dueDate: "2025-07-31",
  lineItems: [{ description: "Design work", quantity: 10, unitPrice: 50 }],
};

describe("createClientSchema", () => {
  it("defaults the currency to USD", () => {
    const parsed = createClientSchema.parse({ name: "Acme", email: "ap@acme.com" });
    expect(parsed.defaultCurrency).toBe("USD");
  });

  it("rejects an invalid email", () => {
    const result = createClientSchema.safeParse({ name: "Acme", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported currencies", () => {
    const result = createClientSchema.safeParse({
      name: "Acme",
      email: "ap@acme.com",
      defaultCurrency: "JPY",
    });
    expect(result.success).toBe(false);
  });
});

describe("lineItemSchema", () => {
  it("allows a zero unit price (free line items)", () => {
    expect(lineItemSchema.safeParse({ description: "Bonus", quantity: 1, unitPrice: 0 }).success).toBe(true);
  });

  it.each([
    ["zero quantity", { description: "x", quantity: 0, unitPrice: 1 }],
    ["negative price", { description: "x", quantity: 1, unitPrice: -5 }],
    ["empty description", { description: "", quantity: 1, unitPrice: 1 }],
  ])("rejects %s", (_label, item) => {
    expect(lineItemSchema.safeParse(item).success).toBe(false);
  });
});

describe("createInvoiceSchema", () => {
  it("coerces ISO date strings and applies defaults", () => {
    const parsed = createInvoiceSchema.parse(validInvoice);
    expect(parsed.issueDate).toBeInstanceOf(Date);
    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.currency).toBe("USD");
    expect(parsed.tdsPercent).toBe(0);
  });

  it("requires at least one line item", () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, lineItems: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("At least one line item required");
  });

  it("rejects a non-cuid client id", () => {
    expect(createInvoiceSchema.safeParse({ ...validInvoice, clientId: "1" }).success).toBe(false);
  });

  it.each([-1, 100.01])("rejects TDS of %d%%", (tdsPercent) => {
    expect(createInvoiceSchema.safeParse({ ...validInvoice, tdsPercent }).success).toBe(false);
  });

  it("accepts the standard 15% TDS rate", () => {
    expect(createInvoiceSchema.parse({ ...validInvoice, tdsPercent: 15 }).tdsPercent).toBe(15);
  });

  it("rejects an unparseable date", () => {
    expect(createInvoiceSchema.safeParse({ ...validInvoice, dueDate: "next tuesday" }).success).toBe(false);
  });
});

describe("updateInvoiceSchema", () => {
  it("allows partial updates", () => {
    expect(updateInvoiceSchema.parse({ notes: "Thanks!" })).toEqual({ notes: "Thanks!" });
  });

  it("strips clientId so an invoice cannot be moved to another client", () => {
    const parsed = updateInvoiceSchema.parse({ clientId: CLIENT_ID, notes: "x" });
    expect(parsed).not.toHaveProperty("clientId");
  });
});

describe("createRecurringInvoiceSchema", () => {
  const base = {
    clientId: CLIENT_ID,
    interval: "MONTHLY",
    nextRunAt: "2025-08-01",
    lineItems: validInvoice.lineItems,
  };

  it("defaults payment terms to 30 days", () => {
    expect(createRecurringInvoiceSchema.parse(base).daysBefore).toBe(30);
  });

  it("rejects unknown intervals", () => {
    expect(createRecurringInvoiceSchema.safeParse({ ...base, interval: "DAILY" }).success).toBe(false);
  });

  it("rejects fractional day counts", () => {
    expect(createRecurringInvoiceSchema.safeParse({ ...base, daysBefore: 1.5 }).success).toBe(false);
  });
});

describe("createPaymentSchema", () => {
  it.each([0, -10])("rejects a payment of %d", (amount) => {
    expect(createPaymentSchema.safeParse({ amount }).success).toBe(false);
  });

  it("leaves paidAt undefined when omitted", () => {
    expect(createPaymentSchema.parse({ amount: 10 }).paidAt).toBeUndefined();
  });
});

describe("createExpenseSchema", () => {
  it("accepts an expense with no client", () => {
    const parsed = createExpenseSchema.parse({ description: "Figma", amount: 15, date: "2025-07-01", clientId: null });
    expect(parsed.clientId).toBeNull();
    expect(parsed.category).toBe("OTHER");
  });
});

describe("generateInvoiceFromTimeSchema", () => {
  it("requires at least one entry", () => {
    const result = generateInvoiceFromTimeSchema.safeParse({ entryIds: [], dueDate: "2025-08-01" });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("normalizes empty strings to null so fields can be cleared", () => {
    expect(updateProfileSchema.parse({ pan: "", vatNumber: "", logoUrl: "" })).toEqual({
      pan: null,
      vatNumber: null,
      logoUrl: null,
    });
  });

  it.each(["#f59e0b", "#FFFFFF"])("accepts hex color %s", (brandColor) => {
    expect(updateProfileSchema.safeParse({ brandColor }).success).toBe(true);
  });

  it.each(["f59e0b", "#fff", "#gggggg", "amber"])("rejects color %s", (brandColor) => {
    expect(updateProfileSchema.safeParse({ brandColor }).success).toBe(false);
  });

  it("rejects a PAN longer than 20 characters", () => {
    expect(updateProfileSchema.safeParse({ pan: "1".repeat(21) }).success).toBe(false);
  });

  it("rejects unknown invoice templates", () => {
    expect(updateProfileSchema.safeParse({ invoiceTemplate: "fancy" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("requires an 8+ character password", () => {
    const result = signUpSchema.safeParse({ name: "Sita", email: "sita@example.com", password: "short" });
    expect(result.success).toBe(false);
  });
});
