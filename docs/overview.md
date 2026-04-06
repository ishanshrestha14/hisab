# Hisab — Product Overview

**Hisab** (हिसाब) means "account" or "calculation" in Nepali.

Open-source invoicing and client portal built for Nepali freelancers who earn in foreign currencies and need to track income in NPR. Self-hostable, MIT licensed.

---

## Problem it solves

Nepali freelancers working with international clients face three friction points:

1. **No simple tool** to create and send professional invoices in USD/GBP/EUR
2. **Currency confusion** — they need to know what they earned in NPR for tax and personal accounting
3. **Payment confirmation** — clients need a frictionless way to view invoices and confirm payment without creating an account

---

## Who it's for

- Freelance developers, designers, writers, and consultants based in Nepal
- Earning primarily in USD, GBP, or EUR
- Billing 1–20 clients regularly
- Want a self-hostable, open-source alternative to FreshBooks / Wave / Zoho Invoice

---

## Core features

| Feature | Description |
|---------|-------------|
| Client management | Add clients with name, email, company, country, default currency |
| Invoice creation | Line items, auto-numbering (INV-001…), due dates, notes |
| Currency support | USD, GBP, EUR, NPR — with live NPR conversion via open.er-api.com |
| Client portal | Public shareable link — clients view invoice and mark it as paid, no login needed |
| PDF export | Download invoice as a professionally formatted PDF |
| Email notifications | Send invoice via email, overdue reminders, paid confirmation (via Resend) |
| Dashboard | Total invoiced, paid, outstanding, overdue count — aggregated in SQL |
| Pagination | Invoice and client lists paginated with `?page=&limit=` |
| Audit logging | Every invoice mutation recorded with before/after JSON snapshots |
| Idempotent creation | `Idempotency-Key` header prevents duplicate invoices on retry |
| Self-hostable | Docker + docker-compose for one-command deployment |

---

## Typical workflow

1. Freelancer adds a client (name, email, currency)
2. Creates an invoice with line items
3. Clicks **Send** → client receives an email with a secure link
4. Client opens `/portal/abc123` — no login required
5. Client clicks **Mark as Paid**
6. Freelancer sees invoice flip to PAID on dashboard and receives a notification email

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + React Router v7 + Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query |
| Backend | Hono (Node.js, TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Auth | Better Auth (email/password + Google OAuth) |
| Validation | Zod — shared between API and frontend via `@hisab/shared` |
| Email | Resend |
| PDF | @react-pdf/renderer |
| Logging | pino (JSON in production, pretty in dev) |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Docker + docker-compose |

---

## License

MIT — free to use, fork, and self-host.
