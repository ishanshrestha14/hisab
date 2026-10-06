import { vi, type Mock } from "vitest";

// Auto-mocking stand-in for the Prisma client. Any `prisma.<model>.<method>`
// is created as a vi.fn() on first access, so tests only stub what they use:
//
//   vi.mock("@hisab/db", () => import("../test/prisma-mock"));
//   import { prisma } from "@hisab/db";
//   const db = prisma as unknown as PrismaMock;
//   db.invoice.findFirst.mockResolvedValue({ ... });
export type PrismaMock = {
  $transaction: Mock;
  $queryRaw: Mock;
} & Record<string, Record<string, Mock>>;

function modelMock(): Record<string, Mock> {
  return new Proxy({} as Record<string, Mock>, {
    get(target, method: string) {
      target[method] ??= vi.fn();
      return target[method];
    },
  });
}

export function createPrismaMock(): PrismaMock {
  const root: Record<string, unknown> = {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
  return new Proxy(root, {
    get(target, prop: string) {
      target[prop] ??= modelMock();
      return target[prop];
    },
  }) as PrismaMock;
}

export const prisma = createPrismaMock();
