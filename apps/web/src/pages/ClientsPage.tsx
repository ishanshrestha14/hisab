import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Users, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  createClientSchema,
  type CreateClientInput,
  type Currency,
} from "@hisab/shared";
import { controlClass } from "@/components/ui/field";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  defaultCurrency: Currency;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CURRENCIES = ["USD", "GBP", "EUR", "NPR"] as const;

function ClientAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
      {initials}
    </div>
  );
}

const inputClass = cn(controlClass, "py-2");
const inputErrorClass = cn(controlClass, "py-2 border-destructive focus:border-destructive focus:ring-destructive/20");
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
const errorClass = "mt-1.5 flex items-center gap-1 text-xs text-destructive";

function ClientDialog({
  client,
  onClose,
  onSaved,
}: {
  client?: Client;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: client
      ? {
          name: client.name,
          email: client.email,
          company: client.company ?? "",
          country: client.country ?? "",
          defaultCurrency: client.defaultCurrency,
        }
      : { defaultCurrency: "USD" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateClientInput) =>
      isEdit
        ? api.put(`/api/clients/${client.id}`, data)
        : api.post("/api/clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(isEdit ? "Client updated" : "Client added");
      onSaved?.();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save client");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-in-up">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[15px] font-medium text-foreground">
            {isEdit ? "Edit client" : "Add client"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4 p-6"
        >
          <div>
            <label className={labelClass}>Name *</label>
            <input
              {...register("name")}
              placeholder="Jane Doe"
              className={errors.name ? inputErrorClass : inputClass}
            />
            {errors.name && (
              <p className={errorClass}>
                <AlertCircle size={12} />{errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input
              {...register("email")}
              type="email"
              placeholder="jane@example.com"
              className={errors.email ? inputErrorClass : inputClass}
            />
            {errors.email && (
              <p className={errorClass}>
                <AlertCircle size={12} />{errors.email.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Company</label>
              <input
                {...register("company")}
                placeholder="Acme Inc."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                {...register("country")}
                placeholder="United States"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Default currency</label>
            <select {...register("defaultCurrency")} className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
              ) : isEdit ? "Save changes" : "Add client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [dialogClient, setDialogClient] = useState<Client | null | "new">(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: Client[]; pagination: Pagination }>({
    queryKey: ["clients", page],
    queryFn: () => api.get(`/api/clients?page=${page}&limit=20`),
  });

  const clients = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeletingId(null);
      setPage(1);
      toast.success("Client deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete client");
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8 animate-in-up">
      <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.01em] text-foreground sm:text-[28px] sm:leading-9">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your clients
          </p>
        </div>
        <button
          onClick={() => setDialogClient("new")}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
        >
          <Plus size={16} />
          Add client
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <Users size={20} strokeWidth={1.5} className="mb-3 text-faint" />
            <p className="text-sm font-medium text-foreground">No clients yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first client to start invoicing
            </p>
            <button
              onClick={() => setDialogClient("new")}
              className="mt-4 cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-400"
            >
              Add client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[13px] text-faint [&>th]:font-normal">
                <th className="px-4 py-3 sm:px-6">Client</th>
                <th className="hidden px-6 py-3 md:table-cell">Email</th>
                <th className="hidden px-6 py-3 lg:table-cell">Company</th>
                <th className="hidden px-6 py-3 sm:table-cell">Currency</th>
                <th className="px-2 py-3 sm:px-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-border last:border-0 transition-colors duration-100 hover:bg-accent/50"
                >
                  <td className="px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={client.name} />
                      <div className="min-w-0">
                        <Link to={`/clients/${client.id}/statement`} className="text-foreground hover:underline">
                          {client.name}
                        </Link>
                        <p className="truncate text-xs text-faint md:hidden">
                          {client.email} · {client.defaultCurrency}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-6 py-3 text-muted-foreground md:table-cell">{client.email}</td>
                  <td className="hidden px-6 py-3 text-muted-foreground lg:table-cell">
                    {client.company ?? <span className="text-faint">—</span>}
                  </td>
                  <td className="hidden px-6 py-3 text-muted-foreground sm:table-cell">{client.defaultCurrency}</td>
                  <td className="px-2 py-3 sm:px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/clients/${client.id}/statement`}
                        className={cn(
                          "hidden rounded-lg p-2 text-faint sm:inline-flex",
                          "transition-colors hover:bg-accent hover:text-foreground"
                        )}
                        aria-label={`View statement for ${client.name}`}
                        title="View statement"
                      >
                        <FileText size={15} />
                      </Link>
                      <button
                        onClick={() => setDialogClient(client)}
                        className={cn(
                          "cursor-pointer rounded-lg p-1.5 text-faint sm:p-2",
                          "transition-colors hover:bg-accent hover:text-foreground"
                        )}
                        aria-label={`Edit ${client.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingId(client.id)}
                        className={cn(
                          "cursor-pointer rounded-lg p-1.5 text-faint sm:p-2",
                          "transition-colors hover:bg-destructive/10 hover:text-destructive"
                        )}
                        aria-label={`Delete ${client.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
              className="cursor-pointer rounded-lg border border-border p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
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
              className="cursor-pointer rounded-lg border border-border p-1.5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      {dialogClient !== null && (
        <ClientDialog
          client={dialogClient === "new" ? undefined : dialogClient}
          onClose={() => setDialogClient(null)}
          onSaved={() => setPage(1)}
        />
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl animate-in-up">
            <h2 className="text-[15px] font-medium text-foreground">Delete client?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will also delete all invoices for this client. This cannot be
              undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
                className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting…
                  </span>
                ) : (
                  "Delete client"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
