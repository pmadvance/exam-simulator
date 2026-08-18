"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { browserApiFetch, type LoginResponse } from "../../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regOccupation, setRegOccupation] = useState("");
  const [regGender, setRegGender] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regPrivacyAccepted, setRegPrivacyAccepted] = useState(false);
  const [regStatus, setRegStatus] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);

  // Countdown timer for code cooldown
  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = setTimeout(() => setCodeCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCooldown]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await browserApiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe })
      });

      setStatusMessage(`Signed in as ${response.user.fullName}.`);
      const next = searchParams.get("next");
      router.push(next ?? "/me/dashboard");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  const sendVerificationCode = useCallback(async () => {
    if (!regEmail) { setRegStatus("Enter your email first."); return; }
    setRegBusy(true);
    try {
      const res = await browserApiFetch<{ message: string; code?: string }>("/api/auth/send-verification-code", {
        method: "POST",
        body: JSON.stringify({ email: regEmail })
      });
      setCodeSent(true);
      setCodeCooldown(60);
      setRegStatus(res.code ? `${res.message} (Dev code: ${res.code})` : res.message);
    } catch (error) {
      setRegStatus(error instanceof Error ? error.message : "Failed to send code.");
    } finally {
      setRegBusy(false);
    }
  }, [regEmail]);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegBusy(true);

    try {
      await browserApiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: regEmail,
          fullName: regFullName,
          age: regAge ? Number(regAge) : undefined,
          occupation: regOccupation.trim() || undefined,
          gender: regGender || undefined,
          password: regPassword,
          verificationCode: regCode,
          privacyAccepted: regPrivacyAccepted
        })
      });
      setRegStatus("Account created! You can now sign in.");
      setTab("login");
      setEmail(regEmail);
      setStatusMessage("Account created successfully. Please sign in.");
    } catch (error) {
      setRegStatus(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setRegBusy(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: "linear-gradient(135deg, #F9FAFB 0%, #FFF3EB 50%, #E6F4F6 100%)" }}>
      <div style={{ width: "100%", maxWidth: 440, padding: "40px 16px" }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center mb-3">
            <BrandLogo size="compact" />
          </div>
          <h4 className="fw-bold mb-1" style={{ color: "#1A1D23", letterSpacing: "-0.02em" }}>
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h4>
          <p style={{ color: "#6B7280", fontSize: 14 }}>
            {tab === "login" ? "Sign in to access your practice exams" : "Register a new student account"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="d-flex gap-1 p-1 rounded-pill mb-4" style={{ background: "#F3F4F6" }}>
          <button
            type="button"
            className="flex-fill border-0 py-2 rounded-pill fw-semibold small"
            style={{
              background: tab === "login" ? "#FFFFFF" : "transparent",
              color: tab === "login" ? "#E8792B" : "#6B7280",
              boxShadow: tab === "login" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={() => setTab("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            className="flex-fill border-0 py-2 rounded-pill fw-semibold small"
            style={{
              background: tab === "register" ? "#FFFFFF" : "transparent",
              color: tab === "register" ? "#E8792B" : "#6B7280",
              boxShadow: tab === "register" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={() => setTab("register")}
          >
            Register
          </button>
        </div>

        <div className="card" style={{ border: "1px solid #E5E7EB" }}>
          <div className="card-body p-4">
            {tab === "login" ? (
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="form-check mb-3">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    className="form-check-input"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rememberMe" style={{ fontSize: 13, color: "#3D4149" }}>
                    Remember me
                  </label>
                </div>
                {statusMessage && (
                  <div className="rounded-3 px-3 py-2 mb-3" style={{ background: "#FFF3EB", color: "#C9621A", fontSize: 13 }}>
                    {statusMessage}
                  </div>
                )}
                <button
                  className="btn btn-primary w-100 fw-semibold py-2"
                  type="submit"
                  disabled={busy}
                  style={{ borderRadius: 10 }}
                >
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="mb-3">
                  <label htmlFor="regFullName" className="form-label">Full Name</label>
                  <input
                    id="regFullName"
                    type="text"
                    className="form-control"
                    placeholder="Your full name"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="regEmail" className="form-label">Email</label>
                  <input
                    id="regEmail"
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="row g-3">
                  <div className="col-sm-4">
                    <label htmlFor="regAge" className="form-label">Age</label>
                    <input
                      id="regAge"
                      type="number"
                      className="form-control"
                      placeholder="Age"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      min={13}
                      max={120}
                    />
                  </div>
                  <div className="col-sm-8">
                    <label htmlFor="regOccupation" className="form-label">Occupation</label>
                    <input
                      id="regOccupation"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Project manager"
                      value={regOccupation}
                      onChange={(e) => setRegOccupation(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                </div>
                <div className="mb-3 mt-3">
                  <label htmlFor="regGender" className="form-label">Gender</label>
                  <select
                    id="regGender"
                    className="form-select"
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="regPassword" className="form-label">Password</label>
                  <input
                    id="regPassword"
                    type="password"
                    className="form-control"
                    placeholder="Minimum 8 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <div className="form-text">At least 8 characters</div>
                </div>
                <div className="mb-3">
                  <label htmlFor="regCode" className="form-label">Verification Code</label>
                  <div className="input-group">
                    <input
                      id="regCode"
                      type="text"
                      className="form-control"
                      placeholder="6-digit code"
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                    />
                    <button
                      className="btn fw-semibold"
                      type="button"
                      style={{
                        background: "#E6F4F6",
                        color: "#2B7A87",
                        border: "1.5px solid #2B7A87",
                        borderRadius: "0 8px 8px 0",
                      }}
                      onClick={sendVerificationCode}
                      disabled={regBusy || codeCooldown > 0 || !regEmail}
                    >
                      {codeCooldown > 0 ? `Resend (${codeCooldown}s)` : codeSent ? "Resend Code" : "Get Code"}
                    </button>
                  </div>
                  <div className="form-text">Enter your email first, then click &quot;Get Code&quot;</div>
                </div>
                <div className="form-check mb-3">
                  <input
                    id="regPrivacyAccepted"
                    className="form-check-input"
                    type="checkbox"
                    checked={regPrivacyAccepted}
                    onChange={(event) => setRegPrivacyAccepted(event.target.checked)}
                    required
                  />
                  <label className="form-check-label small" htmlFor="regPrivacyAccepted">
                    I agree to the <Link href="/terms" target="_blank">Terms of Use</Link> and <Link href="/privacy" target="_blank">Privacy Notice</Link>.
                  </label>
                </div>
                {regStatus && (
                  <div className="rounded-3 px-3 py-2 mb-3" style={{ background: "#FFF3EB", color: "#C9621A", fontSize: 13 }}>
                    {regStatus}
                  </div>
                )}
                <button
                  className="btn btn-primary w-100 fw-semibold py-2"
                  type="submit"
                  disabled={regBusy || !codeSent}
                  style={{ borderRadius: 10 }}
                >
                  {regBusy ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="text-center mt-4 d-flex justify-content-center gap-3">
          <Link href="/forgot-password" className="small text-decoration-none" style={{ color: "#6B7280" }}>
            Forgot password?
          </Link>
          <span style={{ color: "#D1D5DB" }}>·</span>
          <Link href="/admin/login" className="small text-decoration-none" style={{ color: "#6B7280" }}>
            Admin login
          </Link>
          <span style={{ color: "#D1D5DB" }}>·</span>
          <Link href="/" className="small text-decoration-none" style={{ color: "#2B7A87" }}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
