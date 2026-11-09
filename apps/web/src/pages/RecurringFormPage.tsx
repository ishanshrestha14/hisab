import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { CalendarX, Pause, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createRecurringInvoiceSchema,
  type CreateRecurringInvoiceInput,
  type Currency,
  type UpdateRecurringInvoiceInput,
} from "@hisab/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Modal, Page, PageHeader, Panel, PanelHeader, Skeleton } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status";

interface Client {
  id: string;
  name: string;
  defaultCurrency: Currency;
}

interface RecurringDetail {
  id: string;
  clientId: string;
  currency: Currency;
  interval: CreateRecurringInvoiceInput["interval"];
  nextRunAt: string;
  daysBefore: number;
  notes: string | null;
  active: boolean;
  client: { name: string; email: string };
  lineItems: { description: string; quantity: number; unitPrice: number }[];
}

const CURRENCIES = ["USD", "GBP", "EUR", "NPR"] as const;
const INTERVALS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
] as const;

const toDateInput = (d: string | Date) => new Date(d).toISOString().split("T")[0] as unknown as Date;

type FormControl = ReturnType<typeof useForm<CreateRecurringInvoiceInput>>["control"];
type FormRegister = ReturnType<typeof useForm<CreateRecurringInvoiceInput>>["register"];
type FormErrors = ReturnType<typeof useForm<CreateRecurringInvoiceInput>>["formState"]["errors"];

function LineItemsTable({
  control,
  register,
  errors,
  currency,
}: {
  control: FormControl;
  register: FormRegister;
  errors: FormErrors;
  currency: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = useWatch({ control, name: "lineItems" }) ?? [];

  return (
    <div>
      <div className="mb-2 hidden grid-cols-[1fr_88px_120px_112px] gap-2 text-xs text-faint sm:grid">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Amount</span>
      </div>
      <div className="space-y-3 sm:space-y-2">
        {fields.map((field, index) => {
          const qty = Number(lineItems[index]?.quantity) || 0;
          const price = Number(lineItems[index]?.unitPrice) || 0;
          const rowErrors = errors.lineItems?.[index];
          return (
            <div key={field.id}>
              <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-2 sm:grid-cols-[1fr_88px_120px_112px]">
                <Input
                  {...register(`lineItems.${index}.description`)}
                  placeholder="Service description"
                  aria-label="Description"
                  aria-invalid={!!rowErrors?.description}
                  className="col-span-3 sm:col-span-1"
                />
                <Input
                  {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  aria-label="Quantity"
                />
                <Input
                  {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  aria-label="Unit price"
                />
                <div className="flex h-9 items-center justify-end gap-1">
                  <span className="text-sm tabular-nums text-foreground">{formatCurrency(qty * price, currency)}</span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="cursor-pointer rounded-md p-1.5 text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <FieldError>{rowErrors?.description?.message ?? rowErrors?.quantity?.message ?? rowErrors?.unitPrice?.message}</FieldError>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm text-brand-ink hover:underline"
      >
        <Plus size={14} /> Add line item
      </button>
      {typeof errors.lineItems?.message === "string" && <FieldError>{errors.lineItems.message}</FieldError>}
    </div>
  );
}

/**
 * Create a recurring schedule (/recurring/new) or view and edit one
 * (/recurring/:id). Client and currency are fixed once a schedule exists;
 * the API's update schema does not accept them.
 */
export default function RecurringFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ["clients", 1],
    queryFn: () => api.get("/api/clients?page=1&limit=100"),
    enabled: !isEdit,
  });
  const clients = clientsData?.data ?? [];

  const {
    data: schedule,
    isLoading,
    isError,
  } = useQuery<RecurringDetail>({
    queryKey: ["recurring", id],
    queryFn: () => api.get(`/api/recurring/${id}`),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateRecurringInvoiceInput>({
    resolver: zodResolver(createRecurringInvoiceSchema),
    defaultValues: {
      currency: "USD",
      interval: "MONTHLY",
      nextRunAt: toDateInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      daysBefore: 30,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  // Load the saved schedule into the form
  useEffect(() => {
    if (!schedule) return;
    reset({
      clientId: schedule.clientId,
      currency: schedule.currency,
      interval: schedule.interval,
      nextRunAt: toDateInput(schedule.nextRunAt),
      daysBefore: schedule.daysBefore,
      notes: schedule.notes ?? "",
      lineItems: schedule.lineItems.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })),
    });
  }, [schedule, reset]);

  const currency = useWatch({ control, name: "currency" });
  const lineItems = useWatch({ control, name: "lineItems" }) ?? [];
  const total = lineItems.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring"] });
  };

  const create = useMutation({
    mutationFn: (data: CreateRecurringInvoiceInput) => api.post("/api/recurring", data),
    onSuccess: () => {
      invalidate();
      toast.success("Schedule created");
      navigate("/recurring");
    },
  });

  const update = useMutation({
    mutationFn: (data: UpdateRecurringInvoiceInput) => api.patch(`/api/recurring/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast.success("Schedule saved");
    },
  });

  const toggleActive = useMutation({
    mutationFn: (active: boolean) => api.patch(`/api/recurring/${id}`, { active }),
    onSuccess: (_, active) => {
      invalidate();
      toast.success(active ? "Schedule resumed" : "Schedule paused");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/recurring/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Schedule deleted");
      navigate("/recurring");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(data: CreateRecurringInvoiceInput) {
    if (!isEdit) return create.mutate(data);
    const { interval, nextRunAt, daysBefore, notes, lineItems } = data;
    update.mutate({ interval, nextRunAt, daysBefore, notes: notes || null, lineItems });
  }

  if (isEdit && isLoading) {
    return (
      <Page>
        <Skeleton className="mb-8 h-8 w-56" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </Page>
    );
  }

  if (isEdit && (isError || !schedule)) {
    return (
      <Page>
        <EmptyState
          icon={CalendarX}
          title="Schedule not found"
          description="It may have been deleted"
          action={
            <Link to="/recurring" className={buttonVariants()}>
              Back to recurring
            </Link>
          }
        />
      </Page>
    );
  }

  const mutationError = (isEdit ? update.error : create.error)?.message;
  const saving = isSubmitting || create.isPending || update.isPending;

  return (
    <Page className="max-w-4xl">
      <PageHeader
        back={{ to: "/recurring", label: "Recurring" }}
        title={isEdit ? schedule!.client.name : "New recurring invoice"}
        description={
          isEdit
            ? `${schedule!.active ? "Next invoice" : "Paused · would next run"} ${formatDate(schedule!.nextRunAt, "long")}`
            : "Generate an invoice for a client on a fixed schedule"
        }
        actions={
          isEdit && (
            <>
              <StatusBadge status={schedule!.active ? "ACTIVE" : "PAUSED"} className="mr-2" />
              <Button onClick={() => toggleActive.mutate(!schedule!.active)} loading={toggleActive.isPending}>
                {!toggleActive.isPending && (schedule!.active ? <Pause size={14} /> : <Play size={14} />)}
                {schedule!.active ? "Pause" : "Resume"}
              </Button>
              <Button variant="destructive-ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} />
                Delete
              </Button>
            </>
          )
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Panel>
          <PanelHeader title="Schedule" />
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {isEdit ? (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium text-foreground">Client</p>
                <p className="text-sm text-muted-foreground">
                  {schedule!.client.name} · {schedule!.client.email} · billed in {schedule!.currency}
                </p>
                <p className="mt-1 text-xs text-faint">
                  Client and currency can't be changed. Create a new schedule to bill someone else.
                </p>
              </div>
            ) : (
              <>
                <Field label="Client" htmlFor="ri-client" error={errors.clientId?.message} className="sm:col-span-2">
                  <Select
                    id="ri-client"
                    {...register("clientId")}
                    aria-invalid={!!errors.clientId}
                    onChange={(e) => {
                      register("clientId").onChange(e);
                      const client = clients.find((c) => c.id === e.target.value);
                      if (client) setValue("currency", client.defaultCurrency);
                    }}
                  >
                    <option value="">Select a client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Currency" htmlFor="ri-currency">
                  <Select id="ri-currency" {...register("currency")}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}

            <Field label="Repeats" htmlFor="ri-interval" error={errors.interval?.message}>
              <Select id="ri-interval" {...register("interval")}>
                {INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={isEdit ? "Next run date" : "First run date"}
              htmlFor="ri-next"
              error={errors.nextRunAt?.message as string | undefined}
              hint="The day the invoice is generated"
            >
              <Input id="ri-next" {...register("nextRunAt")} type="date" aria-invalid={!!errors.nextRunAt} />
            </Field>

            <Field
              label="Payment terms (days)"
              htmlFor="ri-terms"
              error={errors.daysBefore?.message}
              hint="Due date is the run date plus this many days"
            >
              <Input
                id="ri-terms"
                {...register("daysBefore", { valueAsNumber: true })}
                type="number"
                min="0"
                max="365"
                aria-invalid={!!errors.daysBefore}
              />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Line items" />
          <div className="p-4 sm:p-5">
            <LineItemsTable control={control} register={register} errors={errors} currency={currency} />
          </div>
        </Panel>

        <Panel>
          <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
            <Field label="Notes" htmlFor="ri-notes" hint="Added to each generated invoice">
              <Textarea id="ri-notes" {...register("notes")} rows={3} className="resize-none" />
            </Field>
            <div className="flex flex-col items-end justify-end">
              <p className="text-[13px] text-muted-foreground">Amount per invoice</p>
              <p className="double-rule mt-1 text-2xl font-medium tabular-nums text-foreground">
                {formatCurrency(total, currency)}
              </p>
            </div>
          </div>
        </Panel>

        <FormError>{mutationError}</FormError>

        <div className="flex justify-end gap-2">
          <Link to="/recurring" className={buttonVariants()}>
            {isEdit ? "Back" : "Cancel"}
          </Link>
          <Button type="submit" variant="primary" loading={saving} disabled={isEdit && !isDirty}>
            {isEdit ? "Save changes" : "Create schedule"}
          </Button>
        </div>
      </form>

      {confirmDelete && (
        <Modal title="Delete schedule?" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-muted-foreground">
            No more invoices will be generated for {schedule!.client.name}. Invoices already created are kept.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => remove.mutate()} loading={remove.isPending}>
              Delete schedule
            </Button>
          </div>
        </Modal>
      )}
    </Page>
  );
}
