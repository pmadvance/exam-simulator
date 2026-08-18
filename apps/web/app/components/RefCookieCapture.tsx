"use client";

import { useEffect } from "react";

/**
 * Reads `?ref=CODE` from the current URL and persists it in a `ref` cookie for 30 days.
 * Picked up automatically by the API at signup (auth.ts reads `request.cookies.ref`)
 * and turned into a pending `referral_redemptions` row.
 *
 * Mount once near the top of any public layout (e.g. inside PublicNavbar).
 * Renders nothing.
 */
export function RefCookieCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("ref");
      if (!raw) return;
      const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
      if (!code) return;
      // 30-day cookie, lax SameSite so it survives external redirects (e.g. payment gateway).
      const maxAge = 60 * 60 * 24 * 30;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `ref=${code}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    } catch {
      // best-effort; never throw from a tracking shim
    }
  }, []);

  return null;
}
