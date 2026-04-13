import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import {
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  createTimeEntrySchema,
  generateInvoiceFromTimeSchema,
  type CreateTimeEntryInput,
  type GenerateInvoiceFromTimeInput,
} from "@hisab/shared";

interface Client {
  id: string;
  name: string;
  defaultCurrency: string;
}

interface TimeEntry {
  id: string;
  clientId: string;
  description: string;
  hours: number;
  hourlyRate: number;
  currency: string;
  date: string;
  invoiceId: string | null;
  client: { name: string };
  invoice: { id: string; number: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CURRENCIES = ["USD", "GBP", "EUR", "NPR"] as const;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors duration-150";

function TimeEntryDialog({
  entry,
  onClose,
}: {
  entry?: TimeEntry;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!entry;

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ["clients-all"],
    queryFn: () => api.get("/api/clients?limit=100"),
  });
  const clients = clientsData?.data ?? [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateTimeEntryInput>({
    resolver: zodResolver(createTimeEntrySchema),
    defaultValues: entry
      ? {
          clientId: entry.clientId,
          description: entry.description,
          hours: entry.hours,
          hourlyRate: entry.hourlyRate,
          currency: entry.currency as never,
          date: new Date(entry.date),
        }
      : {
          date: new Date(),
          currency: "USD",
          hourlyRate: 50,
        },
  });

  const hours = watch("hours") ?? 0;
  const rate = watch("hourlyRate") ?? 0;
  const currency = watch("currency") ?? "USD";

  const mutation = useMutation({
    mutationFn: (data: CreateTimeEntryInput) =>
      isEdit
        ? api.put(`/api/time-entries/${entry.id}`, data)
        : api.post("/api/time-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success(isEdit ? "Entry updated" : "Time logged");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save entry");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">
            {isEdit ? "Edit Time Entry" : "Log Time"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4 p-6"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Client *
            </label>
            <select
              {...register("clientId")}
              className={errors.clientId ? inputClass.replace("border-input", "border-destructive") : inputClass}
            >
              <option value="">Select a client…</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.name}</option>
              ))}
            </select>
            {errors.clientId && (
              <p className="mt-1 text-xs text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description *
            </label>
            <input
              {...register("description")}
              placeholder="UI design, API integration, bug fixes…"
              className={errors.description ? inputClass.replace("border-input", "border-destructive") : inputClass}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Hours *
              </label>
              <input
                {...register("hours", { valueAsNumber: true })}
                type="number"
                step="0.25"
                min="0.25"
                placeholder="1.5"
                className={errors.hours ? inputClass.replace("border-input", "border-destructive") : inputClass}
              />
              {errors.hours && (
                <p className="mt-1 text-xs text-destructive">{errors.hours.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Date *
              </label>
              <input
                {...register("date")}
                type="date"
                defaultValue={
                  entry
                    ? new Date(entry.date).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0]
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Hourly Rate *
              </label>
              <input
                {...register("hourlyRate", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="50.00"
                className={errors.hourlyRate ? inputClass.replace("border-input", "border-destructive") : inputClass}
              />
              {errors.hourlyRate && (
                <p className="mt-1 text-xs text-destructive">{errors.hourlyRate.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Currency *
              </label>
              <select {...register("currency")} className={inputClass}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {hours > 0 && rate > 0 && (
            <div className="rounded-md bg-muted/50 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(hours * rate, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </span>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Log time"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenerateInvoiceDialog({
  entries,
  onClose,
}: {
  entries: TimeEntry[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const total = entries.reduce((sum, e) => sum + e.hours * e.hourlyRate, 0);
  const currency = entries[0]?.currency ?? "USD";

  const { register, handleSubmit, formState: { errors } } = useForm<GenerateInvoiceFromTimeInput>({
    resolver: zodResolver(generateInvoiceFromTimeSchema),
    defaultValues: {
      entryIds: entries.map((e) => e.id),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const mutation = useMutation<{ id: string; number: string }, Error, GenerateInvoiceFromTimeInput>({
    mutationFn: (data: GenerateInvoiceFromTimeInput) =>
      api.post("/api/time-entries/generate-invoice", data),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice ${invoice.number} created`);
      onClose();
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to generate invoice");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Generate Invoice</h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4 p-6"
        >
          {/* Summary */}
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Entries</span>
              <span>{entries.length}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total hours</span>
              <span>{entries.reduce((s, e) => s + e.hours, 0).toFixed(2)}h</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
              <span>Invoice total</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Due Date *
            </label>
            <input
              {...register("dueDate")}
              type="date"
              defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]}
              className={errors.dueDate ? inputClass.replace("border-input", "border-destructive") : inputClass}
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-destructive">{errors.dueDate.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Notes
            </label>
            <input
              {...register("notes")}
              placeholder="Payment terms, project reference…"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating…
                </span>
              ) : (
                "Create invoice"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type Tab = "unbilled" | "billed";

export default function TimePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("unbilled");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ type: "entry"; entry?: TimeEntry } | { type: "invoice" } | null>(null);

  const { data, isLoading } = useQuery<{ data: TimeEntry[]; pagination: Pagination }>({
    queryKey: ["time-entries", tab, page],
    queryFn: () => api.get(`/api/time-entries?page=${page}&limit=20&status=${tab}`),
  });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteEntry = useMutation({
    mutationFn: (id: string) => api.delete(`/api/time-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Entry deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete entry");
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.id)));
    }
  }

  const selectedEntries = entries.filter((e) => selected.has(e.id));

  // Validate selection for invoice generation
  const selectionClientIds = [...new Set(selectedEntries.map((e) => e.clientId))];
  const selectionCurrencies = [...new Set(selectedEntries.map((e) => e.currency))];
  const canGenerateInvoice =
    selected.size > 0 && selectionClientIds.length === 1 && selectionCurrencies.length === 1;

  const selectionError =
    selected.size > 0 && selectionClientIds.length > 1
      ? "All selected entries must be for the same client"
      : selected.size > 0 && selectionCurrencies.length > 1
      ? "All selected entries must use the same currency"
      : null;

  return (
    <div className="p-8 animate-in-up">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Time Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log hours and generate invoices from your timesheet
          </p>
        </div>
        <button
          onClick={() => setDialog({ type: "entry" })}
          className="flex cursor-pointer items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
        >
          <Plus size={16} />
          Log time
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-0.5 border-b border-border">
        {(["unbilled", "billed"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); setSelected(new Set()); }}
            className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 -mb-px capitalize ${
              tab === t
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Generate invoice bar */}
      {tab === "unbilled" && selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-brand/30 bg-brand/5 px-4 py-3">
          <div className="text-sm">
            {selectionError ? (
              <span className="text-destructive">{selectionError}</span>
            ) : (
              <span className="text-foreground">
                <span className="font-medium">{selected.size}</span> entr{selected.size === 1 ? "y" : "ies"} selected
                {canGenerateInvoice && (
                  <span className="ml-2 text-muted-foreground">
                    · {formatCurrency(
                      selectedEntries.reduce((s, e) => s + e.hours * e.hourlyRate, 0),
                      selectedEntries[0]?.currency ?? "USD"
                    )}
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
            <button
              disabled={!canGenerateInvoice}
              onClick={() => setDialog({ type: "invoice" })}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText size={14} />
              Generate invoice
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {tab === "unbilled" ? "No unbilled entries" : "No billed entries yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tab === "unbilled"
                ? "Log time to start tracking hours"
                : "Entries will appear here after generating invoices"}
            </p>
            {tab === "unbilled" && (
              <button
                onClick={() => setDialog({ type: "entry" })}
                className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Log time
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tab === "unbilled" && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === entries.length && entries.length > 0}
                      onChange={toggleAll}
                      className="cursor-pointer accent-brand"
                    />
                  </th>
                )}
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3 text-right">Hours</th>
                <th className="px-6 py-3 text-right">Rate</th>
                <th className="px-6 py-3 text-right">Total</th>
                {tab === "billed" && <th className="px-6 py-3">Invoice</th>}
                {tab === "unbilled" && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    selected.has(entry.id) ? "bg-brand/5" : "hover:bg-accent/50"
                  }`}
                >
                  {tab === "unbilled" && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="cursor-pointer accent-brand"
                      />
                    </td>
                  )}
                  <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3 text-foreground">{entry.description}</td>
                  <td className="px-6 py-3 text-muted-foreground">{entry.client.name}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{entry.hours}h</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {formatCurrency(entry.hourlyRate, entry.currency)}/hr
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-foreground">
                    {formatCurrency(entry.hours * entry.hourlyRate, entry.currency)}
                  </td>
                  {tab === "billed" && (
                    <td className="px-6 py-3">
                      {entry.invoice ? (
                        <a
                          href={`/invoices/${entry.invoice.id}`}
                          className="text-brand hover:underline text-xs font-medium"
                        >
                          {entry.invoice.number}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  )}
                  {tab === "unbilled" && (
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDialog({ type: "entry", entry })}
                          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Edit entry"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteEntry.mutate(entry.id)}
                          disabled={deleteEntry.isPending}
                          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          aria-label="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td
                  colSpan={tab === "unbilled" ? 4 : 3}
                  className="px-6 py-3 text-sm text-muted-foreground"
                >
                  Total (this page)
                </td>
                <td className="px-6 py-3 text-right font-medium text-muted-foreground">
                  {entries.reduce((s, e) => s + e.hours, 0).toFixed(2)}h
                </td>
                <td />
                <td className="px-6 py-3 text-right font-semibold text-foreground">
                  {(() => {
                    const byCurrency: Record<string, number> = {};
                    entries.forEach((e) => {
                      byCurrency[e.currency] = (byCurrency[e.currency] ?? 0) + e.hours * e.hourlyRate;
                    });
                    return Object.entries(byCurrency).map(([cur, amt]) => (
                      <div key={cur}>{formatCurrency(amt, cur)}</div>
                    ));
                  })()}
                </td>
                <td colSpan={tab === "unbilled" ? 2 : 1} />
              </tr>
            </tfoot>
          </table>
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
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1">Page {page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pagination.totalPages}
              className="cursor-pointer rounded-md border border-border p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {dialog?.type === "entry" && (
        <TimeEntryDialog
          entry={dialog.entry}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "invoice" && (
        <GenerateInvoiceDialog
          entries={selectedEntries}
          onClose={() => { setDialog(null); setSelected(new Set()); }}
        />
      )}
    </div>
  );
}
