import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, FileText, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatementPDF, type StatementInvoice } from "@/components/StatementPDF";
import { useSession } from "@/lib/auth-client";
import { StatusBadge } from "@/components/ui/status";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Page, PageHeader, Panel, PanelHeader, Skeleton } from "@/components/ui/layout";
import { Money, TotalFigure } from "@/components/ui/money";
import { Table, THead, Th, Td, Tr } from "@/components/ui/table";

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

type Totals = { invoiced: number; paid: number; outstanding: number };

/** Same rule as the API summary, split by currency so amounts never mix */
function totalsByCurrency(invoices: StatementInvoice[]): [string, Totals][] {
  const map = new Map<string, Totals>();
  for (const inv of invoices) {
    const t = map.get(inv.currency) ?? { invoiced: 0, paid: 0, outstanding: 0 };
    t.invoiced += inv.total;
    if (inv.status === "PAID") t.paid += inv.total;
    else if (inv.status === "SENT" || inv.status === "OVERDUE") t.outstanding += inv.total;
    map.set(inv.currency, t);
  }
  return [...map.entries()];
}

function Amounts({ rows, field }: { rows: [string, Totals][]; field: keyof Totals }) {
  return (
    <span className="tabular-nums">
      {rows.map(([cur, t], i) => (
        <span key={cur} className="block first:inline sm:inline">
          {i > 0 && <span className="hidden px-1.5 text-faint sm:inline">+</span>}
          {formatCurrency(t[field], cur)}
        </span>
      ))}
    </span>
  );
}

export default function ClientStatementPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const { data, isLoading } = useQuery<StatementData>({
    queryKey: ["client-statement", id],
    queryFn: () => api.get(`/api/clients/${id}/statement`),
  });


  const generatedAt = new Date().toISOString();

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="mb-8 h-8 w-56" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        <EmptyState
          icon={UserX}
          title="Client not found"
          action={
            <Link to="/clients" className={buttonVariants()}>
              Back to clients
            </Link>
          }
        />
      </Page>
    );
  }

  const { client, invoices, summary } = data;
  const rows = totalsByCurrency(invoices);
  const hasTds = invoices.some((i) => i.tdsPercent > 0);
  const settled = rows.every(([, t]) => t.outstanding === 0);

  return (
    <Page>
      <PageHeader
        back={{ to: "/clients", label: "Clients" }}
        title={client.name}
        description={[client.company, client.email, client.country].filter(Boolean).join(" · ")}
        actions={
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
            className={buttonVariants()}
          >
            <Download size={14} />
            Statement PDF
          </PDFDownloadLink>
        }
      />

      <Panel>
        <PanelHeader
          title="Statement of account"
          description={`${summary.invoiceCount} invoice${summary.invoiceCount === 1 ? "" : "s"}, ${summary.paidCount} paid · as of ${formatDate(generatedAt, "long")}`}
        />

        {invoices.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices yet" description="Invoices issued to this client appear here" />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Invoice</Th>
                <Th className="hidden sm:table-cell">Issued</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th align="right">Amount</Th>
                {hasTds && <Th align="right" className="hidden md:table-cell">TDS</Th>}
                {hasTds && <Th align="right">Net</Th>}
              </THead>
              <tbody>
                {invoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td className="text-foreground">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.number}
                      </Link>
                    </Td>
                    <Td className="hidden whitespace-nowrap sm:table-cell">{formatDate(inv.issueDate)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(inv.dueDate)}</Td>
                    <Td>
                      <StatusBadge status={inv.status} />
                    </Td>
                    <Td align="right" className="text-foreground">
                      <Money amount={inv.total} currency={inv.currency} />
                    </Td>
                    {hasTds && (
                      <Td align="right" className="hidden md:table-cell">
                        {inv.tdsPercent > 0 ? (
                          <Money amount={inv.tdsAmount} currency={inv.currency} signed="minus" />
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>
                    )}
                    {hasTds && (
                      <Td align="right" className="text-foreground">
                        <Money amount={inv.tdsPercent > 0 ? inv.netReceivable : inv.total} currency={inv.currency} />
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Table>

            {/* Closing figures */}
            <div className="flex justify-end border-t border-border px-4 py-5 sm:px-5">
              <dl className="w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between gap-4 text-muted-foreground">
                  <dt>Invoiced</dt>
                  <dd className="text-right">
                    <Amounts rows={rows} field="invoiced" />
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-muted-foreground">
                  <dt>Paid</dt>
                  <dd className="text-right">
                    <Amounts rows={rows} field="paid" />
                  </dd>
                </div>
                <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
                  <dt className="pb-1 text-foreground">Balance due</dt>
                  <dd className="text-right">
                    {settled ? (
                      <span className="text-positive">Settled</span>
                    ) : rows.length === 1 ? (
                      <TotalFigure amount={rows[0][1].outstanding} currency={rows[0][0]} />
                    ) : (
                      <span className="double-rule inline-block text-lg font-medium text-foreground">
                        <Amounts rows={rows.filter(([, t]) => t.outstanding > 0)} field="outstanding" />
                      </span>
                    )}
                  </dd>
                </div>
                {hasTds && <p className="pt-1 text-right text-xs text-faint">Amounts are gross, before TDS</p>}
              </dl>
            </div>
          </>
        )}
      </Panel>
    </Page>
  );
}
