import { z } from "zod";

export const CurrencyEnum = z.enum(["USD", "GBP", "EUR", "NPR"]);
export const InvoiceStatusEnum = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]);

// ─── Client ───────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  company: z.string().optional(),
  country: z.string().optional(),
  defaultCurrency: CurrencyEnum.default("USD"),
});

export const updateClientSchema = createClientSchema.partial();

// ─── Invoice ──────────────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().cuid("Invalid client"),
  currency: CurrencyEnum.default("USD"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
  tdsPercent: z.number().min(0).max(100).default(0),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export const updateInvoiceSchema = createInvoiceSchema
  .omit({ clientId: true })
  .partial();

export const updateInvoiceStatusSchema = z.object({
  status: InvoiceStatusEnum,
});

// ─── Recurring Invoice ────────────────────────────────────────────────────────

export const RecurrenceIntervalEnum = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

export const createRecurringInvoiceSchema = z.object({
  clientId: z.string().cuid("Invalid client"),
  currency: CurrencyEnum.default("USD"),
  interval: RecurrenceIntervalEnum,
  nextRunAt: z.coerce.date(),
  daysBefore: z.number().int().min(0).max(365).default(30),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export const updateRecurringInvoiceSchema = z.object({
  interval: RecurrenceIntervalEnum.optional(),
  nextRunAt: z.coerce.date().optional(),
  daysBefore: z.number().int().min(0).max(365).optional(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
});

// ─── Quote ────────────────────────────────────────────────────────────────────

export const QuoteStatusEnum = z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED", "CONVERTED"]);

export const createQuoteSchema = z.object({
  clientId: z.string().cuid("Invalid client"),
  currency: CurrencyEnum.default("USD"),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export const updateQuoteSchema = createQuoteSchema
  .omit({ clientId: true })
  .partial();

export const updateQuoteStatusSchema = z.object({
  status: QuoteStatusEnum,
});

// ─── Time Entry ───────────────────────────────────────────────────────────────

export const createTimeEntrySchema = z.object({
  clientId: z.string().cuid("Invalid client"),
  description: z.string().min(1, "Description is required"),
  hours: z.number().positive("Hours must be positive"),
  hourlyRate: z.number().nonnegative("Rate must be non-negative"),
  currency: CurrencyEnum.default("USD"),
  date: z.coerce.date(),
});

export const updateTimeEntrySchema = createTimeEntrySchema.partial();

export const generateInvoiceFromTimeSchema = z.object({
  entryIds: z.array(z.string().cuid()).min(1, "Select at least one entry"),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
});

// ─── Expense ──────────────────────────────────────────────────────────────────

export const ExpenseCategoryEnum = z.enum([
  "SOFTWARE",
  "HARDWARE",
  "TRAVEL",
  "MEALS",
  "OFFICE",
  "MARKETING",
  "PROFESSIONAL_SERVICES",
  "OTHER",
]);

export const createExpenseSchema = z.object({
  category: ExpenseCategoryEnum.default("OTHER"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: CurrencyEnum.default("USD"),
  date: z.coerce.date(),
  clientId: z.string().cuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// ─── Payment ──────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paidAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// ─── Profile ──────────────────────────────────────────────────────────────────

export const InvoiceTemplateEnum = z.enum(["classic", "modern", "minimal", "ird"]);

export const updateProfileSchema = z.object({
  pan: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform((v) => v || null),
  vatNumber: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform((v) => v || null),
  logoUrl: z
    .string()
    .url("Must be a valid URL")
    .max(500)
    .optional()
    .nullable()
    .transform((v) => v || null),
  invoiceTemplate: InvoiceTemplateEnum.optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type InvoiceTemplate = z.infer<typeof InvoiceTemplateEnum>;
export type CreateRecurringInvoiceInput = z.infer<typeof createRecurringInvoiceSchema>;
export type UpdateRecurringInvoiceInput = z.infer<typeof updateRecurringInvoiceSchema>;
export type RecurrenceInterval = z.infer<typeof RecurrenceIntervalEnum>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteStatus = z.infer<typeof QuoteStatusEnum>;
export type Currency = z.infer<typeof CurrencyEnum>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type GenerateInvoiceFromTimeInput = z.infer<typeof generateInvoiceFromTimeSchema>;
export type ExpenseCategory = z.infer<typeof ExpenseCategoryEnum>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
