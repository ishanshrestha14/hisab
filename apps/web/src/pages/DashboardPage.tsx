import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { AlertCircle, ArrowRight, FileText, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Page, PageHeader, Panel, PanelHeader, Skeleton, TableSkeleton } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { Table, THead, Th, Td, Tr } from "@/components/ui/table";

interface CurrencyTotals {
  currency: string;
  invoiced: number;
  collected: number;
  outstanding: number;
}

interface DashboardStats {
  overdueCount: number;
  totalPaidNPR: number;
  totalOutstandingNPR: number;
  totalInvoicedNPR: number;
  byCurrency: CurrencyTotals[];
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

function Stat({
  label,
  value,
  detail,
  emphasis,
  to,
  className,
}: {
  className?: string;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  emphasis?: boolean;
  to?: string;
}) {
  const body = (
    <>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-medium tracking-[-0.01em] tabular-nums text-foreground sm:text-[28px] sm:leading-9",
          emphasis && "text-brand-ink"
        )}
      >
        {value}
      </p>
      {detail && <div className="mt-1.5 text-xs text-faint">{detail}</div>}
    </>
  );
  const cls = cn("block min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5", className);
  return to ? (
    <Link to={to} className={cn(cls, "transition-colors hover:border-input hover:bg-muted/30")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-36" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

/** Lists each currency's amount for a stat, e.g. "$3,200.00 · £1,850.00" */
function PerCurrency({ rows, field }: { rows: CurrencyTotals[]; field: "collected" | "outstanding" }) {
  const nonZero = rows.filter((r) => r[field] > 0);
  if (nonZero.length === 0) return <span>Nothing yet</span>;
  return (
    <span className="tabular-nums">
      {nonZero.map((r, i) => (
        <span key={r.currency}>
          {i > 0 && <span className="px-1">·</span>}
          {formatCurrency(r[field], r.currency)}
        </span>
      ))}
    </span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/api/dashboard/stats"),
  });

  const rows = data?.byCurrency ?? [];
  // NPR totals are only meaningful when every foreign currency has a rate
  const ratesMissing = rows.some((r) => r.currency !== "NPR" && !data?.nprRates[r.currency]);
  const npr = (amount: number) => (ratesMissing ? "—" : formatCurrency(amount, "NPR"));

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        description="All invoices to date, converted to NPR at today's rates"
        actions={
          <Link to="/invoices/new" className={buttonVariants({ variant: "primary" })}>
            <Plus size={16} />
            New invoice
          </Link>
        }
      />

      {isError && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle size={16} className="shrink-0" />
          Couldn't load the dashboard. Refresh to try again.
        </div>
      )}

      {/* Figures: what's owed leads, then what's in, then what needs chasing */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr]">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={i === 0 ? "col-span-2 lg:col-span-1" : undefined}>
              <StatSkeleton />
            </div>
          ))
        ) : (
          <>
            <Stat
              className="col-span-2 lg:col-span-1"
              label="Outstanding"
              emphasis
              value={npr(data?.totalOutstandingNPR ?? 0)}
              detail={<PerCurrency rows={rows} field="outstanding" />}
            />
            <Stat
              label="Collected"
              value={npr(data?.totalPaidNPR ?? 0)}
              detail={<PerCurrency rows={rows} field="collected" />}
            />
            <Stat
              label="Overdue"
              value={data?.overdueCount ?? 0}
              to={data?.overdueCount ? "/invoices?status=OVERDUE" : undefined}
              detail={
                data?.overdueCount ? (
                  <span className="inline-flex items-center gap-1 text-negative">
                    {data.overdueCount === 1 ? "1 invoice past due" : `${data.overdueCount} invoices past due`}
                    <ArrowRight size={12} />
                  </span>
                ) : (
                  "Nothing past due"
                )
              }
            />
          </>
        )}
      </div>
      {ratesMissing && !isLoading && (
        <p className="mt-2 text-xs text-faint">
          Today's exchange rates are unavailable, so NPR totals are hidden. Per-currency amounts are exact.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Recent invoices */}
        <Panel className="self-start">
          <PanelHeader
            title="Recent invoices"
            actions={
              <Link
                to="/invoices"
                className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                All invoices
                <ArrowRight size={13} />
              </Link>
            }
          />
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data?.recentInvoices.length ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Bill a client in USD, GBP, EUR or NPR. Totals here update as invoices are sent and paid."
              action={
                <Link to="/invoices/new" className={buttonVariants({ variant: "primary" })}>
                  New invoice
                </Link>
              }
            />
          ) : (
            <>
              {/* Mobile list */}
              <ul className="divide-y divide-border sm:hidden">
                {data.recentInvoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{inv.clientName}</p>
                        <p className="mt-0.5 text-xs text-faint">
                          {inv.number} · due {formatDate(inv.dueDate)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Money amount={inv.total} currency={inv.currency} className="text-sm font-medium text-foreground" />
                        <StatusBadge status={inv.status} className="mt-0.5 flex justify-end text-xs" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <Th>Invoice</Th>
                    <Th>Client</Th>
                    <Th>Status</Th>
                    <Th>Due</Th>
                    <Th align="right">Amount</Th>
                  </THead>
                  <tbody>
                    {data.recentInvoices.map((inv) => (
                      <Tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                        <Td className="text-foreground">
                          <Link to={`/invoices/${inv.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                            {inv.number}
                          </Link>
                        </Td>
                        <Td className="max-w-[220px] truncate">{inv.clientName}</Td>
                        <Td>
                          <StatusBadge status={inv.status} />
                        </Td>
                        <Td className="whitespace-nowrap">{formatDate(inv.dueDate)}</Td>
                        <Td align="right" className="font-medium text-foreground">
                          <Money amount={inv.total} currency={inv.currency} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Panel>

        {/* The ledger by currency, with today's rate */}
        <Panel className="self-start">
          <PanelHeader title="By currency" description="Today's rates from open.er-api.com" />
          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-faint">Totals appear after your first invoice</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const rate = data?.nprRates[r.currency];
                return (
                  <li key={r.currency} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{r.currency}</span>
                      <span className="text-xs text-faint">
                        {r.currency === "NPR" ? "Base currency" : rate ? `1 ${r.currency} = ${formatCurrency(rate, "NPR")}` : "Rate unavailable"}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      {(
                        [
                          ["Invoiced", r.invoiced],
                          ["Collected", r.collected],
                          ["Outstanding", r.outstanding],
                        ] as const
                      ).map(([label, amount]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-faint">{label}</dt>
                          <dd className="mt-0.5 truncate text-[13px] tabular-nums text-foreground">
                            {formatCurrency(amount, r.currency)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  );
}
