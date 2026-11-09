import { cn, formatCurrency } from "@/lib/utils";

/** An amount in its own currency, in tabular figures */
export function Money({
  amount,
  currency,
  className,
  signed,
}: {
  amount: number;
  currency: string;
  className?: string;
  /** Prefix with − for deductions */
  signed?: "minus" | "plus";
}) {
  const prefix = signed === "minus" ? "−" : signed === "plus" ? "+" : "";
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatCurrency(amount, currency)}
    </span>
  );
}

/**
 * The figure that closes an account (total due, net receivable, balance),
 * with the double rule beneath it. One per document.
 */
export function TotalFigure({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "double-rule inline-block text-2xl font-medium tracking-[-0.01em] text-foreground tabular-nums sm:text-[28px]",
        className
      )}
    >
      {formatCurrency(amount, currency)}
    </span>
  );
}

/** "≈ ₨840,910.64 at 1 USD = ₨150.49" — uses the API's converted figure as-is */
export function NprEquivalent({
  nprAmount,
  currency,
  rate,
  className,
}: {
  nprAmount?: number | null;
  currency: string;
  rate?: number | null;
  className?: string;
}) {
  if (currency === "NPR" || !rate || nprAmount == null) return null;
  return (
    <p className={cn("text-xs text-faint", className)}>
      ≈ <span className="text-muted-foreground">{formatCurrency(nprAmount, "NPR")}</span> at 1{" "}
      {currency} = {formatCurrency(rate, "NPR")}
    </p>
  );
}
