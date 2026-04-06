import type { Context } from "hono";

type ErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
};

export function apiError(c: Context, code: ErrorCode, message: string) {
  return c.json({ error: { code, message } }, STATUS[code] as 400 | 401 | 403 | 404 | 500);
}
