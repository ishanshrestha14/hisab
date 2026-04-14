import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  createRecurringInvoiceSchema,
  type CreateRecurringInvoiceInput,
  type Currency,
} from "@hisab/shared";

interface Client {
  id: string;
  name: string;
  defaultCurrency: Currency;
}

const CURRENCIES = ["USD", "GBP", "EUR", "NPR"] as const;
const INTERVALS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
] as const;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
const errorClass = "mt-1 text-xs text-destructive";

function LineItemsTable({
  control,
  register,
  errors,
}: {
  control: ReturnType<typeof useForm<CreateRecurringInvoiceInput>>["control"];
  register: ReturnType<typeof useForm<CreateRecurringInvoiceInput>>["register"];
  errors: ReturnType<typeof useForm<CreateRecurringInvoiceInput>>["formState"]["errors"];
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
        <span>Description</span><span>Qty</span><span>Unit Price</span><span className="text-right">Total</span>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => {
          const qty = Number(lineItems[index]?.quantity) || 0;
          const price = Number(lineItems[index]?.unitPrice) || 0;
          return (
            <div key={field.id} className="grid grid-cols-[1fr_100px_120px_80px] items-start gap-2">
              <input {...register(`lineItems.${index}.description`)} placeholder="Service description" className={inputClass} />
              <input {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })} type="number" min="0" step="0.01" placeholder="1" className={inputClass} />
              <input {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })} type="number" min="0" step="0.01" placeholder="0.00" className={inputClass} />
              <div className="flex items-center justify-end gap-1 pt-2">
                <span className="text-sm font-medium text-foreground">{(qty * price).toFixed(2)}</span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })} className="flex items-center gap-1.5 text-sm text-brand hover:underline">
          <Plus size={14} /> Add line item
        </button>
        <span className="text-sm text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">{subtotal.toFixed(2)}</span></span>
      </div>
      {typeof errors.lineItems?.message === "string" && <p className={errorClass}>{errors.lineItems.message}</p>}
    </div>
  );
}

export default function RecurringNewPage() {
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
  } = useForm<CreateRecurringInvoiceInput>({
    resolver: zodResolver(createRecurringInvoiceSchema),
    defaultValues: {
      currency: "USD",
      interval: "MONTHLY",
      nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0] as unknown as Date,
      daysBefore: 30,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const selectedCurrency = watch("currency");
  const lineItems = watch("lineItems") ?? [];
  const total = lineItems.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0
  );

  const mutation = useMutation({
    mutationFn: (data: CreateRecurringInvoiceInput) => api.post("/api/recurring", data),
    onSuccess: () => navigate("/recurring"),
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">New Recurring Invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up automatic invoice generation for a client
        </p>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-medium text-foreground">Schedule</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Client *</label>
                <select
                  {...register("clientId")}
                  onChange={(e) => {
                    register("clientId").onChange(e);
                    const client = clients.find((c) => c.id === e.target.value);
                    if (client) setValue("currency", client.defaultCurrency);
                  }}
                  className={inputClass}
                >
                  <option value="">Select a client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.clientId && <p className={errorClass}>{errors.clientId.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Currency</label>
                <select {...register("currency")} className={inputClass}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Interval</label>
                <select {...register("interval")} className={inputClass}>
                  {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
                {errors.interval && <p className={errorClass}>{errors.interval.message}</p>}
              </div>

              <div>
                <label className={labelClass}>First Run Date *</label>
                <input {...register("nextRunAt")} type="date" className={inputClass} />
                {errors.nextRunAt && <p className={errorClass}>{errors.nextRunAt.message as string}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground">When the first invoice will be generated</p>
              </div>

              <div>
                <label className={labelClass}>Payment terms (days)</label>
                <input
                  {...register("daysBefore", { valueAsNumber: true })}
                  type="number" min="0" max="365"
                  className={inputClass}
                />
                {errors.daysBefore && <p className={errorClass}>{errors.daysBefore.message}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground">Due date = run date + this many days</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-medium text-foreground">Line Items</h2>
            <LineItemsTable control={control} register={register} errors={errors} />
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Notes</label>
                <textarea {...register("notes")} rows={3} placeholder="Added to each generated invoice" className={inputClass + " resize-none"} />
              </div>
              <div className="flex flex-col items-end justify-end">
                <p className="text-sm text-muted-foreground">Amount per invoice</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{formatCurrency(total, selectedCurrency)}</p>
              </div>
            </div>
          </div>

          {mutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{mutation.error.message}</p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/recurring")} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="rounded-md bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {mutation.isPending ? "Creating…" : "Create Schedule"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
