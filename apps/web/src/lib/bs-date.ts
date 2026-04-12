// Bikram Sambat (BS) calendar conversion utilities for Nepal.
//
// Anchor: BS 2082 Baisakh 1 = AD April 14, 2025 (Nepal government calendar).
// Month-length data sourced from the Nepal government calendar (NepCal).
// Accurate for BS 2078–2090 (AD 2021–2033).

const BS_DATA: Record<number, number[]> = {
  // [Baisakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra]
  2078: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 days
  2079: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 days
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 days
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 days
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 366 days
  2083: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31], // 365 days
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 days
  2085: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 365 days
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 days
  2087: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // 365 days
  2088: [30, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 364 days
  2089: [31, 31, 32, 31, 31, 31, 30, 30, 29, 29, 30, 30], // 365 days
  2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 days
};

export const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
];

// Anchor point — BS 2082 Baisakh 1 = April 14, 2025 UTC
const ANCHOR_AD_MS = Date.UTC(2025, 3, 14);
const ANCHOR = { year: 2082, month: 0, day: 1 }; // month is 0-indexed internally

export interface BSDate {
  year: number;
  month: number;    // 1-indexed (1 = Baisakh … 12 = Chaitra)
  day: number;
  monthName: string;
}

/** Convert a Gregorian Date to a Bikram Sambat date. Returns null if out of range. */
export function adToBS(adDate: Date): BSDate | null {
  const adMs = Date.UTC(
    adDate.getFullYear(),
    adDate.getMonth(),
    adDate.getDate()
  );
  const diffDays = Math.round((adMs - ANCHOR_AD_MS) / 86_400_000);

  let { year, month, day } = ANCHOR;

  if (diffDays >= 0) {
    let remaining = diffDays;
    while (remaining > 0) {
      const months = BS_DATA[year];
      if (!months) return null;
      const daysToEndOfMonth = months[month] - day + 1;
      if (remaining < daysToEndOfMonth) {
        day += remaining;
        remaining = 0;
      } else {
        remaining -= daysToEndOfMonth;
        day = 1;
        month++;
        if (month >= 12) {
          month = 0;
          year++;
        }
      }
    }
  } else {
    let remaining = -diffDays;
    while (remaining > 0) {
      if (day > remaining) {
        day -= remaining;
        remaining = 0;
      } else {
        remaining -= day;
        month--;
        if (month < 0) {
          month = 11;
          year--;
        }
        const months = BS_DATA[year];
        if (!months) return null;
        day = months[month];
      }
    }
  }

  return {
    year,
    month: month + 1,
    day,
    monthName: BS_MONTH_NAMES[month],
  };
}

/** Format a BS date as "2082 Baisakh 14" */
export function formatBS(bs: BSDate): string {
  return `${bs.year} ${bs.monthName} ${bs.day}`;
}
