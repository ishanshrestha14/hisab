// Typed in-process event bus. Listeners are fire-and-forget — errors are caught
// and logged but never propagate to the emitting route handler.

export type EventMap = {
  "invoice.sent": {
    to: string;
    clientName: string;
    freelancerName: string;
    invoiceNumber: string;
    total: number;
    currency: string;
    dueDate: Date;
    portalUrl: string;
  };
  "invoice.paid": {
    to: string;
    freelancerName: string;
    clientName: string;
    invoiceNumber: string;
    total: number;
    currency: string;
  };
};

type Listener<T> = (payload: T) => void | Promise<void>;

class EventBus {
  private listeners = new Map<string, Listener<unknown>[]>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...existing, listener as Listener<unknown>]);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      Promise.resolve(handler(payload)).catch((err) =>
        console.error(`[events] Handler error for "${event}":`, err)
      );
    }
  }
}

export const eventBus = new EventBus();
