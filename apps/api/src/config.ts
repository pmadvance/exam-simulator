import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(8).default("change-me"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true"),
  MYSQL_HOST: z.string().default("127.0.0.1"),
  MYSQL_PORT: z.coerce.number().default(3307),
  MYSQL_DATABASE: z.string().default("pm_exam"),
  MYSQL_USER: z.string().default("pm_user"),
  MYSQL_PASSWORD: z.string().default("pm_password"),
  // Payment gateway — ToyyibPay
  TOYYIBPAY_SECRET_KEY: z.string().default(""),
  TOYYIBPAY_CATEGORY_CODE: z.string().default(""),
  TOYYIBPAY_SANDBOX: z
    .union([z.literal("true"), z.literal("false")])
    .default("true")
    .transform((value) => value === "true"),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_SANDBOX: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === undefined ? undefined : value === "true"),
  STRIPE_TEST_SECRET_KEY: z.string().default(""),
  STRIPE_TEST_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_LIVE_SECRET_KEY: z.string().default(""),
  STRIPE_LIVE_WEBHOOK_SECRET: z.string().default(""),
  PAYPAL_CLIENT_ID: z.string().default(""),
  PAYPAL_CLIENT_SECRET: z.string().default(""),
  PAYPAL_SANDBOX: z
    .union([z.literal("true"), z.literal("false")])
    .default("true")
    .transform((value) => value === "true"),
  BILLPLZ_API_KEY: z.string().default(""),
  BILLPLZ_COLLECTION_ID: z.string().default(""),
  BILLPLZ_X_SIGNATURE_KEY: z.string().default(""),
  BILLPLZ_SANDBOX: z
    .union([z.literal("true"), z.literal("false")])
    .default("true")
    .transform((value) => value === "true"),
  UAT_TEST_MODE: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true"),
  UAT_VERIFICATION_CODE: z.string().min(4).max(6).default("111111"),
  // Base URL the API is reachable at (for gateway callbacks)
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  // SMTP email settings (Brevo: smtp-relay.brevo.com:587)
  SMTP_HOST: z.string().default("smtp-relay.brevo.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("PMAdvance <noreply@pmadvance.com>")
});

export const env = envSchema.parse(process.env);
