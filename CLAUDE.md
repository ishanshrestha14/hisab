# Hisab — Claude Context

## What this is
Invoicing and client portal tool for Nepali freelancers earning in foreign currencies. Open-source, MIT licensed, self-hostable via Docker.

## Tech stack (non-negotiable)
- **Frontend:** React + Vite + React Router v7 + Tailwind CSS + shadcn/ui + TanStack Query
- **Backend:** Hono (Node.js) — NOT Express
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Better Auth (email/password + Google OAuth) — NOT NextAuth, NOT Lucia
- **Email:** Resend
- **PDF:** @react-pdf/renderer
- **Monorepo:** Turborepo + pnpm workspaces

## Monorepo structure
```
apps/web          React + Vite frontend         :5173
apps/api          Hono backend                  :3001
packages/db       Prisma schema + client
packages/shared   Zod schemas shared across api and web
```

## Running locally
```bash
pnpm install
pnpm --filter @hisab/db db:migrate   # requires DATABASE_URL in .env
pnpm dev                              # starts all apps via turbo
```

## Key conventions

### Always
- TypeScript everywhere — no plain `.js` files
- Zod validation on all API inputs via `@hono/zod-validator`
- All Prisma queries type-safe — no raw SQL unless absolutely necessary
- `credentials: "include"` on all `fetch` calls (Better Auth uses HTTP-only cookies)
- Mobile responsive on all pages

### Never
- `localStorage` for auth — Better Auth handles sessions via HTTP-only cookies
- `Next.js`, `Express`, `NextAuth`, `Lucia`
- Raw SQL unless Prisma cannot express the query

### API patterns (Hono)
- Each route group is its own `Hono` instance in `apps/api/src/routes/`
- Mounted in `apps/api/src/index.ts` with `app.route()`
- Auth guard: `app.use("/api/clients/*", requireAuth)` before mounting
- Zod validation: `zValidator("json", schema)` as route middleware
- Always check resource ownership before update/delete: `findFirst({ where: { id, userId } })`
- Error responses: always use `apiError(c, "NOT_FOUND", "message")` from `lib/errors.ts` — never `c.json({ error: "..." })`
- Logging: use `logger` from `lib/logger.ts` — never `console.log/error`
- Side-effects (email): emit via `eventBus` from `lib/events.ts` — never import email functions directly in routes
- Audit trail: call `audit(...)` from `lib/audit.ts` after any invoice mutation

### Testing (Vitest)
- `pnpm test` runs all projects (`api`, `web`, `shared`); `pnpm test:coverage` for coverage; CI runs it on every PR
- Test files live next to the code: `foo.ts` → `foo.test.ts`
- Pure business logic belongs in `apps/api/src/services/` and gets unit tests (no mocks needed)
- Route tests use Hono's `app.request()` with Prisma mocked: `vi.mock("@hisab/db", () => import("../test/prisma-mock"))`
- Also mock `../lib/audit` and `../lib/events` in route tests; assert on `audit` / `eventBus.emit` calls

### Frontend patterns
- Data fetching via TanStack Query (`useQuery` / `useMutation`)
- Forms via `react-hook-form` + `zodResolver` using schemas from `@hisab/shared`
- API calls via `src/lib/api.ts` wrapper (handles credentials and JSON)
- Auth state via `useSession()` from `src/lib/auth-client.ts`
- Utility: `cn()` from `src/lib/utils.ts` for merging Tailwind classes
- UI building blocks from `src/components/ui/` (`Button`, `Field`/`Input`/`Select`, `StatusBadge`, `Page`/`PageHeader`/`Panel`, `Table`/`Pager`, `Modal`, `Money`/`TotalFigure`) — don't redefine `inputClass` or status colour maps per page
- Dates via `formatDate(date, "short" | "long" | "month")` from `src/lib/utils.ts`
- List filters and pagination live in the URL (`useSearchParams`) and are applied by the API, never client-side on one page
- Theme via `useTheme()` from `src/lib/theme.ts` (one shared store)

### Money rules
- Never add amounts in different currencies. Show per-currency figures, or convert each to NPR first (`byCurrency` + `*NPR` fields from the API)
- TDS invoices settle at the **net receivable** (gross − TDS); balances, overpayment checks and auto-PAID all use it
- Collected / outstanding follow `settlement()` in `apps/api/src/services/invoice-calc.ts`: PAID → net collected; SENT/OVERDUE → payments collected, net − payments owed; DRAFT → neither. Mirror it in any new SQL aggregate

## Workspace packages
- `@hisab/db` — import `prisma` client and Prisma-generated types
- `@hisab/shared` — import Zod schemas and inferred TypeScript types

## Database schema summary
Models: `User`, `Session`, `Account`, `Verification`, `Client`, `Invoice`, `LineItem`, `Payment`, `Quote`, `RecurringInvoice`, `Expense`, `TimeEntry`, `ExchangeRate`, `AuditLog`, `IdempotencyKey` (see `schema.prisma` for the full list)
Enums: `Currency` (USD, GBP, EUR, NPR), `InvoiceStatus` (DRAFT, SENT, PAID, OVERDUE)

Key: `Invoice.token` is the public cuid used for `/portal/:token` — never expose `Invoice.id` publicly.

- `AuditLog` — tracks every invoice mutation (create/update/delete/status-change/send) with `before`/`after` JSON snapshots
- `IdempotencyKey` — caches `POST /api/invoices` responses by `(key, userId)` for 24h; prevents duplicate invoices on retry
- `ExchangeRate` — global daily cache (no userId); `@@unique([base, date])`

## Public portal
`GET /api/portal/:token` and `POST /api/portal/:token/mark-paid` are unauthenticated — no `requireAuth` middleware. The client portal page (`/portal/:token` in the web app) must work with zero cookies.

## Design
- Design brief: `UNSLOP.md`. Tokens in `apps/web/src/index.css` + `tailwind.config.ts`
- Surfaces: warm graphite neutrals; text roles `foreground` / `muted-foreground` / `faint`
- Accent: amber (`brand-500` = `#f59e0b`) used sparingly — primary action, selection, one key figure. Amber fills carry dark text (`text-primary-foreground`); amber as text uses `text-brand-ink`
- Semantic colours: `positive` / `negative` only for meaning (paid, overdue, errors)
- Status is a dot + label (`StatusBadge`), not a filled pill. The double rule (`.double-rule`, `TotalFigure`) marks only a document's final total
- Sentence case, weights 400–600, `tabular-nums` on amounts, named transitions (no `transition-all`), one easing curve
- Dark mode via Tailwind `dark:` classes (class strategy); the client portal always renders light
- Font: Inter (Google Fonts in `index.html`). PDFs use bundled TTFs registered in `apps/web/src/components/pdf-fonts.ts` (Inter + Noto Sans Devanagari); wrap Devanagari in PDFs with the `devanagari` style
- The Devanagari "हिसाब" appears alongside "Hisab" in logo/header; favicon in `apps/web/public/`

## Environment variables
See `.env.example` at root. Copy to `.env` before running.
Required for Week 1: `DATABASE_URL`, `BETTER_AUTH_SECRET`
Optional for Week 1: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Roadmap

| Week | Focus |
|------|-------|
| 1 ✅ | Monorepo init, Prisma schema + migrations, Better Auth (email + Google), login/signup UI |
| 2 ✅ | Client CRUD (API + UI), Invoice creation form with live totals, auto invoice numbering |
| 3 ✅ | Invoice list + status tabs, NPR conversion (open.er-api.com + DB cache), dashboard stats |
| 4 ✅ | Client portal (public `/portal/:token`), PDF export, "Mark as Paid" flow |
| 5 ✅ | Resend email (send invoice, reminder, paid notification), overdue cron job, polish |
| 6 ✅ | Docker + docker-compose, README, `.env.example`, Vercel + Railway deploy, GitHub launch |

### Key decisions
- Shared UI components live in `apps/web/src/components/ui/` (a separate `packages/ui` was planned but never created; only one app uses them)
- `packages/shared` — Zod schemas defined once, imported in both API (validation) and web (form types)
- `tsx` for running TypeScript in the API during dev
- `date-fns` for date math (due dates, overdue detection)
- Email (Resend) ships in Week 5 so Week 6 is purely infra + launch prep

---

## Portfolio Upgrade Plan

Full codebase review done 2026-04-05. README rewritten, CONTRIBUTING.md created, GitHub issue/PR templates added, LICENSE file added. Below are the remaining code improvements, ordered by priority.

### P1 — Quick Wins ✅

- [x] **Add database indexes** — Added `@@index` to Invoice, Client, LineItem in `schema.prisma`. Run `pnpm --filter @hisab/db db:migrate` to apply
- [x] **Fix send-invoice operation order** — Status updates before email now. Email is fire-and-forget
- [x] **Add environment validation** — `apps/api/src/lib/env.ts` validates all env vars at startup via Zod
- [x] **Add error boundary to cron job** — Wrapped in try/catch with structured logging

### P2 — Structural Improvements ✅

- [x] **Standardize error responses** — `apps/api/src/lib/errors.ts` with `apiError(c, code, message)` returning `{ error: { code, message } }`. Used across all routes and auth middleware
- [x] **Rate limiting on public portal** — `hono-rate-limiter` installed. 30 req/15min GET, 5 req/hr mark-paid per IP via `x-forwarded-for`
- [x] **Fix invoice number race condition** — `MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER))` raw query inside `$transaction`. `@@unique([userId, number])` constraint added to schema
- [x] **Dashboard SQL aggregation** — Two `$queryRaw` queries (totals + paid-by-currency) replace the full `findMany`. `findMany` kept only for 5 recent invoices

### P3 — Senior-Level Features ✅

- [x] **Audit logging** — `AuditLog` model added to schema. `apps/api/src/lib/audit.ts` with fire-and-forget `audit()`. Instrumented all 5 invoice mutation routes
- [x] **Idempotent invoice creation** — Add `IdempotencyKey` model. Create middleware that caches responses by `Idempotency-Key` header with 24h TTL
- [x] **Event bus** — `apps/api/src/lib/events.ts` with typed `EventBus`. `invoice.sent` + `invoice.paid` emitted from routes. Email listeners registered via `apps/api/src/lib/listeners.ts` at startup

### P4 — Polish ✅

- [x] **Pagination** — Add `page`/`limit` query params to GET /api/invoices and GET /api/clients. Return `{ data, pagination }`
- [x] **Health check improvement** — Make `/health` verify DB connectivity with a simple Prisma query
- [x] **Clean up ExchangeRate userId** — Remove userId from ExchangeRate (cache is global) or make lookups consistent

### Production Readiness ✅

Done after P4 — these weren't in the original plan but were needed before real deployment.

- [x] **Frontend pagination** — `InvoicesPage`, `ClientsPage`, `InvoiceNewPage` updated to unwrap `{ data, pagination }`. Prev/next controls added
- [x] **Auth rate limiting** — 10 req/15min per IP on `/api/auth/sign-in/*`
- [x] **Security headers** — `hono/secure-headers` applied globally (`X-Frame-Options`, CSP, etc.)
- [x] **Graceful shutdown** — `SIGTERM`/`SIGINT` stop the server, disconnect Prisma, exit cleanly
- [x] **Structured logging** — `pino` in `apps/api/src/lib/logger.ts`; JSON in prod, pretty in dev; all `console.error` calls replaced
- [x] **CI/CD** — `.github/workflows/ci.yml` typechecks API + web and runs lint on every PR/push to main

### Architecture Note

Extract business logic from route handlers into `apps/api/src/services/` as you touch routes. Don't do it as a standalone refactor — do it incrementally. Even 2-3 services (InvoiceService, AuditService) are enough to demonstrate the pattern.

---

## Product Roadmap — Competing with Zoho Invoice / Invoice Ninja / InvoicePlane

Goal: become the go-to open-source invoicing tool for Nepali freelancers and small businesses earning in foreign currencies.

### Phase 1 — Close the basics gap

- [x] **PDF invoice templates** — multiple designs, logo upload, customizable colors
- [x] **PAN / VAT number** — add fields to User profile and render on PDF/portal
- [x] **Quotes / Estimates** — create a quote, convert to invoice in one click
- [x] **Recurring invoices** — weekly/monthly auto-generation with cron

### Phase 2 — Nepal moat (nobody else does this)

- [x] **TDS tracking** — per-invoice TDS amount withheld by client (15% standard rate); show net receivable vs gross
- [ ] **eSewa / Khalti / ConnectIPS payment links** — generate a payment link on the portal so Nepali clients can pay directly
- [x] **Nepali fiscal year reports** — revenue summary aligned to Shrawan–Ashad (mid-July to mid-July)
- [x] **IRD-compatible invoice format** — layout and fields required by Nepal's Inland Revenue Department
### Phase 3 — Compete on UX

- [x] **Client statement page** — all invoices for a client in one view, downloadable
- [x] **Partial payments + payment history** — track multiple payments against one invoice
- [x] **Expense tracking** — log expenses, attach to projects/clients
- [x] **Time-based invoicing** — log hours → generate invoice from timesheet
- [ ] **Multi-user / team roles** — owner, accountant, viewer permissions

---

## UI Redesign & Correctness Fixes ✅

Done 2026-11-09 (PRs #1, #2). Audit and design direction from `UNSLOP.md`; full changelog in `docs/roadmap.md`.

- [x] Design system: tokens, shared `components/ui/`, every screen restyled, mobile layouts for list pages
- [x] Multi-currency: dashboard and fiscal-year report return per-currency + NPR totals (no mixed sums)
- [x] Overdue count uses `COUNT(DISTINCT)`; invoice + quote lists filter by `?status=` with `counts`
- [x] TDS invoices settle at net receivable; partial payments count in collected/outstanding/statement balance
- [x] Recurring schedules: view/edit page at `/recurring/:id`
- [x] PDFs: bundled fonts (glyphs were missing), template margins applied
- [x] Web `tsconfig` has `noEmit` (build used to write `.js` into `src/`)
- [x] Favicon + apple-touch-icon

### Open follow-ups
- [ ] Convert historical collections at the rate on the payment date (reports use today's rate)
- [ ] Portal "Mark as paid" sets PAID without a payment record — consider recording a payment
- [ ] Show partially-paid state in invoice lists (status stays SENT/OVERDUE)
- [ ] Hand-polish forms the codemod only restyled: `InvoiceNewPage`, `QuoteNewPage`, `QuoteDetailPage`, expense/time dialogs
- [ ] Drop the legacy mixed-currency fields (`totalInvoiced`/`totalPaid`/`totalOutstanding`) once no client reads them
- [ ] Playwright end-to-end tests in CI (Playwright is installed; checks so far were ad hoc)
- [ ] `pnpm db:seed` with a demo account for local testing

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
