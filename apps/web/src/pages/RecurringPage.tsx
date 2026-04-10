import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Plus, RefreshCw, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
    <div className="p-8 animate-in-up">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generate invoices on a schedule
          </p>
        </div>
        <Link
          to="/recurring/new"
          className="flex cursor-pointer items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
        >
          <Plus size={16} />
          New schedule
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <RefreshCw size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No recurring schedules yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Set up automatic invoicing for retainer clients
            </p>
            <Link
              to="/recurring/new"
              className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              Create schedule
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Interval</th>
                <th className="px-6 py-3 font-medium">Next Run</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {schedules.map((ri) => {
                const total = ri.lineItems.reduce((sum, li) => sum + li.total, 0);
                return (
                  <tr
                    key={ri.id}
                    onClick={() => navigate(`/recurring/${ri.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors duration-100 hover:bg-accent/50"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">{ri.client.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{INTERVAL_LABEL[ri.interval]}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(ri.nextRunAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-foreground">
                      {formatCurrency(total, ri.currency)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        ri.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {ri.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleActive.mutate({ id: ri.id, active: !ri.active })}
                          title={ri.active ? "Pause" : "Resume"}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
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
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
