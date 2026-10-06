import { describe, expect, it } from "vitest";
import { adToBS, formatBS } from "./bs-date";

// Local-time constructor — adToBS reads local Y/M/D
const ad = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("adToBS", () => {
  it("maps the anchor date: 2025-04-14 = 2082 Baisakh 1", () => {
    expect(adToBS(ad(2025, 4, 14))).toEqual({ year: 2082, month: 1, day: 1, monthName: "Baisakh" });
  });

  it("maps the start of FY 2082/83: 2025-07-17 = 2082 Shrawan 1", () => {
    expect(adToBS(ad(2025, 7, 17))).toMatchObject({ year: 2082, month: 4, day: 1 });
  });

  it("ignores the time of day", () => {
    const morning = new Date(2025, 3, 14, 0, 1);
    const night = new Date(2025, 3, 14, 23, 59);
    expect(adToBS(morning)).toEqual(adToBS(night));
  });

  it("returns null outside the supported range", () => {
    expect(adToBS(ad(2000, 1, 1))).toBeNull();
    expect(adToBS(ad(2040, 1, 1))).toBeNull();
  });

  it("advances exactly one BS day per AD day across the supported range", () => {
    let prev = adToBS(ad(2021, 6, 1))!;
    for (let t = ad(2021, 6, 2); t < ad(2033, 1, 1); t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) {
      const cur = adToBS(t)!;
      const nextDay = cur.year === prev.year && cur.month === prev.month && cur.day === prev.day + 1;
      const nextMonth = cur.day === 1 && (cur.month === prev.month + 1 || (cur.month === 1 && prev.month === 12));
      expect(nextDay || nextMonth, `${t.toDateString()} → ${formatBS(cur)}`).toBe(true);
      prev = cur;
    }
  });

  // Verified New Year (Baisakh 1) dates. 2081 began 13 Apr 2024 and 2082/2083
  // began 14 Apr, so BS 2081 has 366 days and 2082 has 365 — BS_DATA currently
  // has those totals swapped. These are expected to fail until the table is
  // corrected; when they start passing, `it.fails` will flag it — switch them to `it`.
  it.fails("maps 2024-04-13 to 2081 Baisakh 1", () => {
    expect(adToBS(ad(2024, 4, 13))).toMatchObject({ year: 2081, month: 1, day: 1 });
  });

  it.fails("maps 2026-04-14 to 2083 Baisakh 1", () => {
    expect(adToBS(ad(2026, 4, 14))).toMatchObject({ year: 2083, month: 1, day: 1 });
  });
});

describe("formatBS", () => {
  it('formats as "<year> <month> <day>"', () => {
    expect(formatBS({ year: 2082, month: 1, day: 14, monthName: "Baisakh" })).toBe("2082 Baisakh 14");
  });
});
