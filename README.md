# Hisab — हिसाब

**Invoicing and client portal built for Nepali freelancers earning in foreign currencies.**

Hisab lets you create professional invoices in USD, GBP, or EUR, auto-converts to NPR at live exchange rates, and gives each client a branded payment portal — no login required. Stop juggling Google Docs, WhatsApp screenshots, and mental math. One tool, from invoice to payment.

> *हिसाब (hisab) — Nepali for "account" or "calculation"*

**Self-hostable** · **Open source** · **MIT licensed**

---

## Screenshots

<!-- Replace these with actual screenshots -->
| Dashboard | Invoice Builder | Client Portal |
|:---------:|:---------------:|:-------------:|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Invoice](docs/screenshots/invoice.png) | ![Portal](docs/screenshots/portal.png) |

---

## Features

### Core
- **Multi-currency invoicing** — Create invoices in USD, GBP, EUR, or NPR with line-item breakdowns and auto-generated invoice numbers
- **Live NPR conversion** — Fetches daily exchange rates, caches them in the database, and displays NPR equivalents on every invoice
- **Status lifecycle** — `DRAFT → SENT → PAID` with automatic `OVERDUE` detection via a daily cron job
- **Dashboard** — Total invoiced, paid, outstanding, and overdue amounts at a glance with NPR totals

### Client Experience
- **Public portal** — Each invoice gets a unique token-based URL (`/portal/:token`). Clients view and act on invoices with zero login friction
- **Mark as paid** — Clients confirm payment directly from the portal; freelancer gets an email notification
- **Email delivery** — Send invoice links, overdue reminders, and payment confirmations via Resend

### Developer Experience
- **Type-safe end-to-end** — Zod schemas shared between API validation and React forms via `@hisab/shared`
- **Monorepo** — Turborepo + pnpm workspaces with shared `db` and `shared` packages
- **One-command deploy** — `docker compose up` runs PostgreSQL, API, and frontend behind nginx

### Polish
- **PDF export** — Downloadable invoice PDFs rendered with `@react-pdf/renderer`
- **Dark mode** — Tailwind CSS `dark:` variant with class strategy
- **Mobile responsive** — Every page works on phone screens
- **Google OAuth** — Optional social login alongside email/password

---

## Architecture

```
hisab/
├── apps/
│   ├── api/                  # Hono backend (TypeScript)
│   │   ├── src/
│   │   │   ├── routes/           # clients, invoices, portal, dashboard, exchange-rates
│   │   │   ├── middleware/       # requireAuth, idempotency
│   │   │   └── lib/              # auth, email, exchange-rate, cron, audit, events, listeners, logger, errors, env
│   │   └── Dockerfile
│   └── web/                  # React + Vite frontend
│       ├── src/
│       │   ├── pages/            # Route-level page components
│       │   ├── components/       # Shared UI (layout, PDF renderer)
│       │   └── lib/              # API client, auth client, utilities
│       └── Dockerfile
├── packages/
│   ├── db/                   # Prisma schema + generated client (@hisab/db)
│   └── shared/               # Zod schemas + TypeScript types (@hisab/shared)
├── docker-compose.yml
└── turbo.json
```

### Data Flow

```
Browser (React + TanStack Query)
    │
    │ fetch with credentials: "include" (HTTP-only cookies)
    ▼
Hono API Server
    ├── Better Auth middleware → validates session cookie against DB
    ├── Zod validator middleware → validates request body against shared schema
    ├── Route handler → Prisma queries → PostgreSQL
    ├── Resend → transactional email (invoice sent, paid, overdue)
    └── Exchange Rate API → daily rate fetch → DB cache
```

### Database Schema

```
User ──┬── Client ──── Invoice ──── LineItem
       │                  │
       ├── Session        ├── token (opaque cuid for public portal URL)
       ├── Account        └── nprRate (cached at send time for PDF consistency)
       ├── Verification
       ├── AuditLog (entityType, entityId, action, before/after JSON)
       └── IdempotencyKey (key, statusCode, response — 24h TTL)

ExchangeRate (global daily cache: 1 row per currency per day)
```

**Enums:** `Currency` (USD, GBP, EUR, NPR) · `InvoiceStatus` (DRAFT, SENT, PAID, OVERDUE)

---

## Engineering Decisions

These are deliberate trade-offs, not defaults. This section explains *why*, not just *what*.

### Why Hono over Express?
Hono uses Web Standard `Request`/`Response`, has zero dependencies, and composes middleware via chaining instead of callbacks. It integrates cleanly with Better Auth's `handler(request)` API since both speak the same interface. Express requires `@types/express` shimming, has a larger dependency surface, and its middleware model is showing its age.

### Why Better Auth over NextAuth/Lucia?
Better Auth is framework-agnostic and works with raw HTTP — critical since we use Hono, not Next.js. It manages sessions via HTTP-only cookies (no client-side token storage), supports Prisma as a database adapter, and handles OAuth with minimal configuration. NextAuth is tightly coupled to Next.js. Lucia was deprecated in 2024.

### Why shared Zod schemas?
A single `@hisab/shared` package defines validation schemas imported by both the API (`@hono/zod-validator` middleware) and the frontend (`react-hook-form` + `zodResolver`). This eliminates validation drift — if a field constraint changes, it changes in both API validation and form UX simultaneously. The shared package also exports inferred TypeScript types, so the type system catches mismatches at compile time.

### Why store `LineItem.total` as a column?
`total = quantity × unitPrice` is denormalized into a stored column. Dashboard aggregation and invoice totals use `SUM(total)` directly without joining and multiplying in every query. The trade-off is a write-time computation, but invoice line items are written once and read many times — optimizing for reads is the right call.

### Why cuid tokens for the public portal?
Invoice portal URLs use an opaque `token` (cuid) instead of the internal database `id`. This prevents enumeration attacks — you can't guess sequential IDs. The token is auto-generated by Prisma's `@default(cuid())` and is the only identifier exposed in public URLs.

### Why per-day exchange rate caching?
Rates are fetched from a public API once per currency per day and stored in PostgreSQL. This avoids rate limits, provides consistency within a billing day (the NPR amount on an invoice doesn't change mid-day), and means the app survives external API downtime gracefully.

### Why a monolith, not microservices?
For a single-developer project, a well-structured monolith with clean module boundaries (routes, middleware, lib, shared packages) is the right architecture. Microservices add deployment complexity, network latency, and distributed debugging overhead without meaningful benefits at this scale. The architecture supports extraction later if needed.

---

## Scaling Considerations

### Current Capacity
Single Node.js process + single PostgreSQL instance. Comfortable for hundreds of active users.

### Read Optimization (1K–10K users)
- **Database indexes** ✅ — Composite indexes on `(userId, status)`, `(userId, createdAt)`, `(dueDate, status)` already in place
- **SQL aggregation** ✅ — Dashboard stats computed with `$queryRaw` `SUM`/`COUNT` — no in-memory reduce
- **Response caching** — Cache dashboard stats in memory with short TTLs
- **Connection pooling** — PgBouncer in front of PostgreSQL for connection management

### Horizontal Scaling (10K+ users)
- **Stateless API** — Auth is cookie-based, validated against the database on each request. Run N API instances behind a load balancer with no session affinity required
- **Background workers** — Extract cron jobs and email sending to a dedicated worker process with BullMQ + Redis
- **Read replicas** — Route read-heavy queries (dashboard, invoice list) to PostgreSQL read replicas via Prisma `$extends`
- **CDN** — Static frontend assets served via nginx; add Cloudflare or similar for edge caching

### What's Intentionally Not Here
- **Redis** — PostgreSQL handles the current caching needs. Adding Redis is justified when you need sub-millisecond reads or pub/sub
- **GraphQL** — REST with well-designed endpoints is simpler and sufficient for this domain
- **Kubernetes** — Docker Compose is the right deployment tool for self-hosting. K8s adds operational complexity without proportional benefit at this scale

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | React 19 + Vite + TypeScript | Fast HMR, type safety, ecosystem maturity |
| Routing | React Router v7 | Client-side routing with nested layouts |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS with accessible component primitives |
| Data Fetching | TanStack Query | Cache management, background refetch, optimistic updates |
| Backend | Hono | Web-standard, zero-dependency, native TypeScript |
| Database | PostgreSQL + Prisma | Type-safe ORM with migrations and relation modeling |
| Auth | Better Auth | Framework-agnostic, cookie-based sessions, OAuth support |
| Validation | Zod | Runtime validation with TypeScript type inference |
| Email | Resend | Developer-friendly transactional email API |
| PDF | @react-pdf/renderer | React components → PDF documents |
| Monorepo | Turborepo + pnpm workspaces | Dependency graph builds, shared workspace packages |
| Deploy | Docker + docker-compose | Single-command self-hosting with nginx reverse proxy |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (`corepack enable`)
- PostgreSQL 14+

### Local Development

```bash
git clone https://github.com/ishanshrestha14/hisab.git
cd hisab

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and BETTER_AUTH_SECRET

# Run database migrations
pnpm --filter @hisab/db db:migrate

# Start development servers
pnpm dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |

### Docker (Production)

```bash
git clone https://github.com/ishanshrestha14/hisab.git
cd hisab
cp .env.example .env
# Edit .env with production values

docker compose up -d
```

The app is available at `http://localhost` (port 80). PostgreSQL, API, and frontend all run in containers.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Random 32+ char string (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Yes | URL of your API server |
| `WEB_URL` | Yes | URL of your frontend |
| `VITE_API_URL` | Yes (web) | API URL visible to the browser |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key for email features |
| `EMAIL_FROM` | No | From address (default: `Hisab <noreply@hisab.app>`) |

---

## Roadmap

### Done
- [x] Audit logging — every invoice mutation recorded with before/after snapshots
- [x] Idempotent invoice creation — Stripe-style `Idempotency-Key` header with 24h TTL
- [x] Rate limiting — public portal (30 req/15min GET, 5 req/hr mark-paid) and sign-in (10 req/15min) per IP
- [x] Database-level aggregation — dashboard stats computed with SQL `SUM`/`COUNT`, not in-memory
- [x] Database indexes — composite indexes on `Invoice`, `Client`, `LineItem` for common query patterns
- [x] Pagination — `GET /api/invoices` and `GET /api/clients` return `{ data, pagination }`
- [x] Structured logging — pino with JSON output in production, pretty-print in dev
- [x] Graceful shutdown — `SIGTERM`/`SIGINT` handlers drain in-flight requests before exit
- [x] Security headers — `hono/secure-headers` sets `X-Frame-Options`, CSP, etc.
- [x] Event bus — typed in-process `EventBus`; email sending decoupled from route handlers

### Planned
- [ ] Recurring invoices with configurable frequency
- [ ] Webhook notifications for invoice events
- [ ] Multi-language support (Nepali / English)
- [ ] CSV/Excel data export
- [ ] Background job queue (BullMQ) for email and cron

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Quick start:**

1. Fork the repo and clone it locally
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes — TypeScript only, Zod validation on all API inputs
4. Open a pull request with a clear description

Please open an issue before starting large features so we can discuss the approach.

---

## License

[MIT](LICENSE) — use it, fork it, self-host it, build a business on it.

---

Built by [@ishanshrestha14](https://github.com/ishanshrestha14) · Made for Nepal
