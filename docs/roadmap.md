# Hisab — Roadmap

## Build history

| Phase | Status | Focus |
|-------|--------|-------|
| Week 1 | ✅ | Monorepo, Prisma schema, Better Auth (email + Google), login/signup UI |
| Week 2 | ✅ | Client CRUD, invoice creation form, auto invoice numbering |
| Week 3 | ✅ | Invoice list + status tabs, NPR conversion, dashboard stats |
| Week 4 | ✅ | Client portal (`/portal/:token`), PDF export, Mark as Paid flow |
| Week 5 | ✅ | Resend email, overdue cron job, UI polish |
| Week 6 | ✅ | Docker + docker-compose, README, `.env.example`, Railway + Vercel deploy |
| Portfolio upgrade | ✅ | P1–P4 improvements — see below |
| Production hardening | ✅ | Security, reliability, observability — see below |
| Product features | 🟡 | Templates, quotes, recurring, TDS, fiscal reports, IRD format, payments, expenses, time — see below |
| UI redesign & correctness | ✅ | Design system, multi-currency and TDS fixes, PDF fonts (Nov 2026) — see below |

---

## Portfolio upgrade (P1–P4)

### P1 — Quick wins ✅
- Database indexes on `Invoice`, `Client`, `LineItem` for common query patterns
- Fixed send-invoice operation order — status updates before email (email is best-effort)
- Environment validation at startup via Zod (`lib/env.ts`)
- Error boundary on cron job with structured logging

### P2 — Structural improvements ✅
- Standardized error responses — `{ error: { code, message } }` everywhere via `lib/errors.ts`
- Rate limiting on public portal — `hono-rate-limiter` (30 req/15min GET, 5 req/hr mark-paid)
- Fixed invoice number race condition — `MAX()` raw query inside `$transaction` + `@@unique([userId, number])`
- Dashboard SQL aggregation — `$queryRaw` replaces in-memory `findMany` + reduce

### P3 — Senior-level features ✅
- Audit logging — `AuditLog` model, `lib/audit.ts`, instrumented on all 5 invoice mutation routes
- Idempotent invoice creation — `IdempotencyKey` model + middleware, 24h TTL, `Idempotency-Key` header
- Event bus — typed `EventBus` in `lib/events.ts`; email decoupled from route handlers via listeners

### P4 — Polish ✅
- Pagination — `GET /api/invoices` and `GET /api/clients` return `{ data, pagination }`
- Health check — `/health` verifies DB connectivity with `SELECT 1`
- ExchangeRate userId cleanup — cache is global; removed `userId` column and relation

---

## Production hardening ✅

Done after P4:

- Frontend pagination — `InvoicesPage`, `ClientsPage`, `InvoiceNewPage` updated to consume `{ data, pagination }`
- Auth rate limiting — 10 req/15min per IP on `/api/auth/sign-in/*`
- Security headers — `hono/secure-headers` globally (`X-Frame-Options`, CSP, etc.)
- Graceful shutdown — `SIGTERM`/`SIGINT` drain in-flight requests, disconnect Prisma, exit cleanly
- Structured logging — `pino` (`lib/logger.ts`); JSON in production, pretty-print in dev
- CI/CD — `.github/workflows/ci.yml` typechecks and lints on every PR and push to main

---

## Product features

Built to compete with Zoho Invoice, Invoice Ninja and InvoicePlane for Nepali freelancers.

- [x] PDF invoice templates (classic, modern, minimal, IRD) with logo and accent colour
- [x] PAN / VAT on profile, PDF and portal
- [x] Quotes / estimates with one-click conversion to an invoice
- [x] Recurring invoices on a schedule (weekly, monthly, quarterly, yearly), with view/edit
- [x] TDS per invoice; invoices settle at the net receivable
- [x] Nepali fiscal-year reports (Shrawan–Ashad)
- [x] IRD-compatible invoice format (BS date, amount in words, Devanagari labels)
- [x] Client statement page and PDF
- [x] Partial payments and payment history
- [x] Expense tracking
- [x] Time tracking → invoice from timesheet
- [ ] eSewa / Khalti / ConnectIPS payment links on the portal
- [ ] Multi-user / team roles (owner, accountant, viewer)

---

## UI redesign & correctness fixes ✅

November 2026, PRs #1 and #2. Design brief in [`UNSLOP.md`](../UNSLOP.md).

**Design system**
- Warm graphite neutrals; amber (`brand-500`) is an accent only and carries dark text for contrast
- Shared components in `apps/web/src/components/ui/` (button, fields, status, layout, table, modal, money)
- Status shown as dot + label; the accountant's double rule marks final totals
- `InvoiceDocument` renders the invoice once for both the detail page and the client portal
- Responsive portal, statement and list pages; a single theme store shared by every toggle
- Favicon and touch icon matching the logo mark

**Money correctness**
- Dashboard and fiscal-year report never add currencies together: per-currency totals plus NPR conversion
- Overdue count counts invoices, not line items
- Invoice and quote lists filter by status on the server, with counts across all pages
- TDS invoices settle at the net receivable (paying the net marks them PAID)
- Collected / outstanding / statement balance include partial payments, via a shared `settlement()` rule
- Portal includes the sender's name; API error messages reach the UI instead of `[object Object]`

**PDFs**
- Bundled Inter and Noto Sans Devanagari TTFs; the previous Google Fonts subsets dropped glyphs
- Template margins are applied (classic, minimal and IRD printed edge to edge)

---

## Planned

- [ ] eSewa / Khalti / ConnectIPS payment links on the portal
- [ ] Multi-user / team roles
- [ ] Webhook notifications for invoice events (`invoice.created`, `invoice.paid`)
- [ ] Multi-language support (Nepali / English)
- [ ] CSV/Excel data export
- [ ] Background job queue (BullMQ + Redis) for email and cron at scale
- [ ] Services layer — continue extracting route logic into `src/services/` (done: `invoice-calc`, `numbering`, `fiscal-year`, `recurrence`)
- [ ] Integration tests against a real DB, and Playwright end-to-end tests in CI (unit and route tests exist: 187 with mocked Prisma)
