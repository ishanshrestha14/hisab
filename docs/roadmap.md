# Hisab — Roadmap

## Milestones

| Week | Status | Focus |
|------|--------|-------|
| 1 | ✅ Done | Monorepo init, Prisma schema + migrations, Better Auth (email + Google), login/signup UI |
| 2 | ✅ Done | Client CRUD (API + UI), Invoice creation form with live totals, auto invoice numbering |
| 3 | 🔜 Next | Invoice list + status tabs, NPR conversion (exchangerate.host + DB cache), dashboard stats |
| 4 | — | Client portal (public `/portal/:token`), PDF export, "Mark as Paid" flow |
| 5 | — | Resend email (send invoice, reminder, paid notification), overdue cron job, polish |
| 6 | — | Docker + docker-compose, README, `.env.example`, Vercel + Railway deploy, GitHub launch |

---

## Week 1 — Foundation
- Turborepo + pnpm workspaces monorepo
- Prisma schema: `User`, `Client`, `Invoice`, `LineItem`, `ExchangeRate`
- Better Auth wired (email/password + Google OAuth, HTTP-only cookies)
- Login and signup pages
- Protected route shell with AppLayout sidebar

## Week 2 — Core CRUD
- Client CRUD: list, add, edit, delete (with ownership checks)
- Invoice creation form with dynamic line items and live total
- Auto invoice numbering: `INV-001`, `INV-002`…
- Invoice list page with status badges
- Routes: `/clients`, `/invoices`, `/invoices/new`

## Week 3 — Data & Conversions
- Invoice status filter tabs (All / Draft / Sent / Paid / Overdue)
- NPR conversion: fetch from exchangerate.host, cache in `ExchangeRate` table (1 per day per currency)
- Dashboard stats with real data: total invoiced, paid, outstanding, overdue count
- NPR equivalent shown on invoice and dashboard

## Week 4 — Client Portal & PDF
- Public portal page at `/portal/:token` — no auth required
- Client can view invoice details (line items, total, due date)
- "Mark as Paid" button on portal → PATCH invoice status to PAID
- PDF export via `@react-pdf/renderer` (download from invoice detail page)
- Invoice detail page at `/invoices/:id`

## Week 5 — Email & Automation
- Resend integration for transactional email
- Send invoice email to client (includes portal link)
- Payment reminder email (manual trigger)
- "Invoice paid" notification email to freelancer
- Overdue cron job: daily check, flip SENT → OVERDUE past due date
- UI polish: empty states, loading skeletons, mobile layout review

## Week 6 — Launch
- `Dockerfile` + `docker-compose.yml` (app + postgres)
- `README.md` with setup instructions, screenshots
- `.env.example` with all required variables documented
- Vercel deployment for frontend
- Railway deployment for API + database
- GitHub repo cleanup and public launch
