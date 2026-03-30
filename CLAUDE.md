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
