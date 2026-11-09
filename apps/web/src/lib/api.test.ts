import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status })
    )
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("api error handling", () => {
  it("surfaces the message from the API's { error: { code, message } } shape", async () => {
    respond(400, { error: { code: "BAD_REQUEST", message: "Cannot record payment on a draft invoice" } });

    await expect(api.post("/api/invoices/1/payments", {})).rejects.toThrow(
      "Cannot record payment on a draft invoice"
    );
  });

  it("still accepts a plain string error", async () => {
    respond(401, { error: "Unauthorized" });

    await expect(api.get("/api/clients")).rejects.toThrow("Unauthorized");
  });

  it("falls back to a generic message when the body is not JSON", async () => {
    respond(502, "<html>Bad gateway</html>");

    await expect(api.get("/api/clients")).rejects.toThrow("Request failed");
  });

  it("sends cookies with every request", async () => {
    respond(200, { ok: true });

    await api.get("/api/clients");

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/clients"),
      expect.objectContaining({ credentials: "include" })
    );
  });
});
