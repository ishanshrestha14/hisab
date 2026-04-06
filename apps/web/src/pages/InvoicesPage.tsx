import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FilterTab = "ALL" | "DRAFT" | "SENT" | "PAID" | "OVERDUE";

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: Invoice[]; pagination: Pagination }>({
    queryKey: ["invoices", page],
    queryFn: () => api.get(`/api/invoices?page=${page}&limit=20`),
  });

  const invoices = data?.data ?? [];
  const pagination = data?.pagination;

  const filtered =
    activeTab === "ALL" ? invoices : invoices.filter((inv) => inv.status === activeTab);

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

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? (pagination?.total ?? invoices.length)
              : invoices.filter((inv) => inv.status === tab.value).length;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.value
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeTab === tab.value
                    ? "bg-brand/10 text-brand"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {activeTab === "ALL" ? "No invoices yet." : `No ${activeTab.toLowerCase()} invoices.`}
            </p>
            {activeTab === "ALL" && (
              <Link
                to="/invoices/new"
                className="mt-2 inline-block text-sm text-brand hover:underline"
              >
                Create your first invoice
              </Link>
            )}
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
              {filtered.map((inv) => {
                const total = inv.lineItems.reduce((sum, li) => sum + li.total, 0);
                return (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/50"
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

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded-md border border-border p-1.5 hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1">Page {page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pagination.totalPages}
              className="rounded-md border border-border p-1.5 hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
