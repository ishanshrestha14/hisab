# Hisab — Product Overview

**Hisab** (हिसाब) means "account" or "calculation" in Nepali.

It is an open-source invoicing and client portal tool built for Nepali freelancers who earn in foreign currencies (USD, GBP, EUR) and need to track income in NPR.

## Problem it solves

Nepali freelancers working with international clients face three friction points:
1. **No simple tool** to create and send professional invoices in USD/GBP/EUR
2. **Currency conversion** — they need to know what they earned in NPR for tax and personal accounting
3. **Payment confirmation** — clients need a frictionless way to view invoices and confirm payment without creating an account

## Who it's for

- Freelance developers, designers, writers, and consultants based in Nepal
- Earning primarily in USD, GBP, or EUR
- Billing 1–20 clients regularly
- Want a self-hostable, open-source alternative to FreshBooks / Wave / Zoho Invoice

## Core features

| Feature | Description |
|---------|-------------|
| Client management | Add clients with name, email, company, country, default currency |
| Invoice creation | Line items, auto-numbering (INV-001…), due dates, notes |
| Currency support | USD, GBP, EUR, NPR — with live NPR conversion via exchangerate.host |
| Client portal | Public shareable link — clients view invoice and mark it as paid, no login needed |
| PDF export | Download invoice as a professionally formatted PDF |
| Email notifications | Send invoice via email, reminders, paid confirmation (via Resend) |
| Dashboard | Total invoiced, paid, outstanding, overdue count |
| Self-hostable | Docker + docker-compose for one-command deployment |

## How a typical workflow looks

1. Freelancer adds a client (name, email, currency)
2. Creates an invoice with line items
3. Clicks **Send** → client receives an email with a secure link
4. Client opens `hisab.app/portal/abc123` — no login required
5. Client clicks **Mark as Paid**
6. Freelancer sees invoice flips to PAID on dashboard

## Tech stack

- **Frontend:** React + Vite + React Router v7 + Tailwind CSS + TanStack Query
- **Backend:** Hono (Node.js)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Better Auth (email/password + Google OAuth)
- **Email:** Resend
- **PDF:** @react-pdf/renderer
- **Monorepo:** Turborepo + pnpm workspaces

## License

MIT — free to use, fork, and self-host.
