import { beforeEach, describe, expect, it, vi } from "vitest";

type EventsModule = typeof import("./events");
type LoggerModule = typeof import("./logger");

const paidPayload = {
  to: "me@example.com",
  freelancerName: "Sita",
  clientName: "Acme",
  invoiceNumber: "INV-001",
  total: 100,
  currency: "USD",
};

describe("eventBus", () => {
  let eventBus: EventsModule["eventBus"];
  let logger: LoggerModule["logger"];

  beforeEach(async () => {
    // Fresh singleton per test so listeners don't leak between cases
    vi.resetModules();
    ({ eventBus } = await import("./events"));
    ({ logger } = await import("./logger"));
  });

  it("delivers the payload to every listener for that event", () => {
    const a = vi.fn();
    const b = vi.fn();
    eventBus.on("invoice.paid", a);
    eventBus.on("invoice.paid", b);

    eventBus.emit("invoice.paid", paidPayload);

    expect(a).toHaveBeenCalledWith(paidPayload);
    expect(b).toHaveBeenCalledWith(paidPayload);
  });

  it("does not deliver to listeners of other events", () => {
    const sent = vi.fn();
    eventBus.on("invoice.sent", sent);

    eventBus.emit("invoice.paid", paidPayload);

    expect(sent).not.toHaveBeenCalled();
  });

  it("is a no-op when nobody is listening", () => {
    expect(() => eventBus.emit("invoice.paid", paidPayload)).not.toThrow();
  });

  it("logs async listener failures without rejecting to the emitter", async () => {
    const errorSpy = vi.spyOn(logger, "error");
    const after = vi.fn();
    eventBus.on("invoice.paid", async () => {
      throw new Error("resend down");
    });
    eventBus.on("invoice.paid", after);

    eventBus.emit("invoice.paid", paidPayload);
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());

    expect(after).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toMatchObject({ event: "invoice.paid" });
  });

  it("isolates synchronous listener throws from the emitter and other listeners", async () => {
    const errorSpy = vi.spyOn(logger, "error");
    const after = vi.fn();
    eventBus.on("invoice.paid", () => {
      throw new Error("boom");
    });
    eventBus.on("invoice.paid", after);

    expect(() => eventBus.emit("invoice.paid", paidPayload)).not.toThrow();
    expect(after).toHaveBeenCalled();
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
  });
});
