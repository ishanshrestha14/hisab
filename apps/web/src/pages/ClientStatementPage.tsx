import { useParams, useNavigate, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ArrowLeft, Download, FileText, TrendingUp, Clock, DollarSign } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { StatementPDF, type StatementInvoice } from "@/components/StatementPDF";
import { useSession } from "@/lib/auth-client";

interface StatementData {
  client: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    country: string | null;
    defaultCurrency: string;
  };
  invoices: StatementInvoice[];
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
    paidCount: number;
  };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:   "bg-muted text-muted-foreground",
  SENT:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAID:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", PAID: "Paid", OVERDUE: "Overdue",
};

function StatCard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
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

export default function ClientStatementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession();

  const { data, isLoading } = useQuery<StatementData>({
    queryKey: ["client-statement", id],
    queryFn: () => api.get(`/api/clients/${id}/statement`),
  });

  const currencies = data
    ? [...new Set(data.invoices.map((i) => i.currency))]
    : [];
  const isMixed = currencies.length > 1;
  const currency = currencies[0] ?? "USD";

  const generatedAt = new Date().toISOString();

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-8">
        <p className="font-medium text-foreground">Client not found</p>
        <button onClick={() => navigate("/clients")} className="mt-4 text-sm text-brand hover:underline">
          Back to clients
        </button>
      </div>
    );
  }

  const { client, invoices, summary } = data;

  return (
    <div className="p-8 animate-in-up">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate("/clients")}
          className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to clients
        </button>

        <PDFDownloadLink
          document={
            <StatementPDF
              client={client}
              freelancer={{
                name: session?.user.name ?? "",
                email: session?.user.email ?? "",
              }}
              invoices={invoices}
              summary={summary}
              generatedAt={generatedAt}
            />
          }
          fileName={`statement-${client.name.toLowerCase().replace(/\s+/g, "-")}.pdf`}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent active:scale-[0.98]"
        >
          <Download size={14} />
          Download PDF
        </PDFDownloadLink>
      </div>

      {/* Client header */}
      <div className="mb-6 rounded-lg border border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{client.name}</h1>
            {client.company && (
              <p className="mt-0.5 text-sm text-muted-foreground">{client.company}</p>
            )}
            <p className="mt-0.5 text-sm text-muted-foreground">{client.email}</p>
            {client.country && (
              <p className="mt-0.5 text-xs text-muted-foreground">{client.country}</p>
            )}
          </div>
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {client.defaultCurrency}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Invoiced"
          value={isMixed ? `${summary.invoiceCount} invoices` : formatCurrency(summary.totalInvoiced, currency)}
          sub={`${summary.invoiceCount} invoice${summary.invoiceCount !== 1 ? "s" : ""}`}
          icon={DollarSign}
          color="text-brand"
          bg="bg-brand/10"
        />
        <StatCard
          label="Collected"
          value={isMixed ? `${summary.paidCount} paid` : formatCurrency(summary.totalPaid, currency)}
          sub={`${summary.paidCount} of ${summary.invoiceCount} paid`}
          icon={TrendingUp}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-100 dark:bg-green-900/20"
        />
        <StatCard
          label="Outstanding"
          value={isMixed
            ? `${summary.invoiceCount - summary.paidCount} unpaid`
            : formatCurrency(summary.totalOutstanding, currency)}
          sub={summary.totalOutstanding > 0 ? "Balance due" : "All invoices settled"}
          icon={Clock}
          color={summary.totalOutstanding > 0 ? "text-blue-600 dark:text-blue-400" : "text-green-600"}
          bg={summary.totalOutstanding > 0 ? "bg-blue-100 dark:bg-blue-900/20" : "bg-green-100 dark:bg-green-900/20"}
        />
      </div>

      {/* Invoice table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-medium text-foreground">Invoice History</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No invoices yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Invoices issued to this client will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Issue Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Status</th>
                {isMixed && <th className="px-6 py-3">Currency</th>}
                <th className="px-6 py-3 text-right">Amount</th>
                {invoices.some((i) => i.tdsPercent > 0) && (
                  <th className="px-6 py-3 text-right">TDS</th>
                )}
                {invoices.some((i) => i.tdsPercent > 0) && (
                  <th className="px-6 py-3 text-right">Net</th>
                )}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-accent/50"
                >
                  <td className="px-6 py-3 font-medium text-foreground">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(inv.issueDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(inv.dueDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? ""}`}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </td>
                  {isMixed && (
                    <td className="px-6 py-3 text-muted-foreground">{inv.currency}</td>
                  )}
                  <td className="px-6 py-3 text-right font-medium text-foreground">
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                  {invoices.some((i) => i.tdsPercent > 0) && (
                    <td className="px-6 py-3 text-right text-red-500">
                      {inv.tdsPercent > 0
                        ? `−${formatCurrency(inv.tdsAmount, inv.currency)}`
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                  {invoices.some((i) => i.tdsPercent > 0) && (
                    <td className="px-6 py-3 text-right font-medium text-foreground">
                      {inv.tdsPercent > 0
                        ? formatCurrency(inv.netReceivable, inv.currency)
                        : formatCurrency(inv.total, inv.currency)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Balance due footer */}
        {invoices.length > 0 && (
          <div className="flex items-center justify-end gap-4 border-t border-border px-6 py-4">
            <span className="text-sm text-muted-foreground">Balance Due</span>
            <span className={`text-lg font-bold ${summary.totalOutstanding > 0 ? "text-foreground" : "text-green-600 dark:text-green-400"}`}>
              {isMixed
                ? summary.totalOutstanding > 0 ? "See above" : "Nil"
                : formatCurrency(summary.totalOutstanding, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
