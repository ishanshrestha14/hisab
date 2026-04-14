import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { DollarSign, TrendingUp, Clock, AlertCircle, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

interface DashboardStats {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  totalPaidNPR: number;
  nprRates: Record<string, number>;
  recentInvoices: {
    id: string;
    number: string;
    status: string;
    currency: string;
    total: number;
    dueDate: string;
    clientName: string;
  }[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

function greeting(name: string) {
  const hour = new Date().getHours();
  const salutation =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0];
  return `${salutation}, ${first}`;
}

function StatSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-5">
      <div className="flex items-center justify-between sm:justify-start sm:gap-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted sm:hidden" />
      </div>
      <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted hidden sm:block" />
      <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/api/dashboard/stats"),
  });

  const stats = [
    {
      label: "Invoiced",
      value: data ? formatCurrency(data.totalInvoiced, "USD") : "—",
      icon: DollarSign,
      color: "text-brand",
      bg: "bg-brand/10",
    },
    {
      label: "Collected",
      value: data ? formatCurrency(data.totalPaid, "USD") : "—",
      sub: data?.totalPaidNPR
        ? `≈ ${formatCurrency(data.totalPaidNPR, "NPR")}`
        : undefined,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      label: "Outstanding",
      value: data ? formatCurrency(data.totalOutstanding, "USD") : "—",
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label: "Overdue",
      value: data ? String(data.overdueCount) : "—",
      icon: AlertCircle,
      color: data?.overdueCount ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
      bg: data?.overdueCount ? "bg-red-100 dark:bg-red-900/20" : "bg-muted",
    },
  ];

  return (
    <div className="p-4 sm:p-8 animate-in-up">
      {/* Header — button always pinned right */}
      <div className="mb-5 sm:mb-8 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground sm:text-2xl">
            {session?.user.name ? greeting(session.user.name) : "Dashboard"}
          </h1>
          <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
            Here's what's happening with your invoices
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-600 active:scale-[0.98]"
        >
          <FileText size={14} />
          <span className="hidden xs:inline sm:inline">New invoice</span>
          <span className="xs:hidden sm:hidden">New</span>
        </Link>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          Failed to load dashboard data. Please refresh to try again.
        </div>
      )}

      {/* Stats cards — 2×2 on mobile, 4 across on desktop */}
      <div className="mb-5 sm:mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="flex flex-col rounded-lg border border-border bg-card p-3 transition-shadow duration-150 hover:shadow-sm sm:p-5"
              >
                {/* Icon + label row */}
                <div className="flex items-center gap-2">
                  <div className={`rounded-md p-1.5 sm:p-2 ${bg}`}>
                    <Icon size={14} className={`${color} sm:h-4 sm:w-4`} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
                </div>
                {/* Value */}
                <p className="mt-2 text-base font-semibold text-foreground sm:mt-3 sm:text-2xl">
                  {value}
                </p>
                {/* Sub (NPR equivalent) — hidden on mobile, shown on desktop */}
                {sub && (
                  <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{sub}</p>
                )}
              </div>
            ))}
      </div>

      {/* NPR rates strip */}
      {data?.nprRates && Object.keys(data.nprRates).length > 0 && (
        <div className="mb-5 sm:mb-8 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-card px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Today's rates:</span>
          {Object.entries(data.nprRates).map(([currency, rate]) => (
            <span key={currency} className="text-xs text-foreground">
              1 {currency}{" "}
              <span className="font-semibold text-brand">= ₨{rate.toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Recent invoices */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-sm font-medium text-foreground sm:text-base">Recent Invoices</h2>
          <Link
            to="/invoices"
            className="text-xs text-muted-foreground transition-colors hover:text-brand"
          >
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4 sm:p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !data?.recentInvoices.length ? (
          <div className="flex flex-col items-center py-10 sm:py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No invoices yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first invoice to get started
            </p>
            <Link
              to="/invoices/new"
              className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              Create invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="divide-y divide-border sm:hidden">
              {data.recentInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{inv.number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? ""}`}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{inv.clientName}</p>
                    </div>
                    <span className="ml-3 shrink-0 text-sm font-semibold text-foreground">
                      {formatCurrency(inv.total, inv.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Due</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 transition-colors duration-100 hover:bg-accent/50"
                    >
                      <td className="px-6 py-3 font-medium text-foreground">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="hover:text-brand hover:underline"
                        >
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{inv.clientName}</td>
                      <td className="px-6 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? ""}`}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {new Date(inv.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-foreground">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
