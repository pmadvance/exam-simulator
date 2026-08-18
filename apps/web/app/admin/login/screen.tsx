"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserApiFetch, type LoginResponse } from "../../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";

export function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      console.log("[Login] Attempting login...", { email });
      
      const res = await browserApiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      console.log("[Login] Response:", res);

      // Check for admin role (including all admin variants)
      const adminRoles = ["admin", "super_admin", "content_admin", "support_admin"];
      if (!adminRoles.includes(res.user.role)) {
        setError(`This account has role "${res.user.role}" and does not have admin access.`);
        setBusy(false);
        return;
      }

      console.log("[Login] Success! Role:", res.user.role);
      console.log("[Login] Cookies should be set. Redirecting in 1 second...");
      
      // Successful login - redirect to admin dashboard
      setTimeout(() => {
        console.log("[Login] Navigating to /admin");
        window.location.assign("/admin");
      }, 1000);
    } catch (err) {
      console.error("[Login] Error:", err);
      setError(err instanceof Error ? err.message : "Login failed.");
      setBusy(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: "linear-gradient(135deg, #F9FAFB 0%, #FFF3EB 50%, #E6F4F6 100%)" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center mb-3">
            <BrandLogo size="compact" />
          </div>
          <h4 className="fw-bold mb-1" style={{ color: "#1A1D23", letterSpacing: "-0.02em" }}>Admin Portal</h4>
          <p className="small" style={{ color: "#6B7280" }}>Sign in with your administrator account</p>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && (
                <div className="alert alert-danger py-2 small">{error}</div>
              )}
              <button 
                className="btn w-100 fw-semibold text-white" 
                type="submit" 
                disabled={busy} 
                style={{ 
                  borderRadius: 10, 
                  background: "#E8792B",
                  border: "none",
                  padding: "12px"
                }}
              >
                {busy ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Signing in...
                  </>
                ) : (
                  "Sign in to Admin"
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-3">
          <Link href="/login" className="small text-decoration-none fw-medium" style={{ color: "#2B7A87" }}>
            <i className="bi bi-arrow-left me-1" />Student login
          </Link>
        </p>
      </div>
    </div>
  );
}
