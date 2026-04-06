import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
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
      onSaved?.();
      onClose();
    },
  });

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand";
  const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
  const errorClass = "mt-1 text-xs text-destructive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">
            {isEdit ? "Edit Client" : "Add Client"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
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
            <input {...register("name")} placeholder="Jane Doe" className={inputClass} />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input {...register("email")} type="email" placeholder="jane@example.com" className={inputClass} />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Company</label>
              <input {...register("company")} placeholder="Acme Inc." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input {...register("country")} placeholder="United States" className={inputClass} />
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

          {mutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add client"}
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
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your clients
          </p>
        </div>
        <button
          onClick={() => setDialogClient("new")}
          className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus size={16} />
          Add client
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : clients.length === 0 && !isLoading ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No clients yet.</p>
            <button
              onClick={() => setDialogClient("new")}
              className="mt-2 text-sm text-brand hover:underline"
            >
              Add your first client
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Name</th>
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
                  className="border-b border-border last:border-0 hover:bg-accent/50"
                >
                  <td className="px-6 py-3 font-medium text-foreground">
                    {client.name}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {client.email}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {client.company ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {client.defaultCurrency}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDialogClient(client)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingId(client.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded-md border border-border p-1.5 hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1">Page {page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pagination.totalPages}
              className="rounded-md border border-border p-1.5 hover:bg-accent disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="font-semibold text-foreground">Delete client?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will also delete all invoices for this client. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
