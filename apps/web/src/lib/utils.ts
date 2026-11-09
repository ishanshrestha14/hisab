import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui standard utility — merges Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  NPR: "₨",
};

export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const DATE_STYLES = {
  // "Nov 9, 2026" — tables, lists, meta
  short: { month: "short", day: "numeric", year: "numeric" },
  // "November 9, 2026" — documents (invoice, portal, statement)
  long: { month: "long", day: "numeric", year: "numeric" },
  // "November 2026" — period titles
  month: { month: "long", year: "numeric" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

/** One date format per context, used everywhere */
export function formatDate(date: string | Date, style: keyof typeof DATE_STYLES = "short"): string {
  return new Date(date).toLocaleDateString("en-US", DATE_STYLES[style]);
}
