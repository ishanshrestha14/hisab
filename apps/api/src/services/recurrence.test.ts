import { describe, expect, it } from "vitest";
import { nextRunDate, recurringDueDate } from "./recurrence";

// Local-time constructor: date-fns add* functions operate in local time
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("nextRunDate", () => {
  it.each([
    ["WEEKLY", d(2025, 1, 1), d(2025, 1, 8)],
    ["MONTHLY", d(2025, 1, 15), d(2025, 2, 15)],
    ["QUARTERLY", d(2025, 1, 15), d(2025, 4, 15)],
    ["YEARLY", d(2025, 1, 15), d(2026, 1, 15)],
  ])("%s advances from %s", (interval, from, expected) => {
    expect(nextRunDate(interval, from)).toEqual(expected);
  });

  it("clamps to the last day of shorter months", () => {
    expect(nextRunDate("MONTHLY", d(2025, 1, 31))).toEqual(d(2025, 2, 28));
    expect(nextRunDate("MONTHLY", d(2024, 1, 31))).toEqual(d(2024, 2, 29));
  });

  it("falls back to monthly for unknown intervals", () => {
    expect(nextRunDate("FORTNIGHTLY", d(2025, 3, 1))).toEqual(d(2025, 4, 1));
  });

  it("does not mutate the input date", () => {
    const from = d(2025, 1, 1);
    nextRunDate("WEEKLY", from);
    expect(from).toEqual(d(2025, 1, 1));
  });
});

describe("recurringDueDate", () => {
  it("adds the payment terms to the run date", () => {
    expect(recurringDueDate(d(2025, 1, 15), 30)).toEqual(d(2025, 2, 14));
  });

  it("is due immediately with zero-day terms", () => {
    expect(recurringDueDate(d(2025, 1, 15), 0)).toEqual(d(2025, 1, 15));
  });
});
