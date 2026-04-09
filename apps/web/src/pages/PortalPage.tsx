import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CheckCircle, Download, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { InvoicePDF, type InvoicePDFProps } from "@/components/InvoicePDF";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface PortalInvoice extends InvoicePDFProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [paid, setPaid] = useState(false);

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery<PortalInvoice>({
    queryKey: ["portal", token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/portal/${token}`);
      if (!res.ok) throw new Error("Invoice not found");
      return res.json();
    },
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/portal/${token}/mark-paid`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Failed to mark as paid"
        );
      }
      return res.json();
    },
    onSuccess: () => {
      setPaid(true);
      queryClient.invalidateQueries({ queryKey: ["portal", token] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <p className="text-lg font-semibold text-slate-900">Invoice not found</p>
          <p className="mt-1 text-sm text-slate-500">
            This link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = paid || invoice.status === "PAID";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white text-2xl font-bold shadow-sm select-none">
            ह
          </div>
          <p className="text-sm font-medium text-slate-400">
            हिसाब Hisab — Invoice
          </p>
        </div>

        {/* Paid success banner */}
        {isPaid && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 animate-in-up">
            <CheckCircle size={20} className="shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                Payment confirmed — thank you!
              </p>
              <p className="text-xs text-green-700">
                The freelancer has been notified.
              </p>
            </div>
          </div>
        )}

        {/* Overdue warning */}
        {invoice.status === "OVERDUE" && !isPaid && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertTriangle size={18} className="shrink-0 text-red-600" />
            <p className="text-sm font-medium text-red-800">
              This invoice is overdue. Please arrange payment at your earliest convenience.
            </p>
          </div>
        )}

        {/* Invoice card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Invoice header */}
          <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Invoice
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {invoice.number}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[invoice.status] ?? ""}`}
            >
              {STATUS_LABEL[invoice.status] ?? invoice.status}
            </span>
          </div>

          {/* From / To / Dates */}
          <div className="grid grid-cols-3 gap-6 border-b border-slate-100 px-8 py-6">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                From
              </p>
              <p className="font-medium text-slate-900">{invoice.freelancer.name}</p>
              <p className="text-sm text-slate-500">{invoice.freelancer.email}</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Bill To
              </p>
              <p className="font-medium text-slate-900">{invoice.client.name}</p>
              {invoice.client.company && (
                <p className="text-sm text-slate-500">{invoice.client.company}</p>
              )}
              <p className="text-sm text-slate-500">{invoice.client.email}</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Issue Date
              </p>
              <p className="text-sm text-slate-700">
                {new Date(invoice.issueDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Due Date
              </p>
              <p className="text-sm text-slate-700">
                {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Line items */}
          <div className="px-8 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 text-slate-700">{item.description}</td>
                    <td className="py-3 text-right text-slate-500">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-500">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-slate-900">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="mt-6 flex flex-col items-end gap-1.5 border-t border-slate-100 pt-5">
              <div className="flex items-baseline gap-8">
                <span className="text-sm font-medium text-slate-500">Total Due</span>
                <span className="text-3xl font-bold text-slate-900">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              {invoice.nprTotal && invoice.nprRate && (
                <p className="text-xs text-slate-400">
                  ≈{" "}
                  <span className="font-semibold text-amber-600">
                    {formatCurrency(invoice.nprTotal, "NPR")}
                  </span>{" "}
                  at 1 {invoice.currency} = ₨{invoice.nprRate.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-slate-100 px-8 py-5">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Notes
              </p>
              <p className="text-sm text-slate-600">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-8 py-5">
            <PDFDownloadLink
              document={<InvoicePDF {...invoice} />}
              fileName={`${invoice.number}.pdf`}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm active:scale-[0.98]"
            >
              <Download size={15} />
              Download PDF
            </PDFDownloadLink>

            {!isPaid && (
              <button
                onClick={() => markPaid.mutate()}
                disabled={markPaid.isPending}
                className="cursor-pointer rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {markPaid.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Confirming…
                  </span>
                ) : (
                  "Mark as Paid"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {markPaid.error && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-red-600">
            <AlertTriangle size={14} />
            {markPaid.error.message}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Powered by{" "}
          <span className="font-semibold text-amber-500">हिसाब Hisab</span> —
          open-source invoicing for Nepali freelancers
        </p>
      </div>
    </div>
  );
}
