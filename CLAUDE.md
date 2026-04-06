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

### Frontend patterns
- Data fetching via TanStack Query (`useQuery` / `useMutation`)
- Forms via `react-hook-form` + `zodResolver` using schemas from `@hisab/shared`
- API calls via `src/lib/api.ts` wrapper (handles credentials and JSON)
- Auth state via `useSession()` from `src/lib/auth-client.ts`
- Utility: `cn()` from `src/lib/utils.ts` for merging Tailwind classes

## Workspace packages
- `@hisab/db` — import `prisma` client and Prisma-generated types
- `@hisab/shared` — import Zod schemas and inferred TypeScript types

## Database schema summary
Models: `User`, `Session`, `Account`, `Verification`, `Client`, `Invoice`, `LineItem`, `ExchangeRate`
Enums: `Currency` (USD, GBP, EUR, NPR), `InvoiceStatus` (DRAFT, SENT, PAID, OVERDUE)

Key: `Invoice.token` is the public cuid used for `/portal/:token` — never expose `Invoice.id` publicly.

## Public portal
`GET /api/portal/:token` and `POST /api/portal/:token/mark-paid` are unauthenticated — no `requireAuth` middleware. The client portal page (`/portal/:token` in the web app) must work with zero cookies.

## Design
- Accent color: amber (`brand-500` = `#f59e0b`)
- Dark mode via Tailwind `dark:` classes (class strategy)
- Font: Inter (loaded from Google Fonts in `index.html`)
- The Devanagari "हिसाब" appears alongside "Hisab" in logo/header

## Environment variables
See `.env.example` at root. Copy to `.env` before running.
Required for Week 1: `DATABASE_URL`, `BETTER_AUTH_SECRET`
Optional for Week 1: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Roadmap

| Week | Focus |
|------|-------|
| 1 ✅ | Monorepo init, Prisma schema + migrations, Better Auth (email + Google), login/signup UI |
| 2 ✅ | Client CRUD (API + UI), Invoice creation form with live totals, auto invoice numbering |
| 3 ✅ | Invoice list + status tabs, NPR conversion (exchangerate.host + DB cache), dashboard stats |
| 4 ✅ | Client portal (public `/portal/:token`), PDF export, "Mark as Paid" flow |
| 5 ✅ | Resend email (send invoice, reminder, paid notification), overdue cron job, polish |
| 6 ✅ | Docker + docker-compose, README, `.env.example`, Vercel + Railway deploy, GitHub launch |

### Key decisions
- `packages/ui` — shadcn components installed once, shared across apps (future-proofing)
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

### P4 — Polish

- [x] **Pagination** — Add `page`/`limit` query params to GET /api/invoices and GET /api/clients. Return `{ data, pagination }`
- [x] **Health check improvement** — Make `/health` verify DB connectivity with a simple Prisma query
- [x] **Clean up ExchangeRate userId** — Remove userId from ExchangeRate (cache is global) or make lookups consistent

### Architecture Note

Extract business logic from route handlers into `apps/api/src/services/` as you touch routes for the fixes above. Don't do it as a standalone refactor — do it incrementally. Even 2-3 services (InvoiceService, AuditService) are enough to demonstrate the pattern.

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
