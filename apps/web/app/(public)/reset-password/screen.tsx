"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { browserApiFetch } from "../../../lib/api";

type ResetPasswordResponse = {
  message: string;
};

export function ResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Set a new password with at least 8 characters.");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setStatusMessage("Reset token is missing. Open the full reset link again.");
      return;
    }
    if (password !== confirmPassword) {
      setStatusMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await browserApiFetch<ResetPasswordResponse>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setStatusMessage(response.message);
      router.push("/login");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: "linear-gradient(135deg, #F9FAFB 0%, #FFF3EB 50%, #E6F4F6 100%)" }}>
      <div style={{ width: "100%", maxWidth: 440, padding: "40px 16px" }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3" style={{ width: 56, height: 56, background: "#FFF3EB" }}>
            <i className="bi bi-lock-fill fs-4" style={{ color: "#E8792B" }} />
          </div>
          <h4 className="fw-bold mb-1" style={{ color: "#1A1D23", letterSpacing: "-0.02em" }}>Choose a new password</h4>
          <p style={{ color: "#6B7280", fontSize: 14 }}>Set a new password with at least 8 characters</p>
        </div>

        <div className="card" style={{ border: "1px solid #E5E7EB" }}>
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="password" className="form-label small">New password</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="confirmPassword" className="form-label small">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {statusMessage && (
                <p className="text-body-secondary small mb-3">{statusMessage}</p>
              )}
              <button className="btn btn-primary w-100 fw-semibold py-2" type="submit" disabled={busy} style={{ borderRadius: 10 }}>
                {busy ? "Updating password..." : "Update password"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-4">
          <Link href="/login" className="small text-decoration-none" style={{ color: "#2B7A87" }}>
            <i className="bi bi-arrow-left me-1" />Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
