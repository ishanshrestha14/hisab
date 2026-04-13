import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Receipt, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { createExpenseSchema, type CreateExpenseInput, type ExpenseCategory } from "@hisab/shared";

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

const CATEGORY_COLORS: Record<string, string> = {
  SOFTWARE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  HARDWARE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  TRAVEL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  MEALS: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  OFFICE: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MARKETING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  PROFESSIONAL_SERVICES: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  OTHER: "bg-muted text-muted-foreground",
};

const CURRENCIES = ["USD", "GBP", "EUR", "NPR"] as const;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors duration-150";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">
            {isEdit ? "Edit Expense" : "Add Expense"}
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
              className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
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
    <div className="p-8 animate-in-up">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track business expenses and attach them to clients
          </p>
        </div>
        <button
          onClick={() => setDialog({ open: true })}
          className="flex cursor-pointer items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
        >
          <Plus size={16} />
          Add expense
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="mb-4 flex gap-0.5 overflow-x-auto border-b border-border">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setActiveCategory(cat.value); setPage(1); }}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 -mb-px ${
              activeCategory === cat.value
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No expenses yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeCategory === "ALL"
                ? "Start tracking your business expenses"
                : `No ${CATEGORIES.find((c) => c.value === activeCategory)?.label} expenses`}
            </p>
            {activeCategory === "ALL" && (
              <button
                onClick={() => setDialog({ open: true })}
                className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Add expense
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                      {new Date(expense.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-foreground">
                      <span className="font-medium">{expense.description}</span>
                      {expense.notes && (
                        <span className="ml-2 text-xs text-muted-foreground">{expense.notes}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[expense.category] ?? ""}`}
                      >
                        {CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {expense.client?.name ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-foreground">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDialog({ open: true, expense })}
                          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Edit expense"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteExpense.mutate(expense.id)}
                          disabled={deleteExpense.isPending}
                          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
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
            </table>
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

      {dialog.open && (
        <ExpenseDialog
          expense={dialog.expense}
          onClose={() => setDialog({ open: false })}
        />
      )}
    </div>
  );
}
