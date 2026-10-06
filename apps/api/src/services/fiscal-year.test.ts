import { describe, expect, it } from "vitest";
import { currentFYStartBS, fyBounds, fyStartBSForDate } from "./fiscal-year";

describe("fyBounds", () => {
  it("spans mid-July to mid-July for FY 2081/82", () => {
    const { start, end, label } = fyBounds(2081);
    expect(label).toBe("2081/82");
    expect(start.toISOString()).toBe("2024-07-16T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-07-15T23:59:59.999Z");
  });

  it("wraps the two-digit suffix at a century boundary", () => {
    expect(fyBounds(2099).label).toBe("2099/00");
  });

  it("produces back-to-back fiscal years with no gap or overlap", () => {
    const fy1 = fyBounds(2081);
    const fy2 = fyBounds(2082);
    expect(fy2.start.getTime() - fy1.end.getTime()).toBe(1);
  });
});

describe("fyStartBSForDate", () => {
  it.each([
    ["2025-07-15T23:59:59Z", 2081], // last day of FY 2081/82
    ["2025-07-16T00:00:00Z", 2082], // first day of FY 2082/83
    ["2025-12-31T12:00:00Z", 2082],
    ["2026-01-01T00:00:00Z", 2082], // AD year rolls over, FY does not
    ["2026-07-15T12:00:00Z", 2082],
    ["2026-07-16T12:00:00Z", 2083],
  ])("%s belongs to FY starting BS %i", (iso, expected) => {
    expect(fyStartBSForDate(new Date(iso))).toBe(expected);
  });

  it("agrees with fyBounds for every day of a year", () => {
    const day = 86_400_000;
    for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2026, 0, 1); t += day) {
      const date = new Date(t);
      const { start, end } = fyBounds(fyStartBSForDate(date));
      expect(date >= start && date <= end, date.toISOString()).toBe(true);
    }
  });
});

describe("currentFYStartBS", () => {
  it("uses the provided clock", () => {
    expect(currentFYStartBS(new Date("2025-10-06T00:00:00Z"))).toBe(2082);
  });
});
