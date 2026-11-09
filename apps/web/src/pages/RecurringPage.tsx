import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Plus, RefreshCw, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status";

interface RecurringInvoice {
  id: string;
  active: boolean;
  interval: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  nextRunAt: string;
  currency: string;
  client: { name: string };
  lineItems: { total: number }[];
}

const INTERVAL_LABEL: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export default function RecurringPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<RecurringInvoice[]>({
    queryKey: ["recurring"],
    queryFn: () => api.get("/api/recurring"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/recurring/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      toast.success("Updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteRecurring = useMutation({
    mutationFn: (id: string) => api.delete(`/api/recurring/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const schedules = data ?? [];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8 animate-in-up">
      <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.01em] text-foreground sm:text-[28px] sm:leading-9">Recurring invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generate invoices on a schedule
          </p>
        </div>
        <Link
          to="/recurring/new"
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
        >
          <Plus size={16} />
          New schedule
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <RefreshCw size={20} strokeWidth={1.5} className="mb-3 text-faint" />
            <p className="text-sm font-medium text-foreground">No recurring schedules yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Set up automatic invoicing for retainer clients
            </p>
            <Link
              to="/recurring/new"
              className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
            >
              Create schedule
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[13px] text-faint [&>th]:font-normal">
                <th className="px-4 py-3 sm:px-6">Client</th>
                <th className="hidden px-6 py-3 sm:table-cell">Interval</th>
                <th className="hidden px-6 py-3 sm:table-cell">Next run</th>
                <th className="px-4 py-3 text-right sm:px-6">Amount</th>
                <th className="hidden px-6 py-3 sm:table-cell">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {schedules.map((ri) => {
                const total = ri.lineItems.reduce((sum, li) => sum + li.total, 0);
                return (
                  <tr
                    key={ri.id}
                    onClick={() => navigate(`/recurring/${ri.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 text-foreground sm:px-6">
                      <Link to={`/recurring/${ri.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {ri.client.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-faint sm:hidden">
                        {INTERVAL_LABEL[ri.interval]} · next {formatDate(ri.nextRunAt)} · {ri.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="hidden px-6 py-3 text-muted-foreground sm:table-cell">{INTERVAL_LABEL[ri.interval]}</td>
                    <td className="hidden whitespace-nowrap px-6 py-3 text-muted-foreground sm:table-cell">{formatDate(ri.nextRunAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground sm:px-6">
                      {formatCurrency(total, ri.currency)}
                    </td>
                    <td className="hidden px-6 py-3 sm:table-cell">
                      <StatusBadge status={ri.active ? "ACTIVE" : "PAUSED"} />
                    </td>
                    <td className="px-2 py-3 sm:px-6">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleActive.mutate({ id: ri.id, active: !ri.active })}
                          title={ri.active ? "Pause" : "Resume"}
                          aria-label={ri.active ? "Pause schedule" : "Resume schedule"}
                          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          {ri.active ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this recurring schedule?")) {
                              deleteRecurring.mutate(ri.id);
                            }
                          }}
                          title="Delete"
                          aria-label="Delete schedule"
                          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
