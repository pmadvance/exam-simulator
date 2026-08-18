import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    /\.(?:css|js|map|png|jpg|jpeg|gif|webp|avif|ico|svg|woff2?|ttf)$/i.test(pathname)
  );
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function buildClientIpHeaders(request: NextRequest) {
  const headerNames = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-client-ip",
    "x-forwarded-for",
    "x-vercel-forwarded-for",
    "fly-client-ip",
    "fastly-client-ip",
    "x-real-ip",
    "forwarded",
  ];
  const headers = new Headers();

  for (const name of headerNames) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const forwardedFor =
    firstHeaderValue(request.headers.get("x-forwarded-for")) ||
    firstHeaderValue(request.headers.get("x-vercel-forwarded-for")) ||
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ||
    firstHeaderValue(request.headers.get("true-client-ip")) ||
    firstHeaderValue(request.headers.get("x-client-ip")) ||
    firstHeaderValue(request.headers.get("fly-client-ip")) ||
    firstHeaderValue(request.headers.get("fastly-client-ip")) ||
    firstHeaderValue(request.headers.get("x-real-ip"));

  if (forwardedFor && !headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", forwardedFor);
  }

  return headers;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for login page, API routes, maintenance page, and assets
  if (pathname === "/admin/login" || pathname === "/maintenance" || pathname.startsWith("/api/") || isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  // Check if path is under /admin
  if (pathname.startsWith("/admin")) {
    // Simply check for session cookie presence
    // Actual validation happens in the page components
    const accessCookie = request.cookies.get("pm_access")?.value;
    const refreshCookie = request.cookies.get("pm_refresh")?.value;
    
    // Debug: log cookies (remove in production)
    console.log(`[Middleware] ${pathname} - pm_access: ${accessCookie ? "present" : "missing"}, pm_refresh: ${refreshCookie ? "present" : "missing"}`);
    
    if (!accessCookie) {
      console.log(`[Middleware] ${pathname} - No access cookie, redirecting to login`);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  try {
    const response = await fetch(`${API_URL}/api/maintenance-status`, {
      cache: "no-store",
      headers: buildClientIpHeaders(request),
    });
    if (response.ok) {
      const status = (await response.json()) as { maintenanceMode?: boolean; allowed?: boolean };
      if (status.maintenanceMode && !status.allowed) {
        return NextResponse.redirect(new URL("/maintenance", request.url));
      }
    }
  } catch {
    // If the API cannot be reached, leave the website reachable.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api).*)"],
};
