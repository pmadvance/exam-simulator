"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserApiFetch, type StudentOrder, type EnrollmentSummary } from "../../../../lib/api";
import { useToast } from "../../../../app/components/Toast";

type Props = {
  initialOrders: StudentOrder[];
  initialReferral: ReferralMe | null;
};

export type ReferralMe = {
  code: string;
  shareUrl: string;
  totalRedemptions: number;
  totalRewardMyr: number;
  recent: Array<{ id: number; status: string; createdAt: string; rewardedAt: string | null; refereeEmail: string }>;
};

const PRIMARY = "#E8792B";
const TEAL = "#2B7A87";
const INK = "#1A1D23";
const MUTED = "#6B7280";
const SUCCESS = "#059669";
const PASSWORD_REQUIREMENTS = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function AccountScreen({ initialOrders, initialReferral }: Props) {
  const [orders] = useState(initialOrders);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdpaType, setPdpaType] = useState<"access" | "correction" | "deletion" | "withdrawal" | "other">("access");
  const [pdpaMessage, setPdpaMessage] = useState("");
  const [pdpaBusy, setPdpaBusy] = useState(false);
  const [pdpaStatus, setPdpaStatus] = useState("");
  const { toast } = useToast();

  const [referral, setReferral] = useState<ReferralMe | null>(initialReferral);
  const [referralLoading, setReferralLoading] = useState(initialReferral === null);
  
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);

  // Fetch current user data on load
  useEffect(() => {
    let cancelled = false;
    browserApiFetch<{ id: number; email: string; fullName: string; age: number | null; occupation: string | null; gender: string | null; role: string }>("/api/auth/me")
      .then((data) => { 
        if (!cancelled && data) {
          if (data.fullName) setFullName(data.fullName);
          setAge(data.age ? String(data.age) : "");
          setOccupation(data.occupation ?? "");
          setGender(data.gender ?? "");
        }
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (initialReferral !== null) return;
    let cancelled = false;
    browserApiFetch<ReferralMe>("/api/referral/me")
      .then((data) => { if (!cancelled) setReferral(data); })
      .catch(() => { /* user may be on a stale session */ })
      .finally(() => { if (!cancelled) setReferralLoading(false); });
    return () => { cancelled = true; };
  }, [initialReferral]);
  
  // Fetch enrollments
  useEffect(() => {
    let cancelled = false;
    browserApiFetch<EnrollmentSummary[]>("/api/enrollments")
      .then((data) => { if (!cancelled) setEnrollments(data.filter(e => e.status === "active" && new Date(e.expiresAt) > new Date())); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setEnrollmentsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function copyToClipboard(text: string, label: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast("Clipboard not available — copy manually.", "warning");
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => toast(`${label} copied`, "success"))
      .catch(() => toast("Copy failed", "error"));
  }
  
  function daysUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86_400_000));
  }

  async function updateProfile() {
    setBusy(true);
    setStatus("");
    try {
      if (newPassword.trim()) {
        if (!PASSWORD_REQUIREMENTS.test(newPassword)) {
          const message = "New password must contain both letters and numbers.";
          setStatus(message);
          toast(message, "warning");
          return;
        }
        if (newPassword !== confirmNewPassword) {
          const message = "New password and confirmation do not match.";
          setStatus(message);
          toast(message, "warning");
          return;
        }
      }

      const payload: Record<string, unknown> = {};
      if (fullName.trim()) payload.fullName = fullName.trim();
      payload.age = age ? Number(age) : null;
      payload.occupation = occupation.trim() || null;
      payload.gender = gender || null;
      if (newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        setStatus("Enter at least one field to update.");
        toast("Enter at least one field to update.", "warning");
        return;
      }
      await browserApiFetch<{ message: string }>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setStatus("Profile updated successfully.");
      toast("Profile updated successfully.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update profile.";
      setStatus(msg);
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitPdpaRequest() {
    setPdpaBusy(true);
    setPdpaStatus("");
    try {
      await browserApiFetch<{ id: number; status: string }>("/api/pdpa-requests", {
        method: "POST",
        body: JSON.stringify({ requestType: pdpaType, message: pdpaMessage.trim() || undefined })
      });
      setPdpaStatus("Request submitted. Our team will review it and contact you if more information is needed.");
      setPdpaMessage("");
      toast("Privacy request submitted.", "success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to submit privacy request.";
      setPdpaStatus(msg);
      toast(msg, "error");
    } finally {
      setPdpaBusy(false);
    }
  }

  return (
    <div className="container py-4 animate-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
        <div>
          <p className="text-uppercase fw-semibold mb-2" style={{ fontSize: 12, letterSpacing: "0.18em", color: TEAL }}>
            Settings
          </p>
          <h1 className="fw-bold mb-0" style={{ fontSize: "1.875rem", color: INK }}>
            My Account
          </h1>
        </div>
        <a
          href="/me/dashboard"
          className="btn btn-sm fw-semibold px-3 d-flex align-items-center gap-1"
          style={{ color: TEAL, border: `1px solid ${TEAL}`, borderRadius: 8, fontSize: 13 }}
        >
          <i className="bi bi-arrow-left" style={{ fontSize: 12 }} />
          Back to dashboard
        </a>
      </div>

      <div className="row g-4">
        {/* Profile form */}
        <div className="col-lg-7">
          <div className="card border-0" style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 36, height: 36, background: "#FFF3EB" }}
                >
                  <i className="bi bi-person-gear" style={{ color: PRIMARY, fontSize: 16 }} />
                </div>
                <h2 className="fw-semibold mb-0" style={{ fontSize: 16, color: INK }}>Update Profile</h2>
              </div>

              <div className="mb-3">
                <label htmlFor="fullName" className="form-label fw-semibold" style={{ fontSize: 13, color: "#3D4149" }}>
                  Full name
                </label>
                <input
                  id="fullName"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor="age" className="form-label fw-semibold" style={{ fontSize: 13, color: "#3D4149" }}>
                    Age
                  </label>
                  <input
                    id="age"
                    className="form-control"
                    type="number"
                    min={13}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Age"
                  />
                </div>
                <div className="col-md-8">
                  <label htmlFor="occupation" className="form-label fw-semibold" style={{ fontSize: 13, color: "#3D4149" }}>
                    Occupation
                  </label>
                  <input
                    id="occupation"
                    className="form-control"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Project manager"
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="mb-3 mt-3">
                <label htmlFor="gender" className="form-label fw-semibold" style={{ fontSize: 13, color: "#3D4149" }}>
                  Gender
                </label>
                <select
                  id="gender"
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <hr className="my-3" style={{ borderColor: "#E5E7EB" }} />

              <p className="fw-semibold mb-3" style={{ fontSize: 13, color: "#3D4149" }}>
                <i className="bi bi-shield-lock me-1" style={{ color: TEAL }} />
                Change Password
              </p>

              <div className="mb-3">
                <label htmlFor="currentPassword" className="form-label fw-semibold" style={{ fontSize: 13, color: "#3D4149" }}>
                  Current password
                </label>
                <input
                  id="currentPassword"
                  className="form-control"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required to change password"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label fw-semibold" style={{ fontSize: 13, color: "#3D4149" }}>
                  New password
                </label>
                <input
                  id="newPassword"
                  className="form-control"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
                <div className="form-text" style={{ color: MUTED, fontSize: 12 }}>
                  Use at least 8 characters with both letters and numbers.
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="confirmNewPassword" className="form-label fw-semibold" style={{ fontSize: 13, color: "#3D4149" }}>
                  Confirm new password
                </label>
                <input
                  id="confirmNewPassword"
                  className="form-control"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              <button
                className="btn fw-semibold px-4"
                type="button"
                onClick={updateProfile}
                disabled={busy}
                style={{ background: PRIMARY, color: "#fff", borderRadius: 8, fontSize: 14 }}
              >
                {busy ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>

              {status && (
                <div
                  className="rounded-3 px-3 py-2 mt-3 d-flex align-items-center gap-2"
                  style={{
                    background: status.includes("success") ? "#ECFDF5" : "#FFF3EB",
                    color: status.includes("success") ? SUCCESS : "#C9621A",
                    fontSize: 13,
                  }}
                >
                  <i className={`bi ${status.includes("success") ? "bi-check-circle" : "bi-info-circle"}`} />
                  {status}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscriptions & Order history */}
        <div className="col-lg-5">
          {/* My Subscriptions */}
          <div className="card border-0 mb-4" style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 36, height: 36, background: "#ECFDF5" }}
                >
                  <i className="bi bi-journal-bookmark-fill" style={{ color: SUCCESS, fontSize: 16 }} />
                </div>
                <h2 className="fw-semibold mb-0" style={{ fontSize: 16, color: INK }}>My Subscriptions</h2>
              </div>

              {enrollmentsLoading ? (
                <div className="text-center py-3">
                  <span className="spinner-border spinner-border-sm" style={{ color: MUTED }} />
                </div>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-3">
                  <i className="bi bi-journal-x d-block mb-2" style={{ fontSize: 32, color: "#D1D5DB" }} />
                  <p className="mb-2" style={{ color: MUTED, fontSize: 14 }}>No active subscriptions.</p>
                  <Link href="/" className="btn btn-sm fw-semibold" style={{ background: PRIMARY, color: "#fff", borderRadius: 8 }}>
                    Browse Exams
                  </Link>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {enrollments.map((e) => {
                    const days = daysUntil(e.expiresAt);
                    const urgent = days <= 14;
                    return (
                      <div
                        key={e.id}
                        className="rounded-3 p-3"
                        style={{ background: urgent ? "#FEF2F2" : "#F9FAFB", border: `1px solid ${urgent ? "#FECACA" : "#E5E7EB"}` }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <strong style={{ color: INK, fontSize: 14 }}>{e.productTitle}</strong>
                          <span
                            className="px-2 py-1 rounded-2 fw-semibold"
                            style={{
                              fontSize: 11,
                              background: urgent ? "#FEE2E2" : "#ECFDF5",
                              color: urgent ? "#DC2626" : SUCCESS,
                            }}
                          >
                            {days}d left
                          </span>
                        </div>
                        <p className="mb-0" style={{ color: MUTED, fontSize: 12 }}>
                          Expires {new Date(e.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })}
                  <Link 
                    href="/" 
                    className="btn btn-sm fw-semibold mt-1"
                    style={{ color: TEAL, border: `1px solid ${TEAL}33`, borderRadius: 8 }}
                  >
                    <i className="bi bi-plus-circle me-1" />
                    Subscribe to more exams
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Order History */}
          <div className="card border-0" style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 36, height: 36, background: "#E6F4F6" }}
                >
                  <i className="bi bi-receipt" style={{ color: TEAL, fontSize: 16 }} />
                </div>
                <h2 className="fw-semibold mb-0" style={{ fontSize: 16, color: INK }}>Order History</h2>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-receipt d-block mb-2" style={{ fontSize: 36, color: "#D1D5DB" }} />
                  <p className="mb-0" style={{ color: MUTED, fontSize: 14 }}>No orders yet.</p>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-3 p-3"
                      style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <strong style={{ color: INK, fontSize: 14 }}>Order #{o.id}</strong>
                        <span
                          className="px-2 py-1 rounded-2 fw-semibold"
                          style={{
                            fontSize: 11,
                            letterSpacing: "0.04em",
                            background: o.status === "paid" ? "#ECFDF5" : "#FFF3EB",
                            color: o.status === "paid" ? SUCCESS : PRIMARY,
                          }}
                        >
                          {o.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="mb-1" style={{ color: MUTED, fontSize: 13 }}>
                        {o.productTitle} · USD {o.totalAmount}
                      </p>
                      <p className="mb-0" style={{ color: "#9CA3AF", fontSize: 12 }}>
                        {new Date(o.createdAt).toLocaleString()}
                      </p>
                      {o.status === "paid" && (
                        <a
                          href={`/api/orders/${o.id}/receipt?format=html`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm fw-medium mt-2 d-inline-flex align-items-center gap-1"
                          style={{
                            color: TEAL,
                            border: `1px solid ${TEAL}33`,
                            borderRadius: 6,
                            fontSize: 12,
                            padding: "4px 10px",
                          }}
                        >
                          <i className="bi bi-receipt" style={{ fontSize: 12 }} />
                          Download Receipt
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Privacy / PDPA Requests */}
        <div className="col-12">
          <div className="card border-0" style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, background: "#E6F4F6" }}
                  >
                    <i className="bi bi-shield-check" style={{ color: TEAL, fontSize: 16 }} />
                  </div>
                  <h2 className="fw-semibold mb-0" style={{ fontSize: 16, color: INK }}>Privacy Requests</h2>
                </div>
                <Link href="/privacy" className="small fw-semibold" style={{ color: TEAL }}>
                  Privacy Notice
                </Link>
              </div>
              <p className="mb-3" style={{ color: MUTED, fontSize: 13 }}>
                Request access, correction, deletion, withdrawal of consent, or another privacy-related action.
              </p>
              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor="pdpaType" className="form-label fw-semibold" style={{ fontSize: 13 }}>Request type</label>
                  <select
                    id="pdpaType"
                    className="form-select"
                    value={pdpaType}
                    onChange={(event) => setPdpaType(event.target.value as typeof pdpaType)}
                    disabled={pdpaBusy}
                  >
                    <option value="access">Access my data</option>
                    <option value="correction">Correct my data</option>
                    <option value="deletion">Delete my data</option>
                    <option value="withdrawal">Withdraw consent</option>
                    <option value="other">Other request</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <label htmlFor="pdpaMessage" className="form-label fw-semibold" style={{ fontSize: 13 }}>Details</label>
                  <textarea
                    id="pdpaMessage"
                    className="form-control"
                    rows={3}
                    value={pdpaMessage}
                    onChange={(event) => setPdpaMessage(event.target.value)}
                    placeholder="Add any details that will help us process your request."
                    disabled={pdpaBusy}
                  />
                </div>
              </div>
              <button
                className="btn fw-semibold px-4 mt-3"
                type="button"
                onClick={submitPdpaRequest}
                disabled={pdpaBusy}
                style={{ background: TEAL, color: "#fff", borderRadius: 8, fontSize: 14 }}
              >
                {pdpaBusy ? "Submitting..." : "Submit privacy request"}
              </button>
              {pdpaStatus && (
                <div className="rounded-3 px-3 py-2 mt-3" style={{ background: "#F9FAFB", color: MUTED, fontSize: 13 }}>
                  {pdpaStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Refer & Earn */}
        <div className="col-12">
          <div className="card border-0" style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)" }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-4 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, background: "#FFF3EB" }}
                  >
                    <i className="bi bi-gift" style={{ color: PRIMARY, fontSize: 16 }} />
                  </div>
                  <h2 className="fw-semibold mb-0" style={{ fontSize: 16, color: INK }}>Refer &amp; Earn 15%</h2>
                </div>
                <span style={{ fontSize: 12, color: MUTED }}>
                  Share your link &mdash; you both get 15% off when they buy.
                </span>
              </div>

              {referralLoading ? (
                <div className="text-center py-3" style={{ color: MUTED, fontSize: 13 }}>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Loading your referral details&hellip;
                </div>
              ) : !referral ? (
                <div className="text-center py-3" style={{ color: MUTED, fontSize: 13 }}>
                  Sign in to view your referral code.
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-7">
                    <label className="form-label fw-semibold" style={{ fontSize: 12, color: "#3D4149" }}>
                      Your share link
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control font-monospace"
                        value={referral.shareUrl}
                        readOnly
                        style={{ fontSize: 13 }}
                      />
                      <button
                        type="button"
                        className="btn"
                        style={{ background: PRIMARY, color: "#fff", fontSize: 13 }}
                        onClick={() => copyToClipboard(referral.shareUrl, "Link")}
                      >
                        <i className="bi bi-clipboard me-1" />
                        Copy
                      </button>
                    </div>
                    <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontSize: 12, color: MUTED }}>or share code:</span>
                      <code
                        className="px-2 py-1 rounded-2"
                        style={{ background: "#FFF3EB", color: PRIMARY, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em" }}
                      >
                        {referral.code}
                      </code>
                      <button
                        type="button"
                        className="btn btn-sm fw-medium"
                        style={{ color: TEAL, border: `1px solid ${TEAL}33`, borderRadius: 6, fontSize: 12, padding: "2px 8px" }}
                        onClick={() => copyToClipboard(referral.code, "Code")}
                      >
                        <i className="bi bi-clipboard" /> Copy code
                      </button>
                    </div>
                  </div>

                  <div className="col-md-5">
                    <div className="row g-2 h-100">
                      <div className="col-6">
                        <div
                          className="rounded-3 p-3 h-100"
                          style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
                        >
                          <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Friends Joined
                          </div>
                          <div className="fw-bold" style={{ fontSize: 22, color: INK }}>
                            {referral.totalRedemptions}
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div
                          className="rounded-3 p-3 h-100"
                          style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}
                        >
                          <div style={{ fontSize: 11, color: SUCCESS, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Rewards Earned
                          </div>
                          <div className="fw-bold" style={{ fontSize: 22, color: INK }}>
                            USD {Number(referral.totalRewardMyr ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {referral.recent.length > 0 && (
                    <div className="col-12">
                      <hr className="my-2" style={{ borderColor: "#E5E7EB" }} />
                      <p className="fw-semibold mb-2" style={{ fontSize: 12, color: "#3D4149" }}>
                        Recent referrals
                      </p>
                      <div className="d-grid gap-2">
                        {referral.recent.map((r) => (
                          <div
                            key={r.id}
                            className="d-flex align-items-center justify-content-between rounded-2 px-3 py-2"
                            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", fontSize: 13 }}
                          >
                            <span style={{ color: INK }}>
                              {r.refereeEmail.replace(/(.{2}).+(@.+)/, "$1•••$2")}
                            </span>
                            <span
                              className="px-2 py-1 rounded-2 fw-semibold"
                              style={{
                                fontSize: 11,
                                background: r.status === "rewarded" ? "#ECFDF5" : "#FFF3EB",
                                color: r.status === "rewarded" ? SUCCESS : PRIMARY,
                              }}
                            >
                              {r.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
