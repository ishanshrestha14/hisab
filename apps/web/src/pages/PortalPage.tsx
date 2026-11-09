import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CheckCircle2, Download, AlertCircle, FileX } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoicePDF, type InvoicePDFProps } from "@/components/InvoicePDF";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { Button, Spinner, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface PortalPayment {
  id: string;
  amount: number;
  paidAt: string;
  notes: string | null;
}

interface PortalInvoice extends InvoicePDFProps {
  status: string;
  tdsPercent: number;
  tdsAmount: number;
  netReceivable: number;
  amountPaid: number;
  amountDue: number;
  payments: PortalPayment[];
}

// The portal is a document for the client: always shown on light "paper",
// whatever theme the freelancer last used in this browser.
function useLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);
}

function Masthead({ freelancer }: { freelancer?: string }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 select-none items-center justify-center rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground">
          ह
        </div>
        <span className="text-sm text-muted-foreground">{freelancer ? `Invoice from ${freelancer}` : "Hisab"}</span>
      </div>
    </div>
  );
}

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [paid, setPaid] = useState(false);
  useLightTheme();

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
        const body = (await res.json().catch(() => ({}))) as {
          error?: string | { message?: string };
        };
        const message = typeof body.error === "string" ? body.error : body.error?.message;
        throw new Error(message ?? "Couldn't mark this invoice as paid. Try again in a moment.");
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
      <div className="flex min-h-screen items-center justify-center bg-background text-faint">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <EmptyState
          icon={FileX}
          title="Invoice not found"
          description="This link may be mistyped, or the invoice was withdrawn. Ask the sender for a new link."
        />
      </div>
    );
  }

  const isPaid = paid || invoice.status === "PAID";
  const hasTds = invoice.tdsPercent > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-14">
      <main className="mx-auto max-w-3xl animate-in-up">
        <Masthead freelancer={invoice.freelancer.name || undefined} />

        {isPaid && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-xl border border-positive/25 bg-positive/5 px-4 py-3.5"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-positive" />
            <div>
              <p className="text-sm font-medium text-foreground">This invoice is paid</p>
              <p className="text-sm text-muted-foreground">
                {paid
                  ? `${invoice.freelancer.name || "The sender"} has been notified. Thank you.`
                  : "No further payment is needed."}
              </p>
            </div>
          </div>
        )}

        {invoice.status === "OVERDUE" && !isPaid && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-xl border border-negative/25 bg-negative/5 px-4 py-3.5"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-negative" />
            <p className="text-sm text-foreground">
              Payment was due on {formatDate(invoice.dueDate, "long")}
            </p>
          </div>
        )}

        <InvoiceDocument
          invoice={invoice}
          footer={
            <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <PDFDownloadLink
                document={<InvoicePDF {...invoice} />}
                fileName={`${invoice.number}.pdf`}
                className={buttonVariants({ size: "lg" })}
              >
                <Download size={15} />
                Download PDF
              </PDFDownloadLink>
              {!isPaid && (
                <div className="flex flex-col gap-1.5 sm:items-end">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => markPaid.mutate()}
                    loading={markPaid.isPending}
                  >
                    {markPaid.isPending ? "Confirming" : "Mark as paid"}
                  </Button>
                  <p className="text-xs text-faint sm:text-right">
                    Tells {invoice.freelancer.name || "the sender"} you've paid{" "}
                    {formatCurrency(hasTds ? invoice.netReceivable : invoice.total, invoice.currency)}
                  </p>
                </div>
              )}
            </div>
          }
        />

        {markPaid.error && (
          <p role="alert" className="mt-3 flex items-center justify-center gap-2 text-sm text-destructive">
            <AlertCircle size={14} />
            {markPaid.error.message}
          </p>
        )}

        {invoice.payments.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <h2 className="border-b border-border px-5 py-3 text-[15px] font-medium text-foreground sm:px-10">
              Payments received
            </h2>
            <ul className="divide-y divide-border">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm sm:px-10">
                  <div className="min-w-0">
                    <p className="text-foreground">{formatDate(p.paidAt)}</p>
                    {p.notes && <p className="truncate text-xs text-faint">{p.notes}</p>}
                  </div>
                  <Money amount={p.amount} currency={invoice.currency} className="text-foreground" />
                </li>
              ))}
            </ul>
            {invoice.amountDue > 0 && (
              <div className="flex justify-between border-t border-border bg-muted/40 px-5 py-3 text-sm font-medium text-foreground sm:px-10">
                <span>Balance</span>
                <Money amount={invoice.amountDue} currency={invoice.currency} />
              </div>
            )}
          </section>
        )}

        <p className="mt-10 text-center text-xs text-faint">
          Sent with Hisab <span className="text-muted-foreground">हिसाब</span>, open-source invoicing for Nepali
          freelancers
        </p>
      </main>
    </div>
  );
}
