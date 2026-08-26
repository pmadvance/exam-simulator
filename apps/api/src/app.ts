import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

import { env } from "./config.js";
import { canConnectToDatabase, ensureDatabaseTables, getPool } from "./db.js";
import type { RowDataPacket } from "mysql2";

import { ACCESS_COOKIE_NAME, authCookieOptions, clearSessionCookies } from "./middleware/auth.js";
import { verifyAccessToken } from "./lib/auth.js";
import authRouter from "./routes/auth.js";
import catalogRouter from "./routes/catalog.js";
import checkoutRouter from "./routes/checkout.js";
import studentRouter from "./routes/student.js";
import adminRouter from "./routes/admin/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

export const app = express();
app.set("trust proxy", true);

app.use(
  cors({
    origin: env.APP_URL,
    credentials: true,
  })
);
app.use("/api/payments/callbacks/stripe", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// ── Session revocation gate ────────────────────────────────────
// Access tokens are short-lived, but session revocation should be immediate
// when a student logs in on another device. Tokens issued after this feature
// carry sessionId, so protected API calls can reject revoked sessions at once.
app.use(async (request: Request, response: Response, next: NextFunction) => {
  const publicAuthPaths = new Set([
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/send-verification-code",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/signout",
  ]);

  if (!request.path.startsWith("/api") || publicAuthPaths.has(request.path)) {
    return next();
  }

  const accessToken = request.cookies?.[ACCESS_COOKIE_NAME];
  if (typeof accessToken !== "string") {
    return next();
  }

  try {
    const payload = verifyAccessToken(accessToken);
    if (!payload.sessionId) {
      return next();
    }

    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT revoked_at AS revokedAt, expires_at AS expiresAt
       FROM auth_sessions
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [payload.sessionId, payload.userId]
    );
    const session = rows[0];
    const expired = session && new Date(session.expiresAt as string | Date).getTime() < Date.now();

    if (!session || session.revokedAt || expired) {
      clearSessionCookies(response);
      response.status(401).json({ message: "Session expired or revoked" });
      return;
    }
  } catch {
    response.clearCookie(ACCESS_COOKIE_NAME, authCookieOptions);
  }

  next();
});

// ── Health check ───────────────────────────────────────────────
app.get("/health", async (_request, response) => {
  const database = await canConnectToDatabase();
  if (database) {
    await ensureDatabaseTables();
  }
  response.json({ status: "ok", database, service: "api" });
});

// ── Static files (uploaded images) ─────────────────────────────
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Maintenance mode gate ──────────────────────────────────────
// Blocks non-admin, non-health, non-auth endpoints when maintenance mode is on.
type MaintenanceSettings = {
  enabled: boolean;
  pageType: "maintenance" | "launch";
  message: string;
  allowedIps: string[];
  teaserLabel: string;
  teaserHeadline: string;
  teaserItems: string[];
  countdownEnabled: boolean;
  countdownEndsAt: string | null;
};

let maintenanceModeCache: { value: MaintenanceSettings; checkedAt: number } = {
  value: {
    enabled: false,
    pageType: "maintenance",
    message: "",
    allowedIps: [],
    teaserLabel: "",
    teaserHeadline: "",
    teaserItems: [],
    countdownEnabled: false,
    countdownEndsAt: null,
  },
  checkedAt: 0,
};
const MAINTENANCE_CACHE_TTL = 5_000; // refresh every 5 seconds
const DEFAULT_MAINTENANCE_MESSAGE = "The platform is currently under maintenance. Please try again later.";
const DEFAULT_LAUNCH_LABEL = "Launching Soon";
const DEFAULT_LAUNCH_HEADLINE = "PM Exam Pro launches soon.";
const DEFAULT_LAUNCH_ITEMS = [
  "Exam-style practice|Train with timed simulators built around certification exam workflows.",
  "Progress insights|Spot weak domains and know where to focus before exam day.",
  "Simple access|Choose a practice set, checkout, and start studying without friction.",
];

function normalizeIp(value: unknown) {
  if (typeof value !== "string") return "";
  const first = value.split(",")[0]?.trim() ?? "";
  const cleaned = first
    .replace(/^for=/i, "")
    .replace(/^"|"$/g, "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/^::ffff:/, "");
  return /^\d+\.\d+\.\d+\.\d+:\d+$/.test(cleaned)
    ? cleaned.replace(/:\d+$/, "")
    : cleaned;
}

function parseForwardedHeader(value: unknown) {
  if (typeof value !== "string") return "";
  const firstEntry = value.split(",")[0] ?? "";
  const forPart = firstEntry
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("for="));
  return normalizeIp(forPart);
}

function getRequestIps(request: Request) {
  return Array.from(new Set([
    normalizeIp(request.header("cf-connecting-ip")),
    normalizeIp(request.header("true-client-ip")),
    normalizeIp(request.header("x-client-ip")),
    normalizeIp(request.header("x-forwarded-for")),
    normalizeIp(request.header("x-vercel-forwarded-for")),
    normalizeIp(request.header("fly-client-ip")),
    normalizeIp(request.header("fastly-client-ip")),
    normalizeIp(request.header("x-real-ip")),
    parseForwardedHeader(request.header("forwarded")),
    normalizeIp(request.ip),
    normalizeIp(request.socket.remoteAddress),
  ].filter(Boolean)));
}

function ipv4ToNumber(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  let total = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    total = (total << 8) + octet;
  }
  return total >>> 0;
}

function matchesIpRule(ip: string, rule: string) {
  const cleanedRule = rule.trim();
  if (!cleanedRule) return false;
  if (normalizeIp(cleanedRule) === ip) return true;

  const [rangeIp, prefixLengthText] = cleanedRule.split("/");
  if (!rangeIp || prefixLengthText === undefined) return false;
  const prefixLength = Number(prefixLengthText);
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) return false;

  const ipNumber = ipv4ToNumber(ip);
  const rangeNumber = ipv4ToNumber(normalizeIp(rangeIp));
  if (ipNumber === null || rangeNumber === null) return false;

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipNumber & mask) === (rangeNumber & mask);
}

function isMaintenanceIpAllowed(settings: MaintenanceSettings, request: Request) {
  if (!settings.enabled || settings.allowedIps.length === 0) return false;
  const requestIps = getRequestIps(request);
  return requestIps.some((ip) => settings.allowedIps.some((rule) => matchesIpRule(ip, rule)));
}

async function getMaintenanceSettings() {
  const now = Date.now();
  if (now - maintenanceModeCache.checkedAt <= MAINTENANCE_CACHE_TTL) {
    return maintenanceModeCache.value;
  }

  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT setting_key AS settingKey, setting_value AS settingValue
     FROM app_settings
     WHERE setting_key IN (
       'maintenanceMode',
       'maintenancePageType',
       'maintenanceMessage',
       'maintenanceAllowedIps',
       'maintenanceTeaserLabel',
       'maintenanceTeaserHeadline',
       'maintenanceTeaserItems',
       'maintenanceCountdownEnabled',
       'maintenanceCountdownEndsAt'
     )`
  );
  const map = new Map(rows.map((row) => [String(row.settingKey), String(row.settingValue)]));
  let allowedIps: string[] = [];
  try {
    const parsed = JSON.parse(map.get("maintenanceAllowedIps") ?? "[]");
    allowedIps = Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    allowedIps = [];
  }
  let teaserItems: string[] = [];
  try {
    const parsed = JSON.parse(map.get("maintenanceTeaserItems") ?? "[]");
    teaserItems = Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    teaserItems = [];
  }

  maintenanceModeCache = {
    value: {
      enabled: map.get("maintenanceMode") === "true",
      pageType: map.get("maintenancePageType") === "launch" ? "launch" : "maintenance",
      message: map.get("maintenanceMessage") || DEFAULT_MAINTENANCE_MESSAGE,
      allowedIps,
      teaserLabel: map.get("maintenanceTeaserLabel") || DEFAULT_LAUNCH_LABEL,
      teaserHeadline: map.get("maintenanceTeaserHeadline") || DEFAULT_LAUNCH_HEADLINE,
      teaserItems: teaserItems.length > 0 ? teaserItems : DEFAULT_LAUNCH_ITEMS,
      countdownEnabled: map.get("maintenanceCountdownEnabled") === "true",
      countdownEndsAt: map.get("maintenanceCountdownEndsAt") || null,
    },
    checkedAt: now,
  };
  return maintenanceModeCache.value;
}

app.get("/api/maintenance-status", async (request, response) => {
  try {
    const settings = await getMaintenanceSettings();
    response.json({
      maintenanceMode: settings.enabled,
      pageType: settings.pageType,
      allowed: isMaintenanceIpAllowed(settings, request),
      detectedIps: getRequestIps(request),
      message: settings.message,
      teaserLabel: settings.teaserLabel,
      teaserHeadline: settings.teaserHeadline,
      teaserItems: settings.teaserItems,
      countdownEnabled: settings.countdownEnabled,
      countdownEndsAt: settings.countdownEndsAt,
    });
  } catch {
    response.json({
      maintenanceMode: false,
      pageType: "maintenance",
      allowed: false,
      detectedIps: getRequestIps(request),
      message: DEFAULT_MAINTENANCE_MESSAGE,
      teaserLabel: DEFAULT_LAUNCH_LABEL,
      teaserHeadline: DEFAULT_LAUNCH_HEADLINE,
      teaserItems: DEFAULT_LAUNCH_ITEMS,
      countdownEnabled: false,
      countdownEndsAt: null,
    });
  }
});

app.use(async (request: Request, response: Response, next: NextFunction) => {
  // Always allow health, admin routes, auth routes, and static files
  if (
    request.path === "/health" ||
    request.path === "/api/maintenance-status" ||
    request.path.startsWith("/api/admin") ||
    request.path.startsWith("/api/auth") ||
    request.path.startsWith("/api/payments/callbacks/") ||
    request.path.startsWith("/uploads")
  ) {
    return next();
  }

  try {
    const settings = await getMaintenanceSettings();
    if (settings.enabled && !isMaintenanceIpAllowed(settings, request)) {
      response.status(503).json({ message: settings.message, maintenance: true });
      return;
    }
  } catch {
    // DB not ready — allow request through
  }
  next();
});

// ── Route modules ──────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api", catalogRouter);
app.use("/api", checkoutRouter);
app.use("/api", studentRouter);
app.use("/api/admin", adminRouter);

// ── Error handler ──────────────────────────────────────────────
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({ message: "Validation failed", issues: error.flatten() });
    return;
  }

  if (error instanceof Error) {
    response.status(500).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Unexpected error" });
});
