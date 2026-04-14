import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Plus, ChevronLeft, ChevronRight, FileText } from "lucide-react";
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

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
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
    activeTab === "ALL"
      ? invoices
      : invoices.filter((inv) => inv.status === activeTab);

  return (
    <div className="p-4 sm:p-8 animate-in-up">
      <div className="mb-5 sm:mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track your invoices
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New invoice</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Status filter — dropdown on mobile, tabs on desktop */}
      <div className="mb-4">
        {/* Mobile dropdown */}
        <select
          className="sm:hidden rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
          value={activeTab}
          onChange={(e) => { setActiveTab(e.target.value as FilterTab); setPage(1); }}
        >
          {TABS.map((tab) => (
            <option key={tab.value} value={tab.value}>{tab.label}</option>
          ))}
        </select>

        {/* Desktop tabs */}
        <div className="hidden sm:flex gap-0.5 border-b border-border">
          {TABS.map((tab) => {
            const count =
              tab.value === "ALL"
                ? (pagination?.total ?? invoices.length)
                : invoices.filter((inv) => inv.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setPage(1); }}
                className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 -mb-px ${
                  activeTab === tab.value
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs transition-colors ${
                  activeTab === tab.value ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {activeTab === "ALL" ? "No invoices yet" : `No ${STATUS_LABEL[activeTab]?.toLowerCase()} invoices`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTab === "ALL"
                ? "Create your first invoice to get started"
                : `Invoices with "${STATUS_LABEL[activeTab]}" status will appear here`}
            </p>
            {activeTab === "ALL" && (
              <Link
                to="/invoices/new"
                className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Create invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
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
                    className="cursor-pointer border-b border-border last:border-0 transition-colors duration-100 hover:bg-accent/50"
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
                        {STATUS_LABEL[inv.status] ?? inv.status}
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
          </table></div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * pagination.limit + 1}–
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="cursor-pointer rounded-md border border-border p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pagination.totalPages}
              className="cursor-pointer rounded-md border border-border p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
