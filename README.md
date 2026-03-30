# Hisab — हिसाब

**Open-source invoicing and client portal for Nepali freelancers.**

Earn in USD, GBP, or EUR — see everything in NPR too. Send professional invoices, share a public client portal, and track payments. No more Google Docs and WhatsApp.

> _हिसाब (hisab) — Nepali for "account" or "calculation"_

---

## Screenshots

_Coming soon_

---

## Features

- **Invoice builder** — line items, multi-currency (USD, GBP, EUR, NPR), auto-numbered
- **NPR equivalent** — live exchange rate shown on every invoice, cached daily
- **Client portal** — shareable public URL (`/portal/:token`), no login required for your client
- **Status tracking** — DRAFT → SENT → PAID / OVERDUE with auto-overdue detection
- **PDF export** — clean downloadable invoice PDF
- **Email** — send invoice link to client, payment reminders, paid notifications
- **Dashboard** — total invoiced, paid, outstanding, overdue at a glance
- **Auth** — email/password or Google OAuth
- **Dark mode** — first-class support

---

## Self-host with Docker

```bash
git clone https://github.com/yourusername/hisab.git
cd hisab
cp .env.example .env   # fill in your values
docker-compose up -d
```

Open `http://localhost:3000`.

That's it. No external services required except a mail provider (Resend) for email features.

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Random 32-char string — `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Yes | URL of your API server |
| `WEB_URL` | Yes | URL of your frontend |
| `GOOGLE_CLIENT_ID` | No | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | For Google OAuth |
| `RESEND_API_KEY` | No | For sending emails |
| `EMAIL_FROM` | No | From address for emails |
| `EXCHANGERATE_API_KEY` | No | For live NPR conversion |
| `VITE_API_URL` | Yes (web) | API URL, seen by the browser |

---

## Local development

**Prerequisites:** Node.js 20+, pnpm, PostgreSQL

```bash
git clone https://github.com/yourusername/hisab.git
cd hisab
pnpm install
cp .env.example .env
# edit .env with your DATABASE_URL and BETTER_AUTH_SECRET

pnpm --filter @hisab/db db:migrate
pnpm dev
```

| App | URL |
|-----|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3001 |

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + React Router v7 + Tailwind CSS |
| Backend | Hono (TypeScript) |
| Database | PostgreSQL + Prisma |
| Auth | Better Auth |
| Email | Resend |
| PDF | @react-pdf/renderer |
| Monorepo | Turborepo + pnpm workspaces |

---

## Project structure

```
hisab/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # Hono backend
├── packages/
│   ├── db/           # Prisma schema + generated client
│   └── shared/       # Zod schemas shared across apps
├── docker-compose.yml
├── .env.example
└── turbo.json
```

---

## Contributing

Contributions are welcome. This project is in active early development.

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes — TypeScript only, Zod validation on all API inputs
4. Open a pull request

Please open an issue before starting large features.

---

## License

MIT — use it, fork it, self-host it, build a business on it.

---

_Built by [@ishanshrestha14](https://github.com/ishanshrestha14) · Made for Nepal 🇳🇵_
