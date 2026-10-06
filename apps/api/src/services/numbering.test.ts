import { describe, expect, it, vi } from "vitest";
import { formatDocNumber, nextInvoiceNumber, nextQuoteNumber, type Tx } from "./numbering";

function fakeTx(max: number | null) {
  const $queryRaw = vi.fn().mockResolvedValue([{ max }]);
  return { tx: { $queryRaw } as unknown as Tx, $queryRaw };
}

describe("formatDocNumber", () => {
  it.each([
    [1, "INV-001"],
    [42, "INV-042"],
    [999, "INV-999"],
    [1000, "INV-1000"],
  ])("formats %i as %s", (n, expected) => {
    expect(formatDocNumber("INV", n)).toBe(expected);
  });

  it("uses the QT prefix for quotes", () => {
    expect(formatDocNumber("QT", 7)).toBe("QT-007");
  });
});

describe("nextInvoiceNumber", () => {
  it("starts at INV-001 for a user with no invoices", async () => {
    const { tx } = fakeTx(null);
    await expect(nextInvoiceNumber(tx, "user_1")).resolves.toBe("INV-001");
  });

  it("increments the highest existing number, not the count", async () => {
    // e.g. INV-001..INV-009 exist but INV-003 was deleted: count is 8, max is 9
    const { tx } = fakeTx(9);
    await expect(nextInvoiceNumber(tx, "user_1")).resolves.toBe("INV-010");
  });

  it("scopes the lookup to the given user", async () => {
    const { tx, $queryRaw } = fakeTx(0);
    await nextInvoiceNumber(tx, "user_42");

    const [strings, ...values] = $queryRaw.mock.calls[0];
    expect(strings.join("?")).toContain('FROM "Invoice"');
    expect(values).toEqual(["user_42"]);
  });
});

describe("nextQuoteNumber", () => {
  it("reads from the Quote table and uses the QT prefix", async () => {
    const { tx, $queryRaw } = fakeTx(4);
    await expect(nextQuoteNumber(tx, "user_1")).resolves.toBe("QT-005");

    const [strings] = $queryRaw.mock.calls[0];
    expect(strings.join("?")).toContain('FROM "Quote"');
  });
});
