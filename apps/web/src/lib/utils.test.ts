import { describe, expect, it } from "vitest";
import { cn, formatCurrency, formatDate } from "./utils";

describe("formatCurrency", () => {
  it.each([
    [1234.5, "USD", "$1,234.50"],
    [0, "GBP", "£0.00"],
    [99.999, "EUR", "€100.00"],
    [150000, "NPR", "₨150,000.00"],
  ])("formats %d %s as %s", (amount, currency, expected) => {
    expect(formatCurrency(amount, currency)).toBe(expected);
  });

  it("falls back to the currency code for unknown currencies", () => {
    expect(formatCurrency(5, "JPY")).toBe("JPY5.00");
  });
});

describe("cn", () => {
  it("lets later Tailwind classes override conflicting earlier ones", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("formatDate", () => {
  const d = new Date(2026, 10, 9);

  it("defaults to the short style used in tables", () => {
    expect(formatDate(d)).toBe("Nov 9, 2026");
  });

  it("uses the long style on documents", () => {
    expect(formatDate(d, "long")).toBe("November 9, 2026");
  });

  it("formats a period title", () => {
    expect(formatDate(d, "month")).toBe("November 2026");
  });

  it("accepts ISO strings from the API", () => {
    expect(formatDate("2026-11-09T12:00:00.000Z")).toBe("Nov 9, 2026");
  });
});
