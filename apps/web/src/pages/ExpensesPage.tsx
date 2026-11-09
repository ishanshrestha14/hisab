import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Receipt, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Tag } from "@/components/ui/status";
import { api } from "@/lib/api";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { createExpenseSchema, type CreateExpenseInput, type ExpenseCategory } from "@hisab/shared";
import { controlClass } from "@/components/ui/field";

interface Client {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  date: string;
  notes: string | null;
  client: { name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORIES: { value: ExpenseCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SOFTWARE", label: "Software" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "TRAVEL", label: "Travel" },
  { value: "MEALS", label: "Meals" },
  { value: "OFFICE", label: "Office" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PROFESSIONAL_SERVICES", label: "Professional Services" },
  { value: "OTHER", label: "Other" },
];

const CURRENCIES = ["USD", "GBP", "EUR", "NPR"] as const;

const inputClass = cn(controlClass, "py-2");

function ExpenseDialog({
  expense,
  onClose,
}: {
  expense?: Expense;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!expense;

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ["clients-all"],
    queryFn: () => api.get("/api/clients?limit=100"),
  });
  const clients = clientsData?.data ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: expense
      ? {
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency as never,
          date: new Date(expense.date),
          notes: expense.notes ?? undefined,
        }
      : {
          date: new Date(),
          currency: "USD",
          category: "OTHER",
        },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      isEdit
        ? api.put(`/api/expenses/${expense.id}`, data)
        : api.post("/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(isEdit ? "Expense updated" : "Expense added");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save expense");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[15px] font-medium text-foreground">
            {isEdit ? "Edit expense" : "Add expense"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
              Description *
            </label>
            <input
              {...register("description")}
              placeholder="Adobe Creative Cloud, Airfare to Kathmandu…"
              className={errors.description ? inputClass.replace("border-input", "border-destructive") : inputClass}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Amount *
              </label>
              <input
                {...register("amount", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={errors.amount ? inputClass.replace("border-input", "border-destructive") : inputClass}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Category *
              </label>
              <select {...register("category")} className={inputClass}>
                {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Date *
              </label>
              <input
                {...register("date")}
                type="date"
                defaultValue={expense
                  ? new Date(expense.date).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0]}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Client (optional)
            </label>
            <select {...register("clientId")} className={inputClass}>
              <option value="">No client</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Notes
            </label>
            <input
              {...register("notes")}
              placeholder="Receipt #, project name…"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving…
                </span>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add expense"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; expense?: Expense }>({ open: false });

  const categoryParam = activeCategory !== "ALL" ? `&category=${activeCategory}` : "";
  const { data, isLoading } = useQuery<{ data: Expense[]; pagination: Pagination }>({
    queryKey: ["expenses", page, activeCategory],
    queryFn: () => api.get(`/api/expenses?page=${page}&limit=20${categoryParam}`),
  });

  const expenses = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api.delete(`/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete expense");
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8 animate-in-up">
      <div className="mb-5 sm:mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.01em] text-foreground sm:text-[28px] sm:leading-9">Expenses</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            Track business expenses and attach them to clients
          </p>
        </div>
        <button
          onClick={() => setDialog({ open: true })}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add expense</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Category filter — dropdown on mobile, tabs on desktop */}
      <div className="mb-4">
        <select
          className="sm:hidden rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
          value={activeCategory}
          onChange={(e) => { setActiveCategory(e.target.value as typeof activeCategory); setPage(1); }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <div className="hidden sm:flex gap-0.5 overflow-x-auto border-b border-border">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setActiveCategory(cat.value); setPage(1); }}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 -mb-px border-b-2 px-3 h-10 text-sm transition-colors ${ activeCategory === cat.value ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground" }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <Receipt size={20} strokeWidth={1.5} className="mb-3 text-faint" />
            <p className="text-sm font-medium text-foreground">No expenses yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeCategory === "ALL"
                ? "Start tracking your business expenses"
                : `No ${CATEGORIES.find((c) => c.value === activeCategory)?.label} expenses`}
            </p>
            {activeCategory === "ALL" && (
              <button
                onClick={() => setDialog({ open: true })}
                className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
              >
                Add expense
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <ul className="divide-y divide-border sm:hidden">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex items-start gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, expense })}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    aria-label={`Edit ${expense.description}`}
                  >
                    <p className="truncate text-sm text-foreground">{expense.description}</p>
                    <p className="mt-0.5 truncate text-xs text-faint">
                      {formatDate(expense.date)} · {CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category}
                      {expense.client?.name && ` · ${expense.client.name}`}
                    </p>
                  </button>
                  <span className="shrink-0 text-sm tabular-nums text-foreground">
                    {formatCurrency(expense.amount, expense.currency)}
                  </span>
                  <button
                    onClick={() => deleteExpense.mutate(expense.id)}
                    disabled={deleteExpense.isPending}
                    className="-mr-1.5 shrink-0 cursor-pointer rounded-lg p-1.5 text-faint transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    aria-label={`Delete ${expense.description}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block"><table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[13px] text-faint [&>th]:font-normal">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-accent/50"
                  >
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-3 text-foreground">
                      <span>{expense.description}</span>
                      {expense.notes && (
                        <span className="ml-2 text-xs text-muted-foreground">{expense.notes}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <Tag>{CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category}</Tag>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {expense.client?.name ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-foreground">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDialog({ open: true, expense })}
                          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Edit expense"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteExpense.mutate(expense.id)}
                          disabled={deleteExpense.isPending}
                          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          aria-label="Delete expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {expenses.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={4} className="px-6 py-3 text-sm text-muted-foreground">
                      {activeCategory === "ALL" ? "Total (this page)" : `Total ${CATEGORIES.find((c) => c.value === activeCategory)?.label}`}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-foreground">
                      {/* Mixed currencies — show per currency */}
                      {(() => {
                        const byCurrency: Record<string, number> = {};
                        expenses.forEach((e) => {
                          byCurrency[e.currency] = (byCurrency[e.currency] ?? 0) + e.amount;
                        });
                        return Object.entries(byCurrency).map(([cur, amt]) => (
                          <div key={cur}>{formatCurrency(amt, cur)}</div>
                        ));
                      })()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table></div>
          </>
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
              className="cursor-pointer rounded-lg border border-border p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1">Page {page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pagination.totalPages}
              className="cursor-pointer rounded-lg border border-border p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {dialog.open && (
        <ExpenseDialog
          expense={dialog.expense}
          onClose={() => setDialog({ open: false })}
        />
      )}
    </div>
  );
}
