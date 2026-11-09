import { formatCurrency, formatDate } from "@/lib/utils";
import { Money, NprEquivalent, TotalFigure } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { Eyebrow } from "@/components/ui/layout";
import type { InvoicePDFProps } from "@/components/InvoicePDF";

/**
 * The invoice as a document: the same figures the PDF carries, laid out like
 * paper. Shared by the freelancer's detail page and the client portal so both
 * always show identical numbers.
 */
export function InvoiceDocument({
  invoice,
  footer,
}: {
  invoice: InvoicePDFProps & { status: string };
  footer?: React.ReactNode;
}) {
  const hasTds = (invoice.tdsPercent ?? 0) > 0;
  const finalAmount = hasTds ? (invoice.netReceivable ?? invoice.total) : invoice.total;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Masthead */}
      <header className="flex items-start justify-between gap-4 px-5 pb-6 pt-6 sm:px-10 sm:pt-10">
        <div>
          <Eyebrow>Invoice</Eyebrow>
          <h1 className="text-2xl font-medium tracking-[-0.01em] text-foreground sm:text-[28px]">
            {invoice.number}
          </h1>
        </div>
        <StatusBadge status={invoice.status} className="mt-1" />
      </header>

      {/* Parties and dates */}
      <div className="grid grid-cols-1 gap-6 border-y border-border px-5 py-6 sm:grid-cols-[1fr_1fr_auto] sm:gap-10 sm:px-10">
        <div className="min-w-0">
          <Eyebrow>From</Eyebrow>
          {invoice.freelancer.name && (
            <p className="text-sm font-medium text-foreground">{invoice.freelancer.name}</p>
          )}
          <p className="break-words text-sm text-muted-foreground">{invoice.freelancer.email}</p>
          {invoice.freelancer.pan && <p className="text-sm text-muted-foreground">PAN {invoice.freelancer.pan}</p>}
          {invoice.freelancer.vatNumber && (
            <p className="text-sm text-muted-foreground">VAT {invoice.freelancer.vatNumber}</p>
          )}
        </div>
        <div className="min-w-0">
          <Eyebrow>Bill to</Eyebrow>
          <p className="text-sm font-medium text-foreground">{invoice.client.name}</p>
          {invoice.client.company && <p className="text-sm text-muted-foreground">{invoice.client.company}</p>}
          <p className="break-words text-sm text-muted-foreground">{invoice.client.email}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-1 sm:text-right">
          <div>
            <dt className="mb-1 text-xs text-faint">Issued</dt>
            <dd className="text-sm text-foreground">{formatDate(invoice.issueDate, "long")}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs text-faint">Due</dt>
            <dd className="text-sm text-foreground">{formatDate(invoice.dueDate, "long")}</dd>
          </div>
        </dl>
      </div>

      {/* Line items: a ruled ledger */}
      <div className="px-5 pt-2 sm:px-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="h-10 font-normal text-faint">
                Description
              </th>
              <th scope="col" className="hidden h-10 w-16 text-right font-normal text-faint sm:table-cell">
                Qty
              </th>
              <th scope="col" className="hidden h-10 w-32 text-right font-normal text-faint sm:table-cell">
                Rate
              </th>
              <th scope="col" className="h-10 w-32 text-right font-normal text-faint">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="py-3 pr-4 text-foreground">
                  {item.description}
                  {/* Qty × rate folds under the description on mobile */}
                  <span className="mt-0.5 block text-xs text-faint sm:hidden">
                    {item.quantity} × {formatCurrency(item.unitPrice, invoice.currency)}
                  </span>
                </td>
                <td className="hidden py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                  {item.quantity}
                </td>
                <td className="hidden py-3 text-right text-muted-foreground sm:table-cell">
                  <Money amount={item.unitPrice} currency={invoice.currency} />
                </td>
                <td className="py-3 text-right text-foreground">
                  <Money amount={item.total} currency={invoice.currency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals, closed with the double rule */}
        <div className="flex justify-end py-6">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            {hasTds && (
              <>
                <div className="flex justify-between gap-4 text-muted-foreground">
                  <dt>Gross amount</dt>
                  <dd>
                    <Money amount={invoice.total} currency={invoice.currency} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-muted-foreground">
                  <dt>TDS withheld ({invoice.tdsPercent}%)</dt>
                  <dd>
                    <Money amount={invoice.tdsAmount ?? 0} currency={invoice.currency} signed="minus" />
                  </dd>
                </div>
              </>
            )}
            <div className={hasTds ? "flex items-end justify-between gap-4 border-t border-border pt-3" : "flex items-end justify-between gap-4"}>
              <dt className="pb-1 text-foreground">{hasTds ? "Net receivable" : "Total due"}</dt>
              <dd>
                <TotalFigure amount={finalAmount} currency={invoice.currency} />
              </dd>
            </div>
            <NprEquivalent
              className="pt-1 text-right"
              nprAmount={invoice.nprTotal}
              currency={invoice.currency}
              rate={invoice.nprRate}
            />
            {hasTds && (
              <p className="pt-1 text-right text-xs text-faint">
                The client deposits the withheld TDS with IRD on the freelancer's behalf
              </p>
            )}
          </dl>
        </div>
      </div>

      {invoice.notes && (
        <div className="border-t border-border px-5 py-5 sm:px-10">
          <Eyebrow>Notes</Eyebrow>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{invoice.notes}</p>
        </div>
      )}

      {footer}
    </article>
  );
}
