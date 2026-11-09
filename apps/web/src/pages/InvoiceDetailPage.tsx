import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Copy, Check, Download, Send, FileX, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoicePDF, type InvoicePDFProps } from "@/components/InvoicePDF";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EmptyState, Modal, Page, PageHeader, Panel, PanelHeader, Skeleton } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { createPaymentSchema, type CreatePaymentInput } from "@hisab/shared";

interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  notes: string | null;
}

interface InvoiceDetail extends InvoicePDFProps {
  id: string;
  token: string;
  status: string;
  tdsPercent: number;
  tdsAmount: number;
  netReceivable: number;
  amountPaid: number;
  amountDue: number;
  payments: Payment[];
}

function AddPaymentDialog({ invoice, onClose }: { invoice: InvoiceDetail; onClose: () => void }) {
  const queryClient = useQueryClient();
  const remaining = invoice.amountDue;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      amount: remaining > 0 ? Math.round(remaining * 100) / 100 : undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreatePaymentInput) => api.post(`/api/invoices/${invoice.id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Payment recorded");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to record payment");
    },
  });

  return (
    <Modal title="Record payment" onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <Field
          label={`Amount (${invoice.currency})`}
          htmlFor="pay-amount"
          error={errors.amount?.message}
          hint={remaining > 0 ? `Unpaid: ${formatCurrency(remaining, invoice.currency)}` : undefined}
        >
          <Input
            id="pay-amount"
            {...register("amount", { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder={remaining.toFixed(2)}
            aria-invalid={!!errors.amount}
            autoFocus
          />
        </Field>
        <Field label="Date received" htmlFor="pay-date">
          <Input
            id="pay-date"
            {...register("paidAt")}
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </Field>
        <Field label="Notes" htmlFor="pay-notes">
          <Input id="pay-notes" {...register("notes")} placeholder="Bank transfer, ref #1234" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isSubmitting || mutation.isPending}>
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { data: invoice, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ["invoice", id],
    queryFn: () => api.get(`/api/invoices/${id}`),
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

  const deletePayment = useMutation({
    mutationFn: (paymentId: string) =>
      api.delete(`/api/invoices/${id}/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Payment removed");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to remove payment");
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
      <Page>
        <Skeleton className="mb-8 h-8 w-48" />
        <Skeleton className="h-[480px] w-full rounded-xl" />
      </Page>
    );
  }

  if (!invoice || !invoice.freelancer) {
    return (
      <Page>
        <EmptyState
          icon={FileX}
          title="Invoice not found"
          description="It may have been deleted, or it belongs to another account"
          action={
            <Link to="/invoices" className={buttonVariants()}>
              Back to invoices
            </Link>
          }
        />
      </Page>
    );
  }

  const isPaid = invoice.status === "PAID";
  const isDraft = invoice.status === "DRAFT";
  const hasTds = invoice.tdsPercent > 0;

  return (
    <Page>
      <PageHeader
        back={{ to: "/invoices", label: "Invoices" }}
        title={
          <span>
            {invoice.number}
            <span className="ml-3 text-base font-normal text-faint">{invoice.client.name}</span>
          </span>
        }
        actions={
          <>
            <Button onClick={copyPortalLink} aria-live="polite">
              {copied ? <Check size={14} className="text-positive" /> : <Copy size={14} />}
              {copied ? "Link copied" : "Copy client link"}
            </Button>
            <PDFDownloadLink
              document={<InvoicePDF {...invoice} />}
              fileName={`${invoice.number}.pdf`}
              className={buttonVariants()}
            >
              <Download size={14} />
              PDF
            </PDFDownloadLink>
            {/* One primary action, chosen by where the invoice is in its life */}
            {isDraft ? (
              <Button variant="primary" onClick={() => sendInvoice.mutate()} loading={sendInvoice.isPending}>
                {!sendInvoice.isPending && <Send size={14} />}
                Send to client
              </Button>
            ) : (
              !isPaid && (
                <Button variant="primary" onClick={() => setShowPaymentDialog(true)}>
                  <Plus size={16} />
                  Record payment
                </Button>
              )
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <InvoiceDocument invoice={invoice} />

        {/* Payments: what's been received against this invoice */}
        <Panel>
          <PanelHeader
            title="Payments"
            description={isDraft ? "Payments can be recorded once the invoice is sent" : undefined}
          />
          <dl className="space-y-2 border-b border-border px-4 py-4 text-sm sm:px-5">
            {hasTds && (
              <p className="-mt-1 pb-1 text-xs text-faint">
                Settled at the net amount; the client deposits {invoice.tdsPercent}% TDS with IRD
              </p>
            )}
            <div className="flex justify-between gap-4 text-muted-foreground">
              <dt>{hasTds ? "Net receivable" : "Invoice total"}</dt>
              <dd>
                <Money amount={hasTds ? invoice.netReceivable : invoice.total} currency={invoice.currency} />
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-muted-foreground">
              <dt>Received</dt>
              <dd>
                <Money amount={invoice.amountPaid} currency={invoice.currency} />
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2 font-medium text-foreground">
              <dt>Unpaid</dt>
              <dd>
                <Money amount={invoice.amountDue} currency={invoice.currency} />
              </dd>
            </div>
          </dl>

          {invoice.payments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-faint">No payments recorded yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <Money amount={payment.amount} currency={invoice.currency} />
                    </p>
                    <p className="truncate text-xs text-faint">
                      {formatDate(payment.paidAt)}
                      {payment.notes && ` · ${payment.notes}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deletePayment.mutate(payment.id)}
                    disabled={deletePayment.isPending}
                    className="cursor-pointer rounded-md p-1.5 text-faint transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    aria-label={`Remove payment of ${formatCurrency(payment.amount, invoice.currency)}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {showPaymentDialog && <AddPaymentDialog invoice={invoice} onClose={() => setShowPaymentDialog(false)} />}
    </Page>
  );
}
