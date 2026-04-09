import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Copy, Check, Download, ArrowLeft, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { InvoicePDF, type InvoicePDFProps } from "@/components/InvoicePDF";

interface InvoiceDetail extends InvoicePDFProps {
  id: string;
  token: string;
  status: string;
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

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: invoice, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ["invoice", id],
    queryFn: () => api.get(`/api/invoices/${id}`),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/invoices/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Invoice marked as paid");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update status");
    },
  });

  const sendInvoice = useMutation({
    mutationFn: () => api.post(`/api/invoices/${id}/send`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice sent to client");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to send invoice");
    },
  });

  function copyPortalLink() {
    if (!invoice) return;
    const url = `${window.location.origin}/portal/${invoice.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Portal link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!invoice || !invoice.freelancer) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle size={20} className="text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Invoice not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This invoice may have been deleted.
        </p>
        <button
          onClick={() => navigate("/invoices")}
          className="mt-4 cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 animate-in-up">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate("/invoices")}
          className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to invoices
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={copyPortalLink}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
              copied
                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "border-border text-foreground hover:bg-accent"
            }`}
          >
            {copied ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy size={14} />
            )}
            {copied ? "Copied!" : "Copy client link"}
          </button>

          <PDFDownloadLink
            document={<InvoicePDF {...invoice} />}
            fileName={`${invoice.number}.pdf`}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-all duration-150 hover:bg-accent active:scale-[0.98]"
          >
            <Download size={14} />
            Download PDF
          </PDFDownloadLink>

          {invoice.status === "DRAFT" && (
            <button
              onClick={() => sendInvoice.mutate()}
              disabled={sendInvoice.isPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendInvoice.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={13} />
                  Send to Client
                </>
              )}
            </button>
          )}

          {invoice.status !== "PAID" && (
            <button
              onClick={() => updateStatus.mutate("PAID")}
              disabled={updateStatus.isPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateStatus.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Updating…
                </>
              ) : (
                "Mark as Paid"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Invoice card */}
      <div className="rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-8 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Invoice
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{invoice.number}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[invoice.status] ?? ""}`}
          >
            {STATUS_LABEL[invoice.status] ?? invoice.status}
          </span>
        </div>

        {/* From / To / Dates */}
        <div className="grid grid-cols-3 gap-6 border-b border-border px-8 py-6">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              From
            </p>
            <p className="font-medium text-foreground">{invoice.freelancer.name}</p>
            <p className="text-sm text-muted-foreground">{invoice.freelancer.email}</p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bill To
            </p>
            <p className="font-medium text-foreground">{invoice.client.name}</p>
            {invoice.client.company && (
              <p className="text-sm text-muted-foreground">{invoice.client.company}</p>
            )}
            <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Issue Date
            </p>
            <p className="text-sm text-foreground">
              {new Date(invoice.issueDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Due Date
            </p>
            <p className="text-sm text-foreground">
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
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Qty</th>
                <th className="pb-3 text-right">Unit Price</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-3 text-foreground">{item.description}</td>
                  <td className="py-3 text-right text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-3 text-right font-medium text-foreground">
                    {formatCurrency(item.total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex flex-col items-end gap-1.5">
            <div className="flex items-baseline gap-8">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-3xl font-bold text-foreground">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
            {invoice.nprTotal && invoice.nprRate && (
              <p className="text-xs text-muted-foreground">
                ≈{" "}
                <span className="font-medium text-brand">
                  {formatCurrency(invoice.nprTotal, "NPR")}
                </span>{" "}
                at 1 {invoice.currency} = ₨{invoice.nprRate.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="border-t border-border px-8 py-5">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </p>
            <p className="text-sm text-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
