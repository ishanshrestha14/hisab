import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  WEB_URL: z.string().url("WEB_URL must be a valid URL").default("http://localhost:5173"),
  PORT: z.coerce.number().default(3001),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Hisab <noreply@hisab.app>"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
