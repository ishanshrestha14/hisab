import { addDays, addMonths, addWeeks, addYears } from "date-fns";

export function nextRunDate(interval: string, from: Date): Date {
  switch (interval) {
    case "WEEKLY":    return addWeeks(from, 1);
    case "MONTHLY":   return addMonths(from, 1);
    case "QUARTERLY": return addMonths(from, 3);
    case "YEARLY":    return addYears(from, 1);
    default:          return addMonths(from, 1);
  }
}

// Due date for an invoice generated from a recurring schedule
export function recurringDueDate(runAt: Date, daysBefore: number): Date {
  return addDays(runAt, daysBefore);
}
