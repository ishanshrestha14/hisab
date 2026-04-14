import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, TrendingUp, Clock, DollarSign, Landmark } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface FYReport {
  fy: string;
  fyStartBS: number;
  period: { start: string; end: string };
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalPaidNPR: number;
    invoiceCount: number;
    paidCount: number;
    tdsWithheld: number;
  };
  byCurrency: {
    currency: string;
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
  }[];
  byClient: {
    clientId: string;
    clientName: string;
    totalInvoiced: number;
    totalPaid: number;
    invoiceCount: number;
  }[];
  availableFYs: number[];
  nprRates: Record<string, number>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`rounded-md p-2 ${bg}`}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mt-3 h-7 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function ReportsPage() {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);

  const { data, isLoading } = useQuery<FYReport>({
    queryKey: ["fiscal-year-report", selectedFY],
    queryFn: () =>
      api.get(
        selectedFY
          ? `/api/reports/fiscal-year?fy=${selectedFY}`
          : "/api/reports/fiscal-year"
      ),
  });

  // Once we have availableFYs, pre-select current if nothing chosen
  const availableFYs = data?.availableFYs ?? [];

  const hasData = (data?.summary.invoiceCount ?? 0) > 0;

  return (
    <div className="p-4 sm:p-8 animate-in-up">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-brand" />
            <h1 className="text-2xl font-semibold text-foreground">
              Fiscal Year Report
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue summary aligned to the Nepal fiscal year (Shrawan–Ashad)
          </p>
        </div>

        {/* FY selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Fiscal Year
          </label>
          <select
            value={selectedFY ?? data?.fyStartBS ?? ""}
            onChange={(e) => setSelectedFY(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {availableFYs.map((fy) => (
              <option key={fy} value={fy}>
                FY {fy}/{String(fy + 1).slice(-2)} BS
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Period badge */}
      {data && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-sm text-brand">
          <span className="font-semibold">FY {data.fy} BS</span>
          <span className="text-brand/60">·</span>
          <span className="text-muted-foreground">
            {fmt(data.period.start)} — {fmt(data.period.end)}
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Invoiced"
              value={hasData ? formatCurrency(data!.summary.totalInvoiced, "USD") : "—"}
              sub={`${data?.summary.invoiceCount ?? 0} invoice${data?.summary.invoiceCount !== 1 ? "s" : ""}`}
              icon={DollarSign}
              color="text-brand"
              bg="bg-brand/10"
            />
            <StatCard
              label="Collected"
              value={hasData ? formatCurrency(data!.summary.totalPaid, "USD") : "—"}
              sub={
                hasData && data!.summary.totalPaidNPR > 0
                  ? `≈ ${formatCurrency(data!.summary.totalPaidNPR, "NPR")}`
                  : `${data?.summary.paidCount ?? 0} paid`
              }
              icon={TrendingUp}
              color="text-green-600 dark:text-green-400"
              bg="bg-green-100 dark:bg-green-900/20"
            />
            <StatCard
              label="Outstanding"
              value={hasData ? formatCurrency(data!.summary.totalOutstanding, "USD") : "—"}
              sub={
                hasData && data!.summary.invoiceCount > data!.summary.paidCount
                  ? `${data!.summary.invoiceCount - data!.summary.paidCount} unpaid`
                  : undefined
              }
              icon={Clock}
              color="text-blue-600 dark:text-blue-400"
              bg="bg-blue-100 dark:bg-blue-900/20"
            />
            <StatCard
              label="TDS Withheld"
              value={hasData && data!.summary.tdsWithheld > 0
                ? formatCurrency(data!.summary.tdsWithheld, "USD")
                : "—"}
              sub={hasData && data!.summary.tdsWithheld > 0
                ? "Deposited by clients with IRD"
                : "No TDS on paid invoices"}
              icon={Landmark}
              color="text-purple-600 dark:text-purple-400"
              bg="bg-purple-100 dark:bg-purple-900/20"
            />
          </>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && !hasData && (
        <div className="flex flex-col items-center rounded-lg border border-border bg-card py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <BarChart2 size={20} className="text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No invoices in this fiscal year</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invoices issued between {data ? fmt(data.period.start) : "—"} and{" "}
            {data ? fmt(data.period.end) : "—"} will appear here.
          </p>
        </div>
      )}

      {!isLoading && hasData && (
        <div className="space-y-6">
          {/* By Currency */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-medium text-foreground">Breakdown by Currency</h2>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3">Currency</th>
                  <th className="px-6 py-3 text-right">Invoiced</th>
                  <th className="px-6 py-3 text-right">Collected</th>
                  <th className="px-6 py-3 text-right">Outstanding</th>
                  <th className="px-6 py-3 text-right">Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {data!.byCurrency.map((row) => {
                  const rate =
                    row.totalInvoiced > 0
                      ? Math.round((row.totalPaid / row.totalInvoiced) * 100)
                      : 0;
                  return (
                    <tr
                      key={row.currency}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-6 py-3 font-medium text-foreground">
                        {row.currency}
                        {data!.nprRates[row.currency] && row.currency !== "NPR" && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            1 {row.currency} = ₨{data!.nprRates[row.currency].toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-foreground">
                        {formatCurrency(row.totalInvoiced, row.currency)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(row.totalPaid, row.currency)}
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground">
                        {row.totalOutstanding > 0
                          ? formatCurrency(row.totalOutstanding, row.currency)
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>

          {/* By Client */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-medium text-foreground">Breakdown by Client</h2>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3 text-right">Invoices</th>
                  <th className="px-6 py-3 text-right">Invoiced</th>
                  <th className="px-6 py-3 text-right">Collected</th>
                  <th className="px-6 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data!.byClient.map((row) => (
                  <tr
                    key={row.clientId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">
                      {row.clientName}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {row.invoiceCount}
                    </td>
                    <td className="px-6 py-3 text-right text-foreground">
                      {formatCurrency(row.totalInvoiced, "USD")}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-green-600 dark:text-green-400">
                      {row.totalPaid > 0 ? formatCurrency(row.totalPaid, "USD") : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {row.totalInvoiced - row.totalPaid > 0
                        ? formatCurrency(row.totalInvoiced - row.totalPaid, "USD")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            Nepal fiscal year {data!.fy} BS · Currency amounts shown in invoice currency.
            Multi-currency totals are approximate.
          </p>
        </div>
      )}
    </div>
  );
}
