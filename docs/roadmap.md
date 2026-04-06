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

## Planned

- [ ] Recurring invoices with configurable frequency
- [ ] Webhook notifications for invoice events (`invoice.created`, `invoice.paid`)
- [ ] Multi-language support (Nepali / English)
- [ ] CSV/Excel data export
- [ ] Background job queue (BullMQ + Redis) for email and cron at scale
- [ ] Services layer — extract business logic from route handlers into `src/services/`
- [ ] Test suite — integration tests against a real DB (no mocks)
