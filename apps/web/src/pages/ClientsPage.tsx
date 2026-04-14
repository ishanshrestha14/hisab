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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
      {initials}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors duration-150";
const inputErrorClass =
  "w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-colors duration-150";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl animate-in-up">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">
            {isEdit ? "Edit Client" : "Add Client"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
            <label className={labelClass}>Default Currency</label>
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
    <div className="p-4 sm:p-8 animate-in-up">
      <div className="mb-6 sm:mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your clients
          </p>
        </div>
        <button
          onClick={() => setDialogClient("new")}
          className="flex cursor-pointer items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
        >
          <Plus size={16} />
          Add client
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No clients yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first client to start invoicing
            </p>
            <button
              onClick={() => setDialogClient("new")}
              className="mt-4 cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              Add client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Currency</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-border last:border-0 transition-colors duration-100 hover:bg-accent/50"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={client.name} />
                      <span className="font-medium text-foreground">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{client.email}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {client.company ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {client.defaultCurrency}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/clients/${client.id}/statement`}
                        className={cn(
                          "rounded-md p-2 text-muted-foreground",
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
                          "cursor-pointer rounded-md p-2 text-muted-foreground",
                          "transition-colors hover:bg-accent hover:text-foreground"
                        )}
                        aria-label={`Edit ${client.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingId(client.id)}
                        className={cn(
                          "cursor-pointer rounded-md p-2 text-muted-foreground",
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl animate-in-up">
            <h2 className="font-semibold text-foreground">Delete client?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will also delete all invoices for this client. This cannot be
              undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
                className="cursor-pointer rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
