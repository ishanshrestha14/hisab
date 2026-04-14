import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { createInvoiceSchema, type CreateInvoiceInput, type Currency } from "@hisab/shared";

interface Client {
  id: string;
  name: string;
  defaultCurrency: Currency;
}

const CURRENCIES = ["USD", "GBP", "EUR", "NPR"] as const;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
const errorClass = "mt-1 text-xs text-destructive";

function LineItemsTable({
  control,
  register,
  errors,
}: {
  control: ReturnType<typeof useForm<CreateInvoiceInput>>["control"];
  register: ReturnType<typeof useForm<CreateInvoiceInput>>["register"];
  errors: ReturnType<typeof useForm<CreateInvoiceInput>>["formState"]["errors"];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = useWatch({ control, name: "lineItems" }) ?? [];

  const subtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0
  );

  return (
    <div>
      <div className="mb-2 grid grid-cols-[1fr_100px_120px_80px] gap-2 text-xs font-medium text-muted-foreground">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit Price</span>
        <span className="text-right">Total</span>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => {
          const qty = Number(lineItems[index]?.quantity) || 0;
          const price = Number(lineItems[index]?.unitPrice) || 0;
          const total = qty * price;

          return (
            <div key={field.id} className="grid grid-cols-[1fr_100px_120px_80px] items-start gap-2">
              <div>
                <input
                  {...register(`lineItems.${index}.description`)}
                  placeholder="Service description"
                  className={inputClass}
                />
                {errors.lineItems?.[index]?.description && (
                  <p className={errorClass}>{errors.lineItems[index].description?.message}</p>
                )}
              </div>
              <div>
                <input
                  {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1"
                  className={inputClass}
                />
                {errors.lineItems?.[index]?.quantity && (
                  <p className={errorClass}>{errors.lineItems[index].quantity?.message}</p>
                )}
              </div>
              <div>
                <input
                  {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={inputClass}
                />
                {errors.lineItems?.[index]?.unitPrice && (
                  <p className={errorClass}>{errors.lineItems[index].unitPrice?.message}</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 pt-2">
                <span className="text-sm font-medium text-foreground">
                  {total.toFixed(2)}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
          className="flex items-center gap-1.5 text-sm text-brand hover:underline"
        >
          <Plus size={14} />
          Add line item
        </button>
        <div className="text-right">
          <span className="text-sm text-muted-foreground">Subtotal: </span>
          <span className="text-sm font-semibold text-foreground">
            {subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      {errors.lineItems?.root && (
        <p className={errorClass}>{errors.lineItems.root.message}</p>
      )}
      {typeof errors.lineItems?.message === "string" && (
        <p className={errorClass}>{errors.lineItems.message}</p>
      )}
    </div>
  );
}

export default function InvoiceNewPage() {
  const navigate = useNavigate();

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ["clients", 1],
    queryFn: () => api.get("/api/clients?page=1&limit=100"),
  });
  const clients = clientsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currency: "USD",
      issueDate: new Date().toISOString().split("T")[0] as unknown as Date,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0] as unknown as Date,
      tdsPercent: 0,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const selectedCurrency = watch("currency");
  const tdsPercent = Number(watch("tdsPercent")) || 0;
  const lineItems = watch("lineItems") ?? [];
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0
  );
  const tdsAmount = subtotal * (tdsPercent / 100);
  const netReceivable = subtotal - tdsAmount;

  const mutation = useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.post("/api/invoices", data),
    onSuccess: () => navigate("/invoices"),
  });

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const client = clients.find((c) => c.id === e.target.value);
    if (client) setValue("currency", client.defaultCurrency);
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">New Invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details to create an invoice
        </p>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div className="space-y-6">
          {/* Client + currency + dates */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-medium text-foreground">Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Client *</label>
                <select
                  {...register("clientId")}
                  onChange={(e) => {
                    register("clientId").onChange(e);
                    handleClientChange(e);
                  }}
                  className={inputClass}
                >
                  <option value="">Select a client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className={errorClass}>{errors.clientId.message}</p>
                )}
                {clients.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No clients yet.{" "}
                    <a href="/clients" className="text-brand hover:underline">Add one first</a>
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Currency</label>
                <select {...register("currency")} className={inputClass}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div />

              <div>
                <label className={labelClass}>Issue Date *</label>
                <input
                  {...register("issueDate")}
                  type="date"
                  className={inputClass}
                />
                {errors.issueDate && (
                  <p className={errorClass}>{errors.issueDate.message as string}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Due Date *</label>
                <input
                  {...register("dueDate")}
                  type="date"
                  className={inputClass}
                />
                {errors.dueDate && (
                  <p className={errorClass}>{errors.dueDate.message as string}</p>
                )}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-medium text-foreground">Line Items</h2>
            <LineItemsTable control={control} register={register} errors={errors} />
          </div>

          {/* Notes + TDS + total */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    {...register("notes")}
                    rows={3}
                    placeholder="Payment terms, bank details, etc."
                    className={inputClass + " resize-none"}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    TDS Rate (%)
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      Nepal standard: 15%
                    </span>
                  </label>
                  <input
                    {...register("tdsPercent", { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leave at 0 if client does not withhold TDS
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end justify-end gap-2">
                {tdsPercent > 0 ? (
                  <div className="w-full max-w-[220px] space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Gross</span>
                      <span>{formatCurrency(subtotal, selectedCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>TDS ({tdsPercent}%)</span>
                      <span>−{formatCurrency(tdsAmount, selectedCurrency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
                      <span>Net Receivable</span>
                      <span>{formatCurrency(netReceivable, selectedCurrency)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {formatCurrency(subtotal, selectedCurrency)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {mutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/invoices")}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="rounded-md bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {mutation.isPending ? "Creating…" : "Create Invoice"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
