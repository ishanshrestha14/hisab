import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

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

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/api/dashboard/stats"),
  });

  const stats = [
    {
      label: "Total Invoiced",
      value: data ? formatCurrency(data.totalInvoiced, "USD") : "—",
      icon: DollarSign,
      color: "text-brand",
      bg: "bg-brand/10",
    },
    {
      label: "Total Paid",
      value: data ? formatCurrency(data.totalPaid, "USD") : "—",
      sub: data?.totalPaidNPR
        ? `≈ ${formatCurrency(data.totalPaidNPR, "NPR")}`
        : undefined,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      label: "Outstanding",
      value: data ? formatCurrency(data.totalOutstanding, "USD") : "—",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label: "Overdue",
      value: data ? String(data.overdueCount) : "—",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your invoicing activity
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <div className={`rounded-md p-2 ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              {isLoading ? (
                <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" />
              ) : (
                value
              )}
            </p>
            {sub && !isLoading && (
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* NPR rates strip */}
      {data?.nprRates && (
        <div className="mb-8 flex flex-wrap gap-4 rounded-lg border border-border bg-card px-6 py-3">
          <span className="text-xs font-medium text-muted-foreground self-center">
            Today's rates (NPR):
          </span>
          {Object.entries(data.nprRates).map(([currency, rate]) => (
            <span key={currency} className="text-xs text-foreground">
              1 {currency} = <span className="font-medium">₨{rate.toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Recent invoices */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-medium text-foreground">Recent Invoices</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !data?.recentInvoices.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No invoices yet.{" "}
            <a href="/invoices/new" className="text-brand hover:underline">
              Create your first invoice
            </a>
          </div>
        ) : (
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
                  className="border-b border-border last:border-0 hover:bg-accent/50"
                >
                  <td className="px-6 py-3 font-medium text-foreground">
                    {inv.number}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {inv.clientName}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? ""}`}
                    >
                      {inv.status}
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
        )}
      </div>
    </div>
  );
}
