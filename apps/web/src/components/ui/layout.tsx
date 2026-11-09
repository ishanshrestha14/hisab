import { Link } from "react-router";
import { ArrowLeft, X, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/** Page wrapper: consistent padding, max width and one entrance */
export function Page({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8 animate-in-up", className)}>
      {children}
    </div>
  );
}

/** Title names the context. Actions sit right, one primary at most. */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-medium tracking-[-0.01em] text-foreground sm:text-[28px] sm:leading-9">
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A bordered surface. Not everything needs one. */
export function Panel({
  className,
  children,
  as: As = "section",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "section" | "div";
}) {
  return (
    <As className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>{children}</As>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-faint">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small label above a value, in sentence case */
export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("mb-1 text-xs text-faint", className)}>{children}</p>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center sm:py-16", className)}>
      {Icon && <Icon size={20} strokeWidth={1.5} className="mb-3 text-faint" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-3.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Modal dialog with a header, body and Escape to close */
export function Modal({
  title,
  onClose,
  children,
  size = "sm",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-in-up sm:rounded-2xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 cursor-pointer rounded-md p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
