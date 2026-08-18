"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { EnrollmentSummary, AttemptHistoryItem, ExamGoal } from "../../../../lib/api";
import { browserApiFetch } from "../../../../lib/api";
import { useExam } from "../../ExamContext";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const PRIMARY = "#E8792B";
const TEAL = "#2B7A87";

type ExamInfo = {
  id: number;
  slug: string;
  title: string;
  timeLimitMinutes: number;
  passThreshold: number;
  questionCount: number;
  status?: string;
};

type Props = {
  initialEnrollments: EnrollmentSummary[];
  initialAttempts: AttemptHistoryItem[];
  initialExamGoal: ExamGoal | null;
  userName: string;
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function pct(score: number | null, total: number) {
  if (!score || !total) return 0;
  return Math.round((score / total) * 100);
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, accent, sub }: {
  icon: string; label: string; value: string | number; accent: string; sub?: string;
}) {
  return (
    <div className="card h-100" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="card-body d-flex align-items-start gap-3 p-3">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 42, height: 42, background: `${accent}14` }}
        >
          <i className={`bi ${icon}`} style={{ color: accent, fontSize: 18 }} />
        </div>
        <div>
          <div className="fw-bold" style={{ fontSize: 24, color: "#1A1D23", lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Quick Action Link ── */
function QuickAction({ icon, title, href, color = PRIMARY }: {
  icon: string; title: string; href: string; color?: string;
}) {
  return (
    <a
      href={href}
      className="d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none"
      style={{ color: "#3D4149", transition: "background 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 34, height: 34, background: `${color}14` }}
      >
        <i className={`bi ${icon}`} style={{ color, fontSize: 15 }} />
      </div>
      <span className="fw-medium" style={{ fontSize: 14 }}>{title}</span>
      <i className="bi bi-chevron-right ms-auto" style={{ fontSize: 12, color: "#D1D5DB" }} />
    </a>
  );
}

export function StudentDashboardScreen({ initialEnrollments, initialAttempts, initialExamGoal, userName }: Props) {
  const { selectedExamSlug, currentEnrollment, enrollments } = useExam();
  const [attempts, setAttempts] = useState(initialAttempts);
  const [busy, setBusy] = useState(false);
  const [productExams, setProductExams] = useState<ExamInfo[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [examGoal, setExamGoal] = useState<ExamGoal | null>(initialExamGoal);
  const [goalDateInput, setGoalDateInput] = useState(initialExamGoal?.examDate ?? "");
  const [goalLabelInput, setGoalLabelInput] = useState(initialExamGoal?.certificationLabel ?? "");
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalMessage, setGoalMessage] = useState("");

  async function refreshAttempts() {
    setBusy(true);
    try {
      const data = await browserApiFetch<AttemptHistoryItem[]>("/api/attempts");
      setAttempts(data);
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  }

  async function saveExamGoal() {
    if (!goalDateInput) {
      setGoalMessage("Choose your exam date first.");
      return;
    }
    setGoalBusy(true);
    setGoalMessage("");
    try {
      const saved = await browserApiFetch<ExamGoal>("/api/exam-goal", {
        method: "PUT",
        body: JSON.stringify({
          examDate: goalDateInput,
          certificationLabel: goalLabelInput.trim() || undefined
        })
      });
      setExamGoal(saved);
      setGoalMessage("Exam date saved.");
    } catch (error) {
      setGoalMessage(error instanceof Error ? error.message : "Unable to save exam date.");
    } finally {
      setGoalBusy(false);
    }
  }

  const activeEnrollments = enrollments.filter((e) => e.status === "active" && new Date(e.expiresAt) > new Date());
  const inProgressAttempts = attempts.filter((a) => a.status === "in_progress");
  const submittedAttempts = attempts.filter((a) => a.status === "submitted");

  const effectiveSlug = selectedExamSlug || (activeEnrollments.length ? activeEnrollments[0].productSlug : "");

  const loadExams = useCallback(async (slug: string) => {
    if (!slug) { setProductExams([]); return; }
    setLoadingExams(true);
    try {
      const product = await browserApiFetch<{ exams: ExamInfo[] }>(`/api/products/${slug}`);
      setProductExams((product.exams ?? []).filter((e) => e.status === "published"));
    } catch { setProductExams([]); }
    finally { setLoadingExams(false); }
  }, []);

  useEffect(() => {
    void loadExams(effectiveSlug);
  }, [effectiveSlug, loadExams]);

  const examSlugsForProduct = useMemo(() => new Set(productExams.map((e) => e.slug)), [productExams]);

  const filteredSubmitted = useMemo(() => {
    if (!examSlugsForProduct.size) return submittedAttempts;
    return submittedAttempts.filter((a) => examSlugsForProduct.has(a.examSlug));
  }, [submittedAttempts, examSlugsForProduct]);

  const filteredInProgress = useMemo(() => {
    if (!examSlugsForProduct.size) return inProgressAttempts;
    return inProgressAttempts.filter((a) => examSlugsForProduct.has(a.examSlug));
  }, [inProgressAttempts, examSlugsForProduct]);

  const stats = useMemo(() => {
    const scores = filteredSubmitted.map((a) => pct(a.score, a.totalQuestions));
    const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    const best = scores.length ? Math.max(...scores) : 0;
    const latest = filteredSubmitted.length ? filteredSubmitted[0] : null;
    const passRate = scores.length ? Math.round((scores.filter((s) => s >= 65).length / scores.length) * 100) : 0;
    return { avg, best, latest, completedCount: filteredSubmitted.length, passRate };
  }, [filteredSubmitted]);

  const nearestExpiry = useMemo(() => {
    if (!activeEnrollments.length) return null;
    return activeEnrollments.reduce((a, b) => (new Date(a.expiresAt) < new Date(b.expiresAt) ? a : b));
  }, [activeEnrollments]);

  const examGoalDays = examGoal ? daysUntil(`${examGoal.examDate}T00:00:00`) : null;

  /* Score trend data for mini chart */
  const trendData = useMemo(() => {
    const recent = filteredSubmitted.slice(0, 10).reverse();
    return {
      labels: recent.map((_, i) => `#${i + 1}`),
      datasets: [
        {
          data: recent.map((a) => pct(a.score, a.totalQuestions)),
          borderColor: PRIMARY,
          backgroundColor: "rgba(232,121,43,0.08)",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: PRIMARY,
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [filteredSubmitted]);

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0}%` } } },
    scales: {
      x: { display: true, grid: { display: false }, ticks: { font: { size: 10 }, color: "#9CA3AF" } },
      y: { display: true, min: 0, max: 100, grid: { color: "#F3F4F6" }, ticks: { font: { size: 10 }, color: "#9CA3AF", callback: (v: number | string) => `${v}%` } },
    },
  } as const;

  return (
    <div>
      <div className="container-lg py-4 animate-in">
        {/* ═══════ Header Row ═══════ */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <h1 className="fw-bold mb-1" style={{ color: "#1A1D23", fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              Welcome back, {userName || "Student"}
            </h1>
          </div>
        </div>

        {/* ═══════ Subscription Warning (only if no sub or near expiry) ═══════ */}
        {!nearestExpiry ? (
          <div className="d-flex align-items-center gap-3 rounded-3 px-4 py-3 mb-4" style={{ background: "#FFF3EB", border: "1px solid #FDDCBB" }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color: PRIMARY, fontSize: 20 }} />
            <div>
              <span className="fw-semibold d-block" style={{ color: "#C9621A", fontSize: 14 }}>No Active Subscription</span>
              <span style={{ color: "#6B7280", fontSize: 13 }}>
                You don&apos;t have any active subscriptions.{" "}
                <a href="/" className="fw-semibold text-decoration-none" style={{ color: PRIMARY }}>Browse products to get started</a>
              </span>
            </div>
          </div>
        ) : daysUntil(nearestExpiry.expiresAt) <= 14 ? (
          <div className="d-flex align-items-center gap-3 rounded-3 px-4 py-3 mb-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <i className="bi bi-clock-history" style={{ color: "#DC2626", fontSize: 20 }} />
            <div>
              <span className="fw-semibold d-block" style={{ color: "#DC2626", fontSize: 14 }}>Subscription Expiring Soon</span>
              <span style={{ color: "#6B7280", fontSize: 13 }}>
                Your access to <strong>{nearestExpiry.productTitle}</strong> expires on{" "}
                {new Date(nearestExpiry.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
              </span>
            </div>
          </div>
        ) : null}

        {/* ═══════ Current Product Indicator ═══════ */}
        {currentEnrollment && (
          <div className="mb-3">
            <div 
              className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3"
              style={{ background: "#FFF3EB", border: "1px solid #FDDCBB" }}
            >
              <i className="bi bi-journal-bookmark-fill" style={{ color: PRIMARY, fontSize: 16 }} />
              <span className="fw-semibold" style={{ color: "#C9621A", fontSize: 14 }}>
                {currentEnrollment.productTitle}
              </span>
              <span style={{ color: "#9CA3AF", fontSize: 12 }}>
                · Expires {new Date(currentEnrollment.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* ═══════ Stats Cards Row ═══════ */}
        <div className="row g-3 mb-4 stagger-children">
          <div className="col-6 col-lg-3">
            <StatCard icon="bi-check-circle-fill" label="Tests Completed" value={stats.completedCount} accent="#059669" />
          </div>
          <div className="col-6 col-lg-3">
            <StatCard icon="bi-play-circle-fill" label="In Progress" value={filteredInProgress.length} accent="#D97706" />
          </div>
          <div className="col-6 col-lg-3">
            <StatCard icon="bi-graph-up" label="Average Score" value={`${stats.avg}%`} accent={TEAL} />
          </div>
          <div className="col-6 col-lg-3">
            <StatCard icon="bi-trophy-fill" label="Best Score" value={`${stats.best}%`} accent={PRIMARY} sub={stats.passRate > 0 ? `${stats.passRate}% pass rate` : undefined} />
          </div>
        </div>

        {/* ═══════ Two-Column Layout ═══════ */}
        <div className="row g-4">
          {/* ── Left Column: Chart + Table ── */}
          <div className="col-lg-8">
            {/* Score Trend Chart */}
            {filteredSubmitted.length >= 2 && (
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="fw-bold mb-0" style={{ color: "#1A1D23" }}>Score Trend</h6>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>Last {Math.min(filteredSubmitted.length, 10)} attempts</span>
                  </div>
                  <div style={{ height: 180 }}>
                    <Line data={trendData} options={trendOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* Tests in Progress */}
            {filteredInProgress.length > 0 && (
              <div className="card mb-4">
                <div className="card-body p-0">
                  <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <h6 className="fw-bold mb-0" style={{ color: "#1A1D23" }}>
                      <i className="bi bi-play-circle me-2" style={{ color: "#D97706" }} />
                      Tests in Progress
                    </h6>
                    <span className="badge rounded-pill" style={{ background: "#FFF3EB", color: PRIMARY, fontSize: 12, fontWeight: 600 }}>
                      {filteredInProgress.length}
                    </span>
                  </div>
                  {filteredInProgress.map((a, idx) => (
                    <div
                      key={a.id}
                      className="d-flex align-items-center py-3 px-4"
                      style={{ borderBottom: idx < filteredInProgress.length - 1 ? "1px solid #F3F4F6" : undefined }}
                    >
                      <div className="flex-grow-1">
                        <span className="fw-semibold d-block" style={{ color: "#1A1D23", fontSize: 14 }}>{a.examTitle}</span>
                        <small style={{ color: "#9CA3AF" }}>
                          Started {new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </small>
                      </div>
                      <a
                        href={`/exams/${a.examSlug}`}
                        className="btn btn-sm fw-semibold"
                        style={{ background: "#FFF3EB", color: PRIMARY, borderRadius: 8 }}
                      >
                        Resume
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Test Results */}
            <div className="card" id="history">
              <div className="card-body p-0">
                <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <h6 className="fw-bold mb-0" style={{ color: "#1A1D23" }}>
                    Recent Test Results 
                    <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({currentEnrollment?.productTitle || "All Exams"})</span>
                  </h6>
                  <button
                    className="btn btn-sm fw-medium px-3"
                    style={{ color: "#3D4149", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 13 }}
                    onClick={refreshAttempts}
                    disabled={busy}
                  >
                    <i className={`bi ${busy ? "bi-arrow-repeat" : "bi-arrow-clockwise"} me-1`} />
                    {busy ? "Loading…" : "Refresh"}
                  </button>
                </div>

                {filteredSubmitted.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3" style={{ width: 56, height: 56, background: "#F3F4F6" }}>
                      <i className="bi bi-clipboard2" style={{ fontSize: 24, color: "#D1D5DB" }} />
                    </div>
                    <p style={{ color: "#6B7280", fontSize: 14 }} className="mb-1">
                      No completed tests for <strong>{currentEnrollment?.productTitle || "this exam"}</strong> yet.
                    </p>
                    <a href={productExams.length ? `/exams/${productExams[0].slug}` : "/me/exams"} className="fw-semibold text-decoration-none" style={{ color: PRIMARY, fontSize: 14 }}>
                      Start a practice exam
                    </a>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th className="ps-4">Exam</th>
                          <th>Date</th>
                          <th>Score</th>
                          <th className="text-end pe-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmitted.slice(0, 10).map((a) => {
                          const scorePct = pct(a.score, a.totalQuestions);
                          const isPass = scorePct >= 65;
                          return (
                            <tr key={a.id}>
                              <td className="ps-4">
                                <span className="fw-medium" style={{ color: "#1A1D23" }}>{a.examTitle}</span>
                              </td>
                              <td style={{ color: "#6B7280" }}>{new Date(a.submittedAt ?? a.startedAt).toLocaleDateString()}</td>
                              <td>
                                <span
                                  className="badge rounded-pill px-3 py-2 text-white"
                                  style={{ background: isPass ? "#059669" : "#DC2626", fontSize: 12 }}
                                >
                                  {scorePct}% ({a.score}/{a.totalQuestions})
                                </span>
                              </td>
                              <td className="text-end pe-4">
                                <a
                                  href={`/attempts/${a.id}`}
                                  className="btn btn-sm fw-medium"
                                  style={{ color: TEAL, border: `1px solid ${TEAL}33`, borderRadius: 8, fontSize: 13 }}
                                >
                                  <i className="bi bi-eye me-1" />Review
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Quick Actions + Subscriptions ── */}
          <div className="col-lg-4">
            {/* Quick Actions */}
            <div className="card mb-4">
              <div className="card-body p-3">
                <h6 className="fw-bold mb-3 px-2" style={{ color: "#1A1D23", fontSize: 14 }}>Quick Actions</h6>
                <QuickAction icon="bi-play-circle-fill" title="Take a Test" href="/me/exams" color={PRIMARY} />
                <QuickAction icon="bi-graph-up" title="View Performance" href="/me/performance" color="#059669" />
                <QuickAction icon="bi-person-circle" title="Manage Account" href="/me/account" color="#6B7280" />
                <QuickAction icon="bi-grid" title="Browse Exams" href="/#catalog" color={TEAL} />
              </div>
            </div>

            {/* Actual Exam Date Countdown */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0" style={{ color: "#1A1D23", fontSize: 14 }}>Actual Exam Date</h6>
                  <i className="bi bi-calendar-event" style={{ color: PRIMARY }} />
                </div>
                {examGoal && examGoalDays !== null ? (
                  <div className="rounded-3 p-3 mb-3" style={{ background: examGoalDays <= 14 ? "#FFF3EB" : "#E6F4F6", border: `1px solid ${examGoalDays <= 14 ? "#FDDCBB" : "#BFE5EA"}` }}>
                    <div className="fw-bold" style={{ fontSize: 30, color: examGoalDays <= 14 ? PRIMARY : TEAL, lineHeight: 1 }}>
                      {examGoalDays}
                    </div>
                    <div className="fw-semibold mt-1" style={{ fontSize: 13, color: "#1A1D23" }}>
                      day{examGoalDays === 1 ? "" : "s"} remaining
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      {examGoal.certificationLabel || "Target exam"} · {new Date(`${examGoal.examDate}T00:00:00`).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#6B7280" }}>Set your real exam date to show a countdown here.</p>
                )}
                <div className="d-grid gap-2">
                  <input
                    className="form-control form-control-sm"
                    type="date"
                    value={goalDateInput}
                    onChange={(event) => setGoalDateInput(event.target.value)}
                    disabled={goalBusy}
                  />
                  <input
                    className="form-control form-control-sm"
                    value={goalLabelInput}
                    onChange={(event) => setGoalLabelInput(event.target.value)}
                    placeholder="Certification label, e.g. PMP"
                    disabled={goalBusy}
                  />
                  <button
                    className="btn btn-sm fw-semibold"
                    style={{ background: TEAL, color: "#fff", borderRadius: 8 }}
                    onClick={saveExamGoal}
                    disabled={goalBusy}
                  >
                    {goalBusy ? "Saving..." : "Save exam date"}
                  </button>
                </div>
                {goalMessage && <p className="small mb-0 mt-2" style={{ color: "#6B7280" }}>{goalMessage}</p>}
              </div>
            </div>

            {/* Latest Score */}
            {stats.latest && (
              <div className="card mb-4">
                <div className="card-body">
                  <h6 className="fw-bold mb-3" style={{ color: "#1A1D23", fontSize: 14 }}>Latest Score</h6>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{stats.latest.examTitle}</span>
                    <span className="fw-bold" style={{ fontSize: 18, color: pct(stats.latest.score, stats.latest.totalQuestions) >= 65 ? "#059669" : "#DC2626" }}>
                      {pct(stats.latest.score, stats.latest.totalQuestions)}%
                    </span>
                  </div>
                  <div className="progress" style={{ height: 6, borderRadius: 3 }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{
                        width: `${pct(stats.latest.score, stats.latest.totalQuestions)}%`,
                        background: pct(stats.latest.score, stats.latest.totalQuestions) >= 65 ? "#059669" : "#DC2626",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-end">
                    <a href={`/attempts/${stats.latest.id}`} className="text-decoration-none fw-medium" style={{ fontSize: 12, color: TEAL }}>
                      Review attempt <i className="bi bi-arrow-right" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Subscriptions */}
            {activeEnrollments.length > 0 && (
              <div className="card">
                <div className="card-body p-3">
                  <h6 className="fw-bold mb-3 px-2" style={{ color: "#1A1D23", fontSize: 14 }}>My Subscriptions</h6>
                  {activeEnrollments.map((e) => {
                    const days = daysUntil(e.expiresAt);
                    const urgent = days <= 14;
                    return (
                      <div key={e.id} className="d-flex align-items-start gap-2 px-2 py-2 mb-1" style={{ overflow: "hidden" }}>
                        <div
                          className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                          style={{ width: 28, height: 28, background: urgent ? "#FEF2F2" : "#ECFDF5" }}
                        >
                          <i className={`bi ${urgent ? "bi-exclamation-triangle" : "bi-bookmark-check-fill"}`} style={{ color: urgent ? "#DC2626" : "#059669", fontSize: 12 }} />
                        </div>
                        <div className="flex-grow-1 min-w-0" style={{ overflow: "hidden" }}>
                          <div 
                            className="fw-semibold text-truncate" 
                            style={{ fontSize: 13, color: "#1A1D23", lineHeight: 1.4 }}
                            title={e.productTitle}
                          >
                            {e.productTitle}
                          </div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                            {new Date(e.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · <span style={{ color: urgent ? "#DC2626" : "#059669", fontWeight: 500 }}>{days} days left</span>
                          </div>
                        </div>
                        <span
                          className="badge rounded-pill flex-shrink-0"
                          style={{
                            background: urgent ? "#FEF2F2" : "#ECFDF5",
                            color: urgent ? "#DC2626" : "#059669",
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "4px 8px",
                          }}
                        >
                          {days}d
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
