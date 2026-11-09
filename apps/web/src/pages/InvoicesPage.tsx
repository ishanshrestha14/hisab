import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Plus, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState, Page, PageHeader, Panel, TableSkeleton } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { StatusBadge, statusLabel } from "@/components/ui/status";
import { Pager, Table, THead, Th, Td, Tr } from "@/components/ui/table";

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
  { label: "Overdue", value: "OVERDUE" },
  { label: "Paid", value: "PAID" },
];

const isTab = (v: string | null): v is FilterTab => TABS.some((t) => t.value === v);

export default function InvoicesPage() {
  const navigate = useNavigate();
  // Filter and page live in the URL so links like /invoices?status=OVERDUE work
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
    data: Invoice[];
    pagination: Pagination;
    counts?: Record<FilterTab, number>;
  }>({
    queryKey: ["invoices", activeTab, page],
    queryFn: () => api.get(`/api/invoices?${query}`),
    placeholderData: keepPreviousData,
  });

  const invoices = data?.data ?? [];
  const pagination = data?.pagination;
  const counts = data?.counts;

  return (
    <Page>
      <PageHeader
        title="Invoices"
        actions={
          <Link to="/invoices/new" className={buttonVariants({ variant: "primary" })}>
            <Plus size={16} />
            New invoice
          </Link>
        }
      />

      {/* Status filter: select on mobile, tabs from sm up */}
      <div className="mb-4">
        <label className="sr-only" htmlFor="status-filter">
          Status
        </label>
        <Select
          id="status-filter"
          className="w-auto sm:hidden"
          value={activeTab}
          onChange={(e) => update({ status: e.target.value as FilterTab })}
        >
          {TABS.map((tab) => (
            <option key={tab.value} value={tab.value}>
              {tab.label}
              {counts ? ` (${counts[tab.value]})` : ""}
            </option>
          ))}
        </Select>

        <div role="tablist" aria-label="Filter by status" className="hidden gap-1 border-b border-border sm:flex">
          {TABS.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={active}
                onClick={() => update({ status: tab.value })}
                className={cn(
                  "-mb-px flex h-10 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm transition-colors",
                  active
                    ? "border-brand font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {counts && (
                  <span className={cn("text-xs tabular-nums", active ? "text-muted-foreground" : "text-faint")}>
                    {counts[tab.value]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Panel>
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={activeTab === "ALL" ? "No invoices yet" : `No ${statusLabel(activeTab).toLowerCase()} invoices`}
            description={
              activeTab === "ALL"
                ? "Bill a client in USD, GBP, EUR or NPR and share a private payment link"
                : undefined
            }
            action={
              activeTab === "ALL" && (
                <Link to="/invoices/new" className={buttonVariants({ variant: "primary" })}>
                  New invoice
                </Link>
              )
            }
          />
        ) : (
          <>
            {/* Mobile list */}
            <ul className="divide-y divide-border sm:hidden">
              {invoices.map((inv) => {
                const total = inv.lineItems.reduce((sum, li) => sum + li.total, 0);
                return (
                  <li key={inv.id}>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{inv.client.name}</p>
                        <p className="mt-0.5 text-xs text-faint">
                          {inv.number} · due {formatDate(inv.dueDate)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Money amount={total} currency={inv.currency} className="text-sm font-medium text-foreground" />
                        <StatusBadge status={inv.status} className="mt-0.5 flex justify-end text-xs" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <Th>Invoice</Th>
                  <Th>Client</Th>
                  <Th>Status</Th>
                  <Th>Due</Th>
                  <Th align="right">Amount</Th>
                </THead>
                <tbody>
                  {invoices.map((inv) => {
                    const total = inv.lineItems.reduce((sum, li) => sum + li.total, 0);
                    return (
                      <Tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                        <Td className="text-foreground">
                          <Link
                            to={`/invoices/${inv.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {inv.number}
                          </Link>
                        </Td>
                        <Td className="max-w-[260px] truncate">{inv.client.name}</Td>
                        <Td>
                          <StatusBadge status={inv.status} />
                        </Td>
                        <Td className={cn("whitespace-nowrap", inv.status === "OVERDUE" && "text-negative")}>
                          {formatDate(inv.dueDate)}
                        </Td>
                        <Td align="right" className="font-medium text-foreground">
                          <Money amount={total} currency={inv.currency} />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Panel>

      {pagination && (
        <Pager
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPage={(p) => update({ page: p })}
        />
      )}
    </Page>
  );
}
