// Nepal fiscal year helpers.
// Nepal FY runs Shrawan 1 → Ashad end, approximately July 16 → July 15 next year.
// BS year ≈ AD year + 57 for months after BS New Year (mid-April).
// fyStartBS: the BS year in which Shrawan falls (e.g. 2081 for FY 2081/82).

export function fyBounds(fyStartBS: number): { start: Date; end: Date; label: string } {
  const adStart = fyStartBS - 57; // Gregorian year when this FY's Shrawan falls
  const start = new Date(Date.UTC(adStart, 6, 16));                         // July 16 00:00 UTC
  const end   = new Date(Date.UTC(adStart + 1, 6, 15, 23, 59, 59, 999));    // July 15 end UTC
  return {
    start,
    end,
    label: `${fyStartBS}/${String(fyStartBS + 1).slice(-2)}`,
  };
}

export function fyStartBSForDate(date: Date): number {
  const month = date.getUTCMonth() + 1; // 1-12
  const day   = date.getUTCDate();
  const year  = date.getUTCFullYear();
  // On or after July 16: we are in the FY that started this calendar year
  const adStart = month > 7 || (month === 7 && day >= 16) ? year : year - 1;
  return adStart + 57;
}

export function currentFYStartBS(now: Date = new Date()): number {
  return fyStartBSForDate(now);
}
