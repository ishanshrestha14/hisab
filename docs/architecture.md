# Hisab — Architecture

## Monorepo structure

```
hisab/
├── apps/
│   ├── api/                  Hono backend                  :3001
│   │   └── src/
│   │       ├── index.ts          Server entry, middleware, route mounting, graceful shutdown
│   │       ├── routes/           clients.ts, invoices.ts, portal.ts, dashboard.ts, exchange-rates.ts
│   │       ├── middleware/       auth.middleware.ts, idempotency.middleware.ts
│   │       └── lib/
│   │           ├── auth.ts           Better Auth config
│   │           ├── email.ts          Resend email templates
│   │           ├── exchange-rate.ts  NPR rate fetching + DB cache
│   │           ├── cron.ts           Daily overdue detection job
│   │           ├── audit.ts          Fire-and-forget audit log writer
│   │           ├── events.ts         Typed in-process EventBus
│   │           ├── listeners.ts      Registers email listeners on the event bus
│   │           ├── logger.ts         pino logger (JSON prod / pretty dev)
│   │           ├── errors.ts         apiError() helper — consistent error shape
│   │           └── env.ts            Zod-validated environment variables
│   └── web/                  React + Vite frontend         :5173
│       └── src/
│           ├── pages/            Route-level page components
│           ├── components/       AppLayout, InvoicePDF
│           └── lib/              api.ts, auth-client.ts, utils.ts
├── packages/
│   ├── db/                   Prisma schema + generated client (@hisab/db)
│   └── shared/               Zod schemas + TypeScript types (@hisab/shared)
├── docs/                     This documentation
├── docker-compose.yml
└── turbo.json
```

---

## Request lifecycle

```
Browser (React + TanStack Query)
    │  fetch with credentials: "include"  (HTTP-only cookie sent automatically)
    ▼
Hono API
    ├── honoLogger()         request/response logging
    ├── secureHeaders()      X-Frame-Options, CSP, X-Content-Type-Options, etc.
    ├── cors()               restricts to WEB_URL origin
    ├── rateLimiter()        brute-force protection on /api/auth/sign-in/*
    ├── requireAuth          validates Better Auth session, attaches user to context
    ├── idempotencyMiddleware  (POST /api/invoices only) dedup by Idempotency-Key header
    ├── zValidator()         validates request body against shared Zod schema
    └── route handler
            ├── Prisma → PostgreSQL
            ├── audit()          fire-and-forget audit log write
            └── eventBus.emit()  triggers email listeners asynchronously
```

---

## Event bus

Email sending is decoupled from route handlers via an in-process typed EventBus.

```
invoices.ts  →  eventBus.emit("invoice.sent", {...})
                      ↓
              listeners.ts (registered at startup)
                      ↓
              sendInvoiceEmail()  via Resend

portal.ts    →  eventBus.emit("invoice.paid", {...})
                      ↓
              sendPaidNotificationEmail()
```

Listeners are fire-and-forget — errors are logged but never propagate to the HTTP response. Add new side effects (Slack, webhooks) by adding one line to `listeners.ts`.

---

## Database schema

```
User ──┬── Session
       ├── Account             (OAuth providers)
       ├── Verification
       ├── Client ──── Invoice ──── LineItem
       ├── AuditLog            (entityType, entityId, action, before/after JSON)
       └── IdempotencyKey      (key, userId, statusCode, response — 24h TTL)

ExchangeRate                   (global daily cache: base, date, rateToNPR)
```

### Key design decisions

| Decision | Reason |
|----------|--------|
| `Invoice.token` is an opaque cuid | Prevents enumeration — portal URLs can't be guessed |
| `Invoice.id` never exposed publicly | Only `token` appears in URLs and API responses |
| `LineItem.total` stored (not computed) | `SUM(total)` in SQL is fast; historical totals survive price edits |
| `ExchangeRate` has no `userId` | Cache is global — one row per (base, date) for all users |
| `@@unique([userId, number])` on Invoice | DB-level guard against duplicate invoice numbers |
| `@@unique([key, userId])` on IdempotencyKey | Concurrent retries safely deduplicate |

---

## Auth architecture

Better Auth manages sessions via **HTTP-only cookies** — no JWT in localStorage, immune to XSS token theft.

```
Sign in → Better Auth sets session cookie (HTTP-only, SameSite)
  ↓
All requests include credentials: "include" → cookie sent automatically
  ↓
requireAuth middleware → auth.api.getSession() → attaches user to Hono context
  ↓
Route handler reads c.get("user") for userId
```

Public portal routes (`/api/portal/:token`) bypass `requireAuth` entirely. Rate-limited instead.

---

## Error response format

All errors return a consistent shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Invoice not found"
  }
}
```

Available codes: `NOT_FOUND` (404), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `BAD_REQUEST` (400), `INTERNAL_ERROR` (500).

Always use `apiError(c, code, message)` from `lib/errors.ts`. Never `c.json({ error: "..." })` directly.

---

## Audit logging

Every invoice mutation writes a fire-and-forget `AuditLog` record:

| Route | Action |
|-------|--------|
| `POST /api/invoices` | `invoice.created` |
| `PUT /api/invoices/:id` | `invoice.updated` |
| `PATCH /api/invoices/:id/status` | `invoice.status_changed` |
| `POST /api/invoices/:id/send` | `invoice.sent` |
| `DELETE /api/invoices/:id` | `invoice.deleted` |

`before` and `after` capture relevant field snapshots. Failures are logged but never block the user request.

---

## Rate limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/sign-in/*` | 10 req | 15 min per IP |
| `GET /api/portal/:token` | 30 req | 15 min per IP |
| `POST /api/portal/:token/mark-paid` | 5 req | 1 hour per IP |

IP extracted from `x-forwarded-for` header (proxy-aware).

---

## Graceful shutdown

On `SIGTERM` or `SIGINT`:
1. Stop accepting new connections
2. Wait for in-flight requests to finish
3. Disconnect Prisma
4. Exit with code 0

This ensures no data loss during Docker/Railway restarts.
