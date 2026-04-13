import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { env } from "./lib/env";
import { prisma } from "@hisab/db";
import { logger } from "./lib/logger";
import { auth } from "./lib/auth";
import { startCronJobs } from "./lib/cron";
import { registerListeners } from "./lib/listeners";
import { requireAuth } from "./middleware/auth.middleware";
import clients from "./routes/clients";
import dashboard from "./routes/dashboard";
import invoices from "./routes/invoices";
import exchangeRates from "./routes/exchange-rates";
import expenses from "./routes/expenses";
import portal from "./routes/portal";
import profile from "./routes/profile";
import quotes from "./routes/quotes";
import recurring from "./routes/recurring";
import reports from "./routes/reports";

const app = new Hono();

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(honoLogger());
app.use(secureHeaders());

app.use(
  cors({
    origin: env.WEB_URL,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true, // required for Better Auth cookies
  })
);

// ─── Better Auth — handles all /api/auth/* routes ────────────────────────────
// Better Auth generates: /sign-in, /sign-up, /sign-out, /session, /callback, etc.

// Rate-limit sign-in to prevent brute-force — 10 attempts per 15 min per IP
app.use(
  "/api/auth/sign-in/*",
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-6",
    keyGenerator: (c) =>
      (c.req.header("x-forwarded-for") ?? "unknown").split(",")[0].trim(),
  })
);

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// ─── Protected routes ─────────────────────────────────────────────────────────

app.use("/api/clients/*", requireAuth);
app.route("/api/clients", clients);

app.use("/api/dashboard/*", requireAuth);
app.route("/api/dashboard", dashboard);

app.use("/api/invoices/*", requireAuth);
app.route("/api/invoices", invoices);

app.use("/api/exchange-rates/*", requireAuth);
app.route("/api/exchange-rates", exchangeRates);

app.use("/api/profile/*", requireAuth);
app.route("/api/profile", profile);

app.use("/api/quotes/*", requireAuth);
app.route("/api/quotes", quotes);

app.use("/api/recurring/*", requireAuth);
app.route("/api/recurring", recurring);

app.use("/api/reports/*", requireAuth);
app.route("/api/reports", reports);

app.use("/api/expenses/*", requireAuth);
app.route("/api/expenses", expenses);

// Public portal — no auth
app.route("/api/portal", portal);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: "ok", db: "ok" });
  } catch {
    return c.json({ status: "degraded", db: "unreachable" }, 503);
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = env.PORT;

const server = serve({ fetch: app.fetch, port: PORT }, () => {
  registerListeners();
  startCronJobs();
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// On SIGTERM/SIGINT: stop accepting connections, let in-flight requests finish,
// then disconnect Prisma. Prevents data loss during Docker/Railway restarts.

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down…");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Clean exit.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
