import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Plus, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status";
import { Pager } from "@/components/ui/table";

interface Quote {
  id: string;
  number: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "CONVERTED";
  currency: string;
  expiryDate: string;
  client: { name: string };
  lineItems: { total: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FilterTab = "ALL" | "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "CONVERTED";

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Declined", value: "DECLINED" },
  { label: "Converted", value: "CONVERTED" },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CONVERTED: "Converted",
};

const isTab = (v: string | null): v is FilterTab => TABS.some((t) => t.value === v);

export default function QuotesPage() {
  const navigate = useNavigate();
  // Filter and page live in the URL; filtering happens on the server
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const activeTab: FilterTab = isTab(statusParam) ? statusParam : "ALL";
  const page = Math.max(1, Number(params.get("page")) || 1);

  function update(next: { status?: FilterTab; page?: number }) {
    const status = next.status ?? activeTab;
    const p = next.page ?? 1;
    const search = new URLSearchParams();
    if (status !== "ALL") search.set("status", status);
    if (p > 1) search.set("page", String(p));
    setParams(search, { replace: true });
  }

  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (activeTab !== "ALL") query.set("status", activeTab);

  const { data, isLoading } = useQuery<{
    data: Quote[];
    pagination: Pagination;
    counts?: Record<FilterTab, number>;
  }>({
    queryKey: ["quotes", activeTab, page],
    queryFn: () => api.get(`/api/quotes?${query}`),
    placeholderData: keepPreviousData,
  });

  const filtered = data?.data ?? [];
  const pagination = data?.pagination;
  const counts = data?.counts;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8 animate-in-up">
      <div className="mb-5 sm:mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.01em] text-foreground sm:text-[28px] sm:leading-9">Quotes</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            Create estimates and convert them to invoices
          </p>
        </div>
        <Link
          to="/quotes/new"
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New quote</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Status filter — dropdown on mobile, tabs on desktop */}
      <div className="mb-4">
        <select
          className="sm:hidden rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
          value={activeTab}
          onChange={(e) => update({ status: e.target.value as FilterTab })}
          aria-label="Status"
        >
          {TABS.map((tab) => (
            <option key={tab.value} value={tab.value}>
              {tab.label}
              {counts ? ` (${counts[tab.value]})` : ""}
            </option>
          ))}
        </select>
        <div role="tablist" aria-label="Filter by status" className="hidden gap-1 border-b border-border sm:flex">
          {TABS.map((tab) => {
            const count = counts?.[tab.value];
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => update({ status: tab.value })}
                className={`-mb-px flex h-10 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm transition-colors ${ activeTab === tab.value ? "border-brand font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground" }`}
              >
                {tab.label}
                {count !== undefined && (
                  <span className={`text-xs tabular-nums ${ activeTab === tab.value ? "text-muted-foreground" : "text-faint" }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <ClipboardList size={20} strokeWidth={1.5} className="mb-3 text-faint" />
            <p className="text-sm font-medium text-foreground">
              {activeTab === "ALL" ? "No quotes yet" : `No ${STATUS_LABEL[activeTab]?.toLowerCase()} quotes`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTab === "ALL"
                ? "Create a quote to send an estimate to a client"
                : `Quotes with "${STATUS_LABEL[activeTab]}" status will appear here`}
            </p>
            {activeTab === "ALL" && (
              <Link
                to="/quotes/new"
                className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
              >
                Create quote
              </Link>
            )}
          </div>
        ) : (
          <>
          <ul className="divide-y divide-border sm:hidden">
            {filtered.map((q) => {
              const total = q.lineItems.reduce((sum, li) => sum + li.total, 0);
              return (
                <li key={q.id}>
                  <Link
                    to={`/quotes/${q.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{q.client.name}</p>
                      <p className="mt-0.5 text-xs text-faint">
                        {q.number} · expires {formatDate(q.expiryDate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums text-foreground">{formatCurrency(total, q.currency)}</p>
                      <StatusBadge status={q.status} className="mt-0.5 flex justify-end text-xs" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto sm:block"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[13px] text-faint [&>th]:font-normal">
                <th className="px-6 py-3">Quote</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Expires</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const total = q.lineItems.reduce((sum, li) => sum + li.total, 0);
                return (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors duration-100 hover:bg-accent/50"
                  >
                    <td className="px-6 py-3 text-foreground">{q.number}</td>
                    <td className="px-6 py-3 text-muted-foreground">{q.client.name}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">{formatDate(q.expiryDate)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-foreground">
                      {formatCurrency(total, q.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          </>
        )}
      </div>

      {pagination && (
        <Pager
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPage={(p) => update({ page: p })}
        />
      )}
    </div>
  );
}
