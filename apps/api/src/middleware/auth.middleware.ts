import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

// Hono middleware — attaches the Better Auth session to context
// Usage: app.use(requireAuth) on protected routes
export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Attach to Hono context so route handlers can access it
  c.set("user", session.user);
  c.set("session", session.session);

  await next();
}
