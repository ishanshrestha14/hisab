import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CheckCircle, Download } from "lucide-react";
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

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [paid, setPaid] = useState(false);

  const { data: invoice, isLoading, error } = useQuery<PortalInvoice>({
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
        throw new Error((err as { error?: string }).error ?? "Failed to mark as paid");
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Invoice not found</p>
          <p className="mt-1 text-sm text-gray-500">
            This link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = paid || invoice.status === "PAID";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white text-2xl font-bold">
            ह
          </div>
          <p className="text-sm text-gray-500">हिसाब Hisab — Invoice</p>
        </div>

        {/* Paid banner */}
        {isPaid && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <CheckCircle size={20} className="text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">
              This invoice has been marked as paid. Thank you!
            </p>
          </div>
        )}

        {/* Invoice card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Invoice header */}
          <div className="flex items-start justify-between border-b border-gray-100 px-8 py-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Invoice</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{invoice.number}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[invoice.status] ?? ""}`}>
              {invoice.status}
            </span>
          </div>

          {/* From / To / Dates */}
          <div className="grid grid-cols-3 gap-6 border-b border-gray-100 px-8 py-6">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">From</p>
              <p className="font-medium text-gray-900">{invoice.freelancer.name}</p>
              <p className="text-sm text-gray-500">{invoice.freelancer.email}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Bill To</p>
              <p className="font-medium text-gray-900">{invoice.client.name}</p>
              {invoice.client.company && (
                <p className="text-sm text-gray-500">{invoice.client.company}</p>
              )}
              <p className="text-sm text-gray-500">{invoice.client.email}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Issue Date</p>
              <p className="text-sm text-gray-700">
                {new Date(invoice.issueDate).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </p>
              <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-gray-400">Due Date</p>
              <p className="text-sm text-gray-700">
                {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Line items */}
          <div className="px-8 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 text-gray-700">{item.description}</td>
                    <td className="py-3 text-right text-gray-500">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-500">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="mt-4 flex flex-col items-end gap-1">
              <div className="flex items-center gap-8">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              {invoice.nprTotal && invoice.nprRate && (
                <p className="text-xs text-gray-400">
                  ≈ {formatCurrency(invoice.nprTotal, "NPR")} at 1 {invoice.currency} = ₨{invoice.nprRate.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-gray-100 px-8 py-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Notes</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-gray-100 px-8 py-5">
            <PDFDownloadLink
              document={<InvoicePDF {...invoice} />}
              fileName={`${invoice.number}.pdf`}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} />
              Download PDF
            </PDFDownloadLink>

            {!isPaid && (
              <button
                onClick={() => markPaid.mutate()}
                disabled={markPaid.isPending}
                className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {markPaid.isPending ? "Confirming…" : "Mark as Paid"}
              </button>
            )}
          </div>
        </div>

        {markPaid.error && (
          <p className="mt-3 text-center text-sm text-red-600">
            {markPaid.error.message}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          Powered by{" "}
          <span className="font-medium text-amber-500">हिसाब Hisab</span> —
          open-source invoicing for Nepali freelancers
        </p>
      </div>
    </div>
  );
}
