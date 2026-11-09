import { cn } from "@/lib/utils";

// Status reads as a dot plus a word, not a filled pill. Colour is reserved for
// states that need attention (overdue, declined) or are settled (paid).
type Tone = "neutral" | "open" | "positive" | "negative" | "done";

const DOT: Record<Tone, string> = {
  neutral: "border border-faint bg-transparent",
  open: "bg-faint",
  positive: "bg-positive",
  negative: "bg-negative",
  done: "bg-foreground/40",
};

const TEXT: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  open: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
  done: "text-muted-foreground",
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // Invoice
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Sent", tone: "open" },
  PAID: { label: "Paid", tone: "positive" },
  OVERDUE: { label: "Overdue", tone: "negative" },
  // Quote
  ACCEPTED: { label: "Accepted", tone: "positive" },
  DECLINED: { label: "Declined", tone: "negative" },
  CONVERTED: { label: "Converted", tone: "done" },
  // Recurring
  ACTIVE: { label: "Active", tone: "positive" },
  PAUSED: { label: "Paused", tone: "neutral" },
};

export function statusLabel(status: string) {
  return STATUS[status]?.label ?? status.charAt(0) + status.slice(1).toLowerCase();
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { label, tone } = STATUS[status] ?? { label: statusLabel(status), tone: "neutral" as Tone };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium",
        TEXT[tone],
        className
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} />
      {label}
    </span>
  );
}

/** A neutral tag for categories (expense category, template name…) */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
