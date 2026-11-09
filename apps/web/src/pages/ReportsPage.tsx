import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Select } from "@/components/ui/field";
import { EmptyState, Page, PageHeader, Panel, PanelHeader, Skeleton } from "@/components/ui/layout";
import { Table, THead, Th, Td, Tr } from "@/components/ui/table";

interface FYReport {
  fy: string;
  fyStartBS: number;
  period: { start: string; end: string };
  summary: {
    totalPaidNPR: number;
    totalInvoicedNPR: number;
    totalOutstandingNPR: number;
    tdsWithheldNPR: number;
    invoiceCount: number;
    paidCount: number;
  };
  byCurrency: {
    currency: string;
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    tdsWithheld: number;
  }[];
  byClient: {
    clientId: string;
    clientName: string;
    currencies: string[];
    totalInvoicedNPR: number;
    totalPaidNPR: number;
    invoiceCount: number;
  }[];
  availableFYs: number[];
  nprRates: Record<string, number>;
}

function Figure({ label, value, detail, emphasis }: { label: string; value: string; detail?: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 truncate text-xl font-medium tabular-nums text-foreground sm:text-2xl",
          emphasis && "text-brand-ink"
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-faint">{detail}</p>}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function ReportsPage() {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);

  const { data, isLoading } = useQuery<FYReport>({
    queryKey: ["fiscal-year-report", selectedFY],
    queryFn: () => api.get(selectedFY ? `/api/reports/fiscal-year?fy=${selectedFY}` : "/api/reports/fiscal-year"),
  });

  const availableFYs = data?.availableFYs ?? [];
  const hasData = (data?.summary.invoiceCount ?? 0) > 0;
  const ratesMissing = !!data?.byCurrency.some((r) => r.currency !== "NPR" && !data.nprRates[r.currency]);
  const npr = (n: number) => (ratesMissing ? "—" : formatCurrency(n, "NPR"));
  const topClient = Math.max(1, ...(data?.byClient.map((c) => c.totalInvoicedNPR) ?? [1]));

  return (
    <Page>
      <PageHeader
        title={data ? `Fiscal year ${data.fy}` : "Fiscal year"}
        description={
          data
            ? `${formatDate(data.period.start, "long")} – ${formatDate(data.period.end, "long")}, Shrawan to Ashad`
            : "Revenue by Nepal fiscal year, Shrawan to Ashad"
        }
        actions={
          <>
            <label htmlFor="fy" className="sr-only">
              Fiscal year
            </label>
            <Select
              id="fy"
              className="w-auto"
              value={selectedFY ?? data?.fyStartBS ?? ""}
              onChange={(e) => setSelectedFY(Number(e.target.value))}
            >
              {availableFYs.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}/{String(fy + 1).slice(-2)} BS
                </option>
              ))}
            </Select>
          </>
        }
      />

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : !hasData ? (
        <Panel>
          <EmptyState
            icon={BarChart2}
            title="No invoices in this fiscal year"
            description={
              data
                ? `Invoices issued between ${formatDate(data.period.start, "long")} and ${formatDate(data.period.end, "long")} appear here`
                : undefined
            }
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {/* The year in four figures, all in NPR */}
          <Panel>
            <div className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-border lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-border lg:[&>*:nth-child(odd)]:border-r-0">
              <Figure
                label="Collected"
                emphasis
                value={npr(data!.summary.totalPaidNPR)}
                detail={plural(data!.summary.paidCount, "paid invoice")}
              />
              <Figure
                label="Invoiced"
                value={npr(data!.summary.totalInvoicedNPR)}
                detail={plural(data!.summary.invoiceCount, "invoice")}
              />
              <Figure
                label="Outstanding"
                value={npr(data!.summary.totalOutstandingNPR)}
                detail="Sent and overdue"
              />
              <Figure
                label="TDS withheld"
                value={data!.summary.tdsWithheldNPR > 0 ? npr(data!.summary.tdsWithheldNPR) : "—"}
                detail={data!.summary.tdsWithheldNPR > 0 ? "Deposited with IRD by clients" : "None on paid invoices"}
              />
            </div>
          </Panel>
          <p className="-mt-4 text-xs text-faint">
            {ratesMissing
              ? "Today's exchange rates are unavailable, so NPR totals are hidden. Per-currency figures below are exact."
              : "Foreign-currency amounts converted to NPR at today's rates"}
          </p>

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* By client: a ranked list with thin bars */}
            <Panel>
              <PanelHeader title="By client" description="Invoiced in NPR; the filled part has been collected" />
              <ol className="divide-y divide-border">
                {data!.byClient.map((row) => {
                  const invoicedPct = (row.totalInvoicedNPR / topClient) * 100;
                  const paidPct = (row.totalPaidNPR / topClient) * 100;
                  return (
                    <li key={row.clientId} className="px-4 py-3.5 sm:px-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate text-sm text-foreground">
                          {row.clientName}
                          <span className="ml-2 text-xs text-faint">
                            {plural(row.invoiceCount, "invoice")} · {row.currencies.join(", ")}
                          </span>
                        </p>
                        <p className="shrink-0 text-sm tabular-nums text-foreground">{npr(row.totalInvoicedNPR)}</p>
                      </div>
                      <div className="relative mt-2 h-1 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
                        <div className="absolute inset-y-0 left-0 bg-foreground/15" style={{ width: `${invoicedPct}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${paidPct}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs tabular-nums text-faint">
                        {npr(row.totalPaidNPR)} collected
                      </p>
                    </li>
                  );
                })}
              </ol>
            </Panel>

            {/* By currency: exact amounts, no conversion */}
            <Panel>
              <PanelHeader title="By currency" description="Exact amounts in each invoice currency" />
              <Table>
                <THead>
                  <Th>Currency</Th>
                  <Th align="right">Invoiced</Th>
                  <Th align="right">Collected</Th>
                </THead>
                <tbody>
                  {data!.byCurrency.map((row) => {
                    const rate = row.totalInvoiced > 0 ? Math.round((row.totalPaid / row.totalInvoiced) * 100) : 0;
                    return (
                      <Tr key={row.currency}>
                        <Td className="text-foreground">
                          {row.currency}
                          {row.currency !== "NPR" && data!.nprRates[row.currency] ? (
                            <span className="block text-xs text-faint">
                              1 = {formatCurrency(data!.nprRates[row.currency], "NPR")}
                            </span>
                          ) : null}
                        </Td>
                        <Td align="right" className="text-foreground">
                          {formatCurrency(row.totalInvoiced, row.currency)}
                          {row.totalOutstanding > 0 && (
                            <span className="block text-xs text-faint">
                              {formatCurrency(row.totalOutstanding, row.currency)} open
                            </span>
                          )}
                        </Td>
                        <Td align="right" className="text-foreground">
                          {formatCurrency(row.totalPaid, row.currency)}
                          <span className="block text-xs text-faint">{rate}%</span>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Panel>
          </div>
        </div>
      )}
    </Page>
  );
}
