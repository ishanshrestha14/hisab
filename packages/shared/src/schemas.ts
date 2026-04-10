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
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export const updateInvoiceSchema = createInvoiceSchema
  .omit({ clientId: true })
  .partial();

export const updateInvoiceStatusSchema = z.object({
  status: InvoiceStatusEnum,
});

// ─── Profile ──────────────────────────────────────────────────────────────────

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
export type Currency = z.infer<typeof CurrencyEnum>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;
