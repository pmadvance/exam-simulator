import type { Request, Response } from "express";
import { createHash } from "crypto";
import { env } from "../config.js";
import { verifyAccessToken, verifyRefreshToken } from "../lib/auth.js";

export const ACCESS_COOKIE_NAME = "pm_access";
export const REFRESH_COOKIE_NAME = "pm_refresh";

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
  path: "/",
  // Don't set domain for localhost to avoid cross-origin cookie issues
  ...(env.APP_URL.includes("localhost") ? {} : { domain: undefined })
};

export const accessCookieMaxAgeMs = env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
export const refreshCookieMaxAgeMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export function getAuthUser(request: Request) {
  const cookieToken = request.cookies?.[ACCESS_COOKIE_NAME];
  if (typeof cookieToken === "string") {
    try {
      return verifyAccessToken(cookieToken);
    } catch {
      // Ignore invalid cookie token and continue to bearer fallback.
    }
  }

  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    return verifyAccessToken(authorization.replace("Bearer ", ""));
  } catch {
    return null;
  }
}

export function requireAuth(request: Request, response: Response) {
  const user = getAuthUser(request);
  if (!user) {
    response.status(401).json({ message: "Missing or invalid authentication token" });
    return null;
  }

  return user;
}

export function requireAdmin(request: Request, response: Response) {
  const user = requireAuth(request, response);
  if (!user) {
    return null;
  }

  const adminRoles = ["admin", "super_admin", "content_admin", "support_admin"];
  if (!adminRoles.includes(user.role)) {
    response.status(403).json({ message: "Admin access required" });
    return null;
  }

  return user;
}

export function requireRole(...roles: string[]) {
  return (request: Request, response: Response) => {
    const user = requireAuth(request, response);
    if (!user) return null;
    if (!roles.includes(user.role)) {
      response.status(403).json({ message: `Access denied. Required role: ${roles.join(" or ")}` });
      return null;
    }
    return user;
  };
}

export function setSessionCookies(
  response: Response,
  values: { accessToken: string; refreshToken: string },
  options?: { refreshMaxAgeMs?: number }
) {
  response.cookie(ACCESS_COOKIE_NAME, values.accessToken, {
    ...authCookieOptions,
    maxAge: accessCookieMaxAgeMs
  });
  response.cookie(REFRESH_COOKIE_NAME, values.refreshToken, {
    ...authCookieOptions,
    maxAge: options?.refreshMaxAgeMs ?? refreshCookieMaxAgeMs
  });
}

export function clearSessionCookies(response: Response) {
  response.clearCookie(ACCESS_COOKIE_NAME, authCookieOptions);
  response.clearCookie(REFRESH_COOKIE_NAME, authCookieOptions);
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export { verifyRefreshToken } from "../lib/auth.js";
