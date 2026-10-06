import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const isTest = process.env.NODE_ENV === "test";

// JSON in production (parseable by log aggregators), pretty-print in dev, silent in tests
export const logger = pino(
  isTest
    ? { level: "silent" }
    : isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : { level: process.env.LOG_LEVEL ?? "info" }
);
