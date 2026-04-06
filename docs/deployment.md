# Hisab — Deployment Guide

## Local development

```bash
git clone https://github.com/ishanshrestha14/hisab.git
cd hisab

pnpm install
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and BETTER_AUTH_SECRET

pnpm --filter @hisab/db db:migrate
pnpm dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |

---

## Docker (self-hosted)

The recommended way to run Hisab in production. Everything runs in containers — PostgreSQL, API, and frontend behind nginx.

```bash
cp .env.example .env
# Fill in all required env vars (see below)

docker compose up -d
```

The app is available at `http://localhost` (port 80).

### What `docker compose up` starts

| Container | Role |
|-----------|------|
| `db` | PostgreSQL 16 |
| `api` | Hono API on port 3001 |
| `web` | React app served by nginx on port 80 |

Migrations run automatically when the API container starts.

---

## Railway (API + Database)

1. Create a new Railway project
2. Add a **PostgreSQL** plugin — Railway sets `DATABASE_URL` automatically
3. Create a new service from your GitHub repo, set root directory to `/`
4. Add environment variables (see table below)
5. Railway builds and deploys on every push to `main`

**Build command:** `pnpm build`  
**Start command:** `node apps/api/dist/index.js`

---

## Vercel (Frontend)

1. Import your GitHub repo in Vercel
2. Set **Root Directory** to `apps/web`
3. Set **Build Command** to `pnpm build`
4. Set **Output Directory** to `dist`
5. Add `VITE_API_URL` pointing to your Railway API URL

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Random 32+ char secret — `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Yes | Full URL of your API server (e.g. `https://api.yourdomain.com`) |
| `WEB_URL` | Yes | Full URL of your frontend (e.g. `https://yourdomain.com`) |
| `VITE_API_URL` | Yes (web) | API URL visible to the browser |
| `PORT` | No | API port (default: `3001`) |
| `NODE_ENV` | No | `production` enables JSON logging and disables pretty-print |
| `LOG_LEVEL` | No | pino log level in production (default: `info`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key — required for email features |
| `EMAIL_FROM` | No | From address (default: `Hisab <noreply@hisab.app>`) |

---

## Health check

```
GET /health
→ 200  { "status": "ok", "db": "ok" }
→ 503  { "status": "degraded", "db": "unreachable" }
```

Use this endpoint for Docker `HEALTHCHECK`, Railway health checks, or uptime monitoring.

---

## CI/CD

`.github/workflows/ci.yml` runs on every PR and push to `main`:

1. Install dependencies with frozen lockfile
2. Generate Prisma client
3. Typecheck `apps/api` and `apps/web`
4. Run lint

Deployment to Railway/Vercel happens automatically via their GitHub integrations — no separate deploy step needed in CI.
