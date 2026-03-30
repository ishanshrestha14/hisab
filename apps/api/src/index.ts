import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/auth.middleware";
import clients from "./routes/clients";
import dashboard from "./routes/dashboard";

const app = new Hono();

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(logger());

app.use(
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true, // required for Better Auth cookies
  })
);

// ─── Better Auth — handles all /api/auth/* routes ────────────────────────────
// Better Auth generates: /sign-in, /sign-up, /sign-out, /session, /callback, etc.

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// ─── Protected routes ─────────────────────────────────────────────────────────

app.use("/api/clients/*", requireAuth);
app.route("/api/clients", clients);

app.use("/api/dashboard/*", requireAuth);
app.route("/api/dashboard", dashboard);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ status: "ok" }));

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`);
});
