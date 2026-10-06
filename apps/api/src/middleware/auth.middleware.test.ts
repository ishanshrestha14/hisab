import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

import { auth } from "../lib/auth";
import { requireAuth } from "./auth.middleware";

const getSession = vi.mocked(auth.api.getSession);

const app = new Hono();
app.use("/protected/*", requireAuth);
app.get("/protected/me", (c) => c.json({ user: c.get("user" as never) }));

describe("requireAuth", () => {
  it("returns 401 in the standard error shape when there is no session", async () => {
    getSession.mockResolvedValue(null);

    const res = await app.request("/protected/me");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
  });

  it("forwards the request cookies to Better Auth", async () => {
    getSession.mockResolvedValue(null);

    await app.request("/protected/me", { headers: { cookie: "better-auth.session_token=abc" } });

    const { headers } = getSession.mock.calls[0][0] as { headers: Headers };
    expect(headers.get("cookie")).toBe("better-auth.session_token=abc");
  });

  it("exposes the session user to downstream handlers", async () => {
    const user = { id: "user_1", email: "sita@example.com", name: "Sita" };
    getSession.mockResolvedValue({ user, session: { id: "sess_1" } } as never);

    const res = await app.request("/protected/me");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user });
  });
});
