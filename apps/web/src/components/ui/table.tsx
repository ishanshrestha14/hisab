import { cn } from "@/lib/utils";

// Data tables: sentence-case header in the secondary colour, 44px rows,
// amounts right-aligned. Wraps in a horizontal scroller on narrow screens.
export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border text-left">{children}</tr>
    </thead>
  );
}

export function Th({
  className,
  align = "left",
  children,
}: {
  className?: string;
  align?: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 whitespace-nowrap px-4 text-[13px] font-normal text-faint first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Tr({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border last:border-0 transition-colors hover:bg-muted/50",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  className,
  align = "left",
  children,
  colSpan,
}: {
  className?: string;
  align?: "left" | "right";
  children?: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "h-11 px-4 text-muted-foreground first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </td>
  );
}

/** Prev / next pager under a list */
export function Pager({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const btn =
    "h-8 cursor-pointer rounded-lg border border-input bg-card px-3 text-[13px] text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav className="mt-4 flex items-center justify-between text-[13px] text-faint" aria-label="Pagination">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className={btn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
