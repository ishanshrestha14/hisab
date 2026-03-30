import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  currency: string;
  dueDate: string;
  client: { name: string };
  lineItems: { total: number }[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: () => api.get("/api/invoices"),
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track your invoices
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus size={16} />
          New invoice
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
            <Link
              to="/invoices/new"
              className="mt-2 inline-block text-sm text-brand hover:underline"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Invoice</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Due</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const total = inv.lineItems.reduce((sum, li) => sum + li.total, 0);
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-accent/50"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">
                      {inv.number}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {inv.client.name}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? ""}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(inv.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-foreground">
                      {formatCurrency(total, inv.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
