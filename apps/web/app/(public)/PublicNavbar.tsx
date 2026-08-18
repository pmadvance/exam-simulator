"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { browserApiFetch, apiUrl } from "../../lib/api";
import { useCurrency } from "../../lib/currency";
import { BrandLogo } from "../components/BrandLogo";
import { RefCookieCapture } from "../components/RefCookieCapture";

export function PublicNavbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ email: string; fullName: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { currency, supportedCurrencies, setCurrency: chooseCurrency, loading: currencyLoading } = useCurrency();

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const me = await browserApiFetch<{ id: number; email: string; fullName: string }>("/api/auth/me");
        if (!cancelled && me?.email) {
          setIsLoggedIn(true);
          setUser(me);
        }
      } catch {
        // not logged in
      }
    }

    void checkAuth();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    window.location.href = `${apiUrl}/api/auth/signout`;
  }

  const navLinks = [
    { href: "/#catalog", label: "Catalog" },
    { href: "/faq", label: "FAQ" },
    { href: "/tutorial", label: "Tutorial" },
  ];

  function isActive(href: string) {
    if (href === "/#catalog") return pathname === "/";
    return pathname === href;
  }

  return (
    <nav
      className="navbar navbar-expand-md bg-white"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1030,
        height: 64,
        transition: "box-shadow 0.2s ease",
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.08)" : "none",
        borderBottom: scrolled ? "none" : "1px solid var(--line-soft, #E5E7EB)",
      }}
    >
      <RefCookieCapture />
      <div className="container">
        <Link href="/" className="navbar-brand d-flex align-items-center py-0">
          <BrandLogo size="compact" />
        </Link>

        {/* Nav links — centered */}
        <div className="d-none d-md-flex align-items-center gap-1 ms-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-2 text-decoration-none small fw-medium"
              style={{
                color: isActive(link.href) ? "#E8792B" : "#3D4149",
                background: isActive(link.href) ? "#FFF3EB" : "transparent",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="d-flex gap-2 align-items-center ms-auto">
          <label className="visually-hidden" htmlFor="publicCurrency">Currency</label>
          <select
            id="publicCurrency"
            className="form-select form-select-sm fw-semibold"
            value={currency}
            onChange={(event) => chooseCurrency(event.target.value)}
            disabled={currencyLoading}
            aria-label="Currency"
            style={{
              width: 82,
              borderRadius: 8,
              borderColor: "var(--line-soft, #E5E7EB)",
              color: "#3D4149",
              boxShadow: "none",
            }}
          >
            {supportedCurrencies.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

          {isLoggedIn && user ? (
            <div className="position-relative">
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-2 border rounded-pill px-3"
                style={{ borderColor: "var(--line)" }}
                onClick={() => setShowMenu((v) => !v)}
              >
                <span className="small fw-medium" style={{ color: "#1A1D23" }}>
                  {user.fullName}
                </span>
                <i className="bi bi-chevron-down" style={{ fontSize: 10, color: "#6B7280" }} />
              </button>

              {showMenu && (
                <>
                  <div
                    className="position-fixed top-0 start-0 w-100 h-100"
                    style={{ zIndex: 10 }}
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="position-absolute end-0 mt-2 bg-white rounded-3 py-1"
                    style={{ zIndex: 11, minWidth: 200, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "1px solid var(--line-soft)" }}
                  >
                    <div className="px-3 py-2 border-bottom" style={{ borderColor: "var(--line-soft)" }}>
                      <div className="fw-semibold small" style={{ color: "#1A1D23" }}>{user.fullName}</div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>{user.email}</div>
                    </div>
                    <Link
                      href="/me/dashboard"
                      className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                      style={{ color: "#3D4149" }}
                      onClick={() => setShowMenu(false)}
                    >
                      <i className="bi bi-speedometer2" style={{ color: "#E8792B" }} />
                      Dashboard
                    </Link>
                    <Link
                      href="/me/exams"
                      className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                      style={{ color: "#3D4149" }}
                      onClick={() => setShowMenu(false)}
                    >
                      <i className="bi bi-journal-text" style={{ color: "#2B7A87" }} />
                      My Exams
                    </Link>
                    <Link
                      href="/me/performance"
                      className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                      style={{ color: "#3D4149" }}
                      onClick={() => setShowMenu(false)}
                    >
                      <i className="bi bi-graph-up" style={{ color: "#2B7A87" }} />
                      Performance
                    </Link>
                    <hr className="my-1" style={{ borderColor: "var(--line-soft)" }} />
                    <Link
                      href="/me/account"
                      className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                      style={{ color: "#3D4149" }}
                      onClick={() => setShowMenu(false)}
                    >
                      <i className="bi bi-person-circle" style={{ color: "#E8792B" }} />
                      My Account
                    </Link>
                    <button
                      type="button"
                      className="d-flex align-items-center gap-2 px-3 py-2 small w-100 border-0 bg-transparent"
                      style={{ color: "#DC2626", cursor: "pointer" }}
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="d-flex gap-2 align-items-center">
              <Link
                href="/login"
                className="btn btn-sm fw-semibold"
                style={{ color: "#3D4149" }}
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="btn btn-sm fw-semibold text-white px-3"
                style={{ background: "#E8792B", borderRadius: 8 }}
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
