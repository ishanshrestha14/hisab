import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, ArrowRightLeft, Trash2, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface QuoteDetail {
  id: string;
  number: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "CONVERTED";
  currency: string;
  issueDate: string;
  expiryDate: string;
  notes?: string | null;
  total: number;
  invoiceId?: string | null;
  client: { name: string; email: string; company?: string | null; country?: string | null };
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DECLINED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CONVERTED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CONVERTED: "Converted to Invoice",
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: quote, isLoading } = useQuery<QuoteDetail>({
    queryKey: ["quote", id],
    queryFn: () => api.get(`/api/quotes/${id}`),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/api/quotes/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote status updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update status"),
  });

  const convert = useMutation({
    mutationFn: () => api.post<{ invoiceId: string; invoiceNumber: string }>(`/api/quotes/${id}/convert`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Converted to invoice ${data.invoiceNumber}`);
      navigate(`/invoices/${data.invoiceId}`);
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to convert quote"),
  });

  const deleteQuote = useMutation({
    mutationFn: () => api.delete(`/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote deleted");
      navigate("/quotes");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete quote"),
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle size={20} className="text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Quote not found</p>
        <button
          onClick={() => navigate("/quotes")}
          className="mt-4 cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Back to quotes
        </button>
      </div>
    );
  }

  const isConverted = quote.status === "CONVERTED";
  const canConvert = quote.status === "ACCEPTED" || quote.status === "SENT";

  return (
    <div className="p-4 sm:p-8 animate-in-up">
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/quotes")}
          className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to quotes
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {quote.status === "DRAFT" && (
            <button
              onClick={() => updateStatus.mutate("SENT")}
              disabled={updateStatus.isPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent active:scale-[0.98] disabled:opacity-60"
            >
              <Send size={13} />
              Mark as Sent
            </button>
          )}

          {quote.status === "SENT" && (
            <>
              <button
                onClick={() => updateStatus.mutate("ACCEPTED")}
                disabled={updateStatus.isPending}
                className="flex cursor-pointer items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-700 active:scale-[0.98] disabled:opacity-60"
              >
                <CheckCircle size={13} />
                Mark Accepted
              </button>
              <button
                onClick={() => updateStatus.mutate("DECLINED")}
                disabled={updateStatus.isPending}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent active:scale-[0.98] disabled:opacity-60"
              >
                <XCircle size={13} />
                Mark Declined
              </button>
            </>
          )}

          {canConvert && (
            <button
              onClick={() => convert.mutate()}
              disabled={convert.isPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
            >
              {convert.isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <ArrowRightLeft size={13} />
              )}
              Convert to Invoice
            </button>
          )}

          {isConverted && quote.invoiceId && (
            <button
              onClick={() => navigate(`/invoices/${quote.invoiceId}`)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent"
            >
              <ArrowRightLeft size={13} />
              View Invoice
            </button>
          )}

          {!isConverted && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Delete this quote?</span>
                <button
                  onClick={() => deleteQuote.mutate()}
                  disabled={deleteQuote.isPending}
                  className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-60"
                >
                  {deleteQuote.isPending ? "Deleting…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:border-destructive hover:text-destructive"
              >
                <Trash2 size={13} />
                Delete
              </button>
            )
          )}
        </div>
      </div>

      {/* Quote card */}
      <div className="rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-8 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quote</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{quote.number}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[quote.status] ?? ""}`}>
            {STATUS_LABEL[quote.status] ?? quote.status}
          </span>
        </div>

        {/* Bill To / Dates */}
        <div className="grid grid-cols-1 gap-6 border-b border-border px-4 py-6 sm:grid-cols-3 sm:px-8">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Bill To</p>
            <p className="font-medium text-foreground">{quote.client.name}</p>
            {quote.client.company && <p className="text-sm text-muted-foreground">{quote.client.company}</p>}
            <p className="text-sm text-muted-foreground">{quote.client.email}</p>
          </div>
          <div />
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Issue Date</p>
            <p className="text-sm text-foreground">
              {new Date(quote.issueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Expiry Date</p>
            <p className="text-sm text-foreground">
              {new Date(quote.expiryDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto px-4 py-6 sm:px-8">
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
              {quote.lineItems.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-3 text-foreground">{item.description}</td>
                  <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="py-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice, quote.currency)}</td>
                  <td className="py-3 text-right font-medium text-foreground">{formatCurrency(item.total, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex flex-col items-end gap-1.5">
            <div className="flex items-baseline gap-8">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-3xl font-bold text-foreground">
                {formatCurrency(quote.total, quote.currency)}
              </span>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="border-t border-border px-4 py-5 sm:px-8">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="text-sm text-foreground">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
