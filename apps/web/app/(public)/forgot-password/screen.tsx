"use client";

import Link from "next/link";
import { useState } from "react";

import { browserApiFetch } from "../../../lib/api";

type ForgotPasswordResponse = {
  message: string;
  resetUrl?: string;
};

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Enter your account email and we'll send you a password reset link.");
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setDebugResetUrl(null);

    try {
      const response = await browserApiFetch<ForgotPasswordResponse>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });

      setSent(true);
      setStatusMessage(response.message);
      setDebugResetUrl(response.resetUrl ?? null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to process request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: "linear-gradient(135deg, #F9FAFB 0%, #FFF3EB 50%, #E6F4F6 100%)" }}>
      <div style={{ width: "100%", maxWidth: 440, padding: "40px 16px" }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3" style={{ width: 56, height: 56, background: "#FFF3EB" }}>
            <i className={`bi ${sent ? "bi-envelope-check-fill" : "bi-key-fill"} fs-4`} style={{ color: "#E8792B" }} />
          </div>
          <h4 className="fw-bold mb-1" style={{ color: "#1A1D23", letterSpacing: "-0.02em" }}>
            {sent ? "Check your email" : "Reset your password"}
          </h4>
          <p style={{ color: "#6B7280", fontSize: 14 }}>
            {sent
              ? `We sent a password reset link to ${email}`
              : "Enter your account email and we'll send you a reset link"}
          </p>
        </div>

        <div className="card" style={{ border: "1px solid #E5E7EB" }}>
          <div className="card-body p-4">
            {!sent ? (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label small">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                {statusMessage && (
                  <p className="text-body-secondary small mb-3">{statusMessage}</p>
                )}
                <button className="btn btn-primary w-100 fw-semibold py-2" type="submit" disabled={busy} style={{ borderRadius: 10 }}>
                  {busy ? "Sending..." : "Send reset link"}
                </button>
              </form>
            ) : (
              <div className="text-center py-2">
                <p className="text-body-secondary small mb-3">{statusMessage}</p>
                <p className="text-body-secondary small mb-3">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
                  <button type="button" className="btn btn-link p-0 small" onClick={() => setSent(false)}>try again</button>.
                </p>
                {debugResetUrl ? (
                  <p className="text-body-secondary small mt-3 mb-0">
                    Dev link: <a href={debugResetUrl} className="text-primary">{debugResetUrl}</a>
                  </p>
                ) : null}
              </div>
            )}
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
