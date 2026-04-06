import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

// JSON in production (parseable by log aggregators), pretty-print in dev
export const logger = pino(
  isDev
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : { level: process.env.LOG_LEVEL ?? "info" }
);
