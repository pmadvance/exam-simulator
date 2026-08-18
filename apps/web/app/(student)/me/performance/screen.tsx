"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { SkeletonPerformance } from "../../../../app/components/Skeleton";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { browserApiFetch } from "../../../../lib/api";
import { useExam } from "../../ExamContext";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const PRIMARY = "#E8792B";
const TEAL = "#2B7A87";
const SUCCESS = "#059669";
const DANGER = "#DC2626";
const WARNING = "#D97706";

type AttemptSummary = {
  id: string;
  examSlug: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  scorePercent: number;
  passed: boolean;
  passThreshold: number;
  trainingMode: boolean;
  startedAt: string;
  submittedAt: string;
};

type DomainStat = {
  domain: string;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
};

type PerformanceData = {
  attempts: AttemptSummary[];
  ecoDomains: DomainStat[];
  performanceDomains: DomainStat[];
};

type TabKey = "overall" | "past-results" | "performance-domain" | "eco-domain" | "trends";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overall", label: "Overall", icon: "bi-graph-up" },
  { key: "past-results", label: "Past Results", icon: "bi-table" },
  { key: "performance-domain", label: "Project Performance Domain", icon: "bi-pie-chart" },
  { key: "eco-domain", label: "ECO Domain", icon: "bi-diagram-3" },
  { key: "trends", label: "Trends", icon: "bi-activity" },
];

function ScoreBadge({ pct, passed }: { pct: number; passed: boolean }) {
  return (
    <span
      className="badge"
      style={{
        background: passed ? SUCCESS : DANGER,
        fontSize: 13,
        fontWeight: 600,
        minWidth: 48,
      }}
    >
      {pct}%
    </span>
  );
}

function DomainTable({ domains, label }: { domains: DomainStat[]; label: string }) {
  if (domains.length === 0) {
    return <p className="text-muted">No domain data available. Complete some exams to see your {label} breakdown.</p>;
  }
  const overall = domains.reduce((a, d) => ({ t: a.t + d.totalQuestions, c: a.c + d.correctAnswers }), { t: 0, c: 0 });
  const overallAvg = overall.t > 0 ? Math.round((overall.c / overall.t) * 100) : 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>{label}</th>
            <th className="text-center">Avg Score %</th>
            <th className="text-center">Questions Attempted</th>
            <th className="text-center">Correct</th>
            <th className="text-center">Ranking</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => {
            let ranking = "Needs Work";
            let rankColor = DANGER;
            if (d.averageScore >= 80) { ranking = "Strong"; rankColor = SUCCESS; }
            else if (d.averageScore >= 65) { ranking = "Average"; rankColor = WARNING; }

            return (
              <tr key={d.domain}>
                <td className="fw-semibold">{d.domain}</td>
                <td className="text-center">
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <div style={{ width: 60, height: 6, background: "#e9ecef", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${d.averageScore}%`, height: "100%", background: rankColor, borderRadius: 3 }} />
                    </div>
                    <span style={{ minWidth: 36 }}>{d.averageScore}%</span>
                  </div>
                </td>
                <td className="text-center">{d.totalQuestions}</td>
                <td className="text-center">{d.correctAnswers}</td>
                <td className="text-center">
                  <span className="badge" style={{ background: rankColor, fontSize: 11 }}>{ranking}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="table-light">
          <tr className="fw-bold">
            <td>Overall</td>
            <td className="text-center">{overallAvg}%</td>
            <td className="text-center">{overall.t}</td>
            <td className="text-center">{overall.c}</td>
            <td className="text-center">
              <span className="badge" style={{ background: overallAvg >= 80 ? SUCCESS : overallAvg >= 65 ? WARNING : DANGER, fontSize: 11 }}>
                {overallAvg >= 80 ? "Strong" : overallAvg >= 65 ? "Average" : "Needs Work"}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PerformanceScreen() {
  const { selectedExamSlug, currentEnrollment, enrollments } = useExam();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overall");
  const [productExams, setProductExams] = useState<string[]>([]);

  // Load product exams for filtering
  useEffect(() => {
    let cancelled = false;
    
    async function loadProduct() {
      if (!selectedExamSlug) {
        setProductExams([]);
        return;
      }
      
      try {
        const product = await browserApiFetch<{ exams: Array<{ slug: string }> }>(`/api/products/${selectedExamSlug}`);
        if (!cancelled) {
          setProductExams((product.exams ?? []).map((e) => e.slug));
        }
      } catch {
        if (!cancelled) setProductExams([]);
      }
    }
    
    loadProduct();
    return () => { cancelled = true; };
  }, [selectedExamSlug]);

  // Load performance data
  useEffect(() => {
    browserApiFetch<PerformanceData>("/api/performance")
      .then(setData)
      .catch(() => setData({ attempts: [], ecoDomains: [], performanceDomains: [] }))
      .finally(() => setLoading(false));
  }, []);

  // Filter data by selected product's exams
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (productExams.length === 0) return data; // Show all if no product selected
    
    return {
      attempts: data.attempts.filter((a) => productExams.includes(a.examSlug)),
      ecoDomains: data.ecoDomains, // Domain stats are aggregated, keep as-is
      performanceDomains: data.performanceDomains,
    };
  }, [data, productExams]);

  const stats = useMemo(() => {
    if (!filteredData || filteredData.attempts.length === 0) return null;
    const examOnly = filteredData.attempts.filter((a) => !a.trainingMode);
    const avg = examOnly.length
      ? Math.round(examOnly.reduce((s, a) => s + a.scorePercent, 0) / examOnly.length)
      : 0;
    const best = examOnly.length ? Math.max(...examOnly.map((a) => a.scorePercent)) : 0;
    const passRate = examOnly.length
      ? Math.round((examOnly.filter((a) => a.passed).length / examOnly.length) * 100)
      : 0;
    return { avg, best, passRate, totalAttempts: examOnly.length };
  }, [filteredData]);

  if (loading) {
    return <SkeletonPerformance />;
  }

  if (!filteredData || filteredData.attempts.length === 0) {
    return (
      <main className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h1 className="fw-bold" style={{ color: "#1A1D23", fontSize: "1.75rem", letterSpacing: "-0.02em" }}>Performance Analytics</h1>
          <Link href="/me/dashboard" className="btn btn-sm fw-medium px-3" style={{ color: "#3D4149", border: "1px solid #D1D5DB", borderRadius: 8 }}>
            <i className="bi bi-arrow-left me-1" />Dashboard
          </Link>
        </div>
        <div className="card text-center py-5">
          <div className="d-inline-flex align-items-center justify-content-center rounded-3 mx-auto mb-3" style={{ width: 56, height: 56, background: "#F3F4F6" }}>
            <i className="bi bi-bar-chart-line" style={{ fontSize: 24, color: "#D1D5DB" }} />
          </div>
          <p style={{ color: "#6B7280", fontSize: 14 }} className="mb-1">
            No completed attempts for <strong>{currentEnrollment?.productTitle || "this exam"}</strong> yet.
          </p>
          <Link href="/me/exams" className="fw-semibold text-decoration-none" style={{ color: PRIMARY, fontSize: 14 }}>Take your first practice exam to start tracking</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-lg py-4 animate-in">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="fw-bold" style={{ color: "#1A1D23", fontSize: "1.75rem", letterSpacing: "-0.02em" }}>Performance Analytics</h1>
        <Link href="/me/dashboard" className="btn btn-sm fw-medium px-3" style={{ color: "#3D4149", border: "1px solid #D1D5DB", borderRadius: 8 }}>
          <i className="bi bi-arrow-left me-1" />Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      {currentEnrollment && (
        <div className="mb-3">
          <div 
            className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3"
            style={{ background: "#FFF3EB", border: "1px solid #FDDCBB" }}
          >
            <i className="bi bi-graph-up" style={{ color: PRIMARY, fontSize: 16 }} />
            <span className="fw-semibold" style={{ color: "#C9621A", fontSize: 14 }}>
              {currentEnrollment.productTitle}
            </span>
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>
              · Expires {new Date(currentEnrollment.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {stats && (
        <div className="row g-3 mb-4 stagger-children">
          <div className="col-6 col-lg-3">
            <div className="card h-100" style={{ borderTop: `3px solid ${TEAL}` }}>
              <div className="card-body d-flex align-items-start gap-3 p-3">
                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42, background: `${TEAL}14` }}>
                  <i className="bi bi-graph-up" style={{ color: TEAL, fontSize: 18 }} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1A1D23", lineHeight: 1.1 }}>{stats.avg}%</div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Average Score</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card h-100" style={{ borderTop: `3px solid ${SUCCESS}` }}>
              <div className="card-body d-flex align-items-start gap-3 p-3">
                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42, background: `${SUCCESS}14` }}>
                  <i className="bi bi-trophy-fill" style={{ color: SUCCESS, fontSize: 18 }} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1A1D23", lineHeight: 1.1 }}>{stats.best}%</div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Best Score</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card h-100" style={{ borderTop: `3px solid ${stats.passRate >= 65 ? SUCCESS : DANGER}` }}>
              <div className="card-body d-flex align-items-start gap-3 p-3">
                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42, background: `${stats.passRate >= 65 ? SUCCESS : DANGER}14` }}>
                  <i className="bi bi-check-circle-fill" style={{ color: stats.passRate >= 65 ? SUCCESS : DANGER, fontSize: 18 }} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1A1D23", lineHeight: 1.1 }}>{stats.passRate}%</div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Pass Rate</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card h-100" style={{ borderTop: `3px solid ${PRIMARY}` }}>
              <div className="card-body d-flex align-items-start gap-3 p-3">
                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42, background: `${PRIMARY}14` }}>
                  <i className="bi bi-pencil-square" style={{ color: PRIMARY, fontSize: 18 }} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 24, color: "#1A1D23", lineHeight: 1.1 }}>{stats.totalAttempts}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Total Attempts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="d-flex gap-1 px-4 pt-3 pb-0 flex-wrap" style={{ borderBottom: "1px solid #E5E7EB" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className="btn btn-sm px-3 py-2 position-relative"
              style={{
                color: activeTab === tab.key ? PRIMARY : "#6B7280",
                fontWeight: activeTab === tab.key ? 600 : 500,
                fontSize: 13,
                border: "none",
                borderRadius: "8px 8px 0 0",
                background: activeTab === tab.key ? "#FFF3EB" : "transparent",
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tab.icon} me-1`} />
              {tab.label}
              {activeTab === tab.key && (
                <span className="position-absolute bottom-0 start-50 translate-middle-x" style={{ width: "60%", height: 2, background: PRIMARY, borderRadius: 1 }} />
              )}
            </button>
          ))}
        </div>

        <div className="card-body p-4">
          {activeTab === "overall" && <OverallTab data={filteredData} />}
          {activeTab === "past-results" && <PastResultsTab attempts={filteredData.attempts} />}
          {activeTab === "performance-domain" && <DomainTable domains={filteredData.performanceDomains} label="Performance Domain" />}
          {activeTab === "eco-domain" && <DomainTable domains={filteredData.ecoDomains} label="ECO Domain" />}
          {activeTab === "trends" && <TrendsTab data={filteredData} />}
        </div>
      </div>
    </main>
  );
}

/* ── Tab: Overall ─────────────────────────────────────────────── */
function OverallTab({ data }: { data: PerformanceData }) {
  const examAttempts = data.attempts.filter((a) => !a.trainingMode);

  const chartData = {
    labels: examAttempts.map((a, i) => `#${i + 1}`),
    datasets: [
      {
        label: "Score %",
        data: examAttempts.map((a) => a.scorePercent),
        borderColor: PRIMARY,
        backgroundColor: "rgba(232, 121, 43, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: examAttempts.map((a) => (a.passed ? SUCCESS : DANGER)),
      },
      {
        label: "Pass Threshold",
        data: examAttempts.map((a) => a.passThreshold),
        borderColor: "#dee2e6",
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      tooltip: {
        callbacks: {
          title: (_items: Array<{ dataIndex: number }>) => {
            const idx = _items[0]?.dataIndex;
            return idx !== undefined ? examAttempts[idx]?.examTitle : "";
          },
          label: (item: { raw: unknown; dataset: { label?: string } }) =>
            `${item.dataset.label}: ${item.raw}%`,
        },
      },
    },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
    },
  };

  return (
    <div>
      <h5 className="mb-3">Performance Trend</h5>
      <p className="text-muted small mb-3">
        Your score progression across all exam-mode attempts. Green dots = passed, red dots = failed.
      </p>
      {examAttempts.length < 2 ? (
        <p className="text-muted">Complete at least 2 exam-mode attempts to see the trend chart.</p>
      ) : (
        <div style={{ maxHeight: 350 }}>
          <Line data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}

/* ── Tab: Past Results ────────────────────────────────────────── */
function PastResultsTab({ attempts }: { attempts: AttemptSummary[] }) {
  const sorted = [...attempts].reverse();

  return (
    <div>
      <h5 className="mb-3">Past Results</h5>
      <p className="text-muted small mb-3">{sorted.length} completed attempt{sorted.length !== 1 ? "s" : ""}</p>
      <div style={{ overflowX: "auto" }}>
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Exam</th>
              <th className="text-center">Mode</th>
              <th className="text-center">Score</th>
              <th className="text-center">Result</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => (
              <tr key={a.id}>
                <td className="text-muted">{i + 1}</td>
                <td className="fw-semibold">{a.examTitle}</td>
                <td className="text-center">
                  <span className={`badge bg-${a.trainingMode ? "info" : "secondary"}`} style={{ fontSize: 11 }}>
                    {a.trainingMode ? "Training" : "Exam"}
                  </span>
                </td>
                <td className="text-center">
                  {a.score}/{a.totalQuestions} ({a.scorePercent}%)
                </td>
                <td className="text-center">
                  <ScoreBadge pct={a.scorePercent} passed={a.passed} />
                </td>
                <td className="text-nowrap">
                  {new Date(a.submittedAt).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td>
                  <Link href={`/attempts/${a.id}`} className="btn btn-sm fw-medium" style={{ color: TEAL, border: `1px solid ${TEAL}33`, borderRadius: 8, fontSize: 13 }}>
                    <i className="bi bi-eye me-1" />Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Trends ──────────────────────────────────────────────── */
function TrendsTab({ data }: { data: PerformanceData }) {
  const examAttempts = data.attempts.filter((a) => !a.trainingMode);

  // Domain trend chart
  const domainChartData = {
    labels: data.ecoDomains.map((d) => d.domain),
    datasets: [
      {
        label: "Average Score %",
        data: data.ecoDomains.map((d) => d.averageScore),
        backgroundColor: [
          "rgba(232, 121, 43, 0.7)",
          "rgba(25, 135, 84, 0.7)",
          "rgba(255, 193, 7, 0.7)",
          "rgba(220, 53, 69, 0.7)",
          "rgba(108, 117, 125, 0.7)",
        ],
        borderRadius: 6,
      },
    ],
  };

  const domainOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
    },
  };

  // Moving average calculation
  const movingAvg: number[] = [];
  const windowSize = 3;
  for (let i = 0; i < examAttempts.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = examAttempts.slice(start, i + 1);
    movingAvg.push(Math.round(window.reduce((s, a) => s + a.scorePercent, 0) / window.length));
  }

  const trendChartData = {
    labels: examAttempts.map((_, i) => `#${i + 1}`),
    datasets: [
      {
        label: "Score %",
        data: examAttempts.map((a) => a.scorePercent),
        borderColor: "rgba(232, 121, 43, 0.3)",
        pointRadius: 3,
        fill: false,
        tension: 0.1,
      },
      {
        label: `${windowSize}-Attempt Moving Avg`,
        data: movingAvg,
        borderColor: PRIMARY,
        borderWidth: 3,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    plugins: { legend: { position: "top" as const } },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
    },
  };

  // Weak / strong areas
  const allDomains = [...data.performanceDomains, ...data.ecoDomains];
  const strongest = [...allDomains].sort((a, b) => b.averageScore - a.averageScore).slice(0, 3);
  const weakest = [...allDomains].filter((d) => d.averageScore < 65).sort((a, b) => a.averageScore - b.averageScore).slice(0, 3);

  return (
    <div>
      <h5 className="mb-3">Performance Trends</h5>

      {/* Strength / Weakness cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-2" style={{ color: SUCCESS }}><i className="bi bi-arrow-up-circle me-1" />Strongest Areas</h6>
            {strongest.length === 0 ? (
              <p className="text-muted small mb-0">Not enough data yet.</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {strongest.map((d) => (
                  <li key={d.domain} className="d-flex justify-content-between py-1">
                    <span>{d.domain}</span>
                    <span className="fw-semibold" style={{ color: SUCCESS }}>{d.averageScore}%</span>
                  </li>
                ))}
              </ul>
            )}            </div>            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body p-3">
              <h6 className="fw-bold mb-2" style={{ color: DANGER }}><i className="bi bi-arrow-down-circle me-1" />Areas to Improve</h6>
            {weakest.length === 0 ? (
              <p className="text-muted small mb-0">All areas above 65%. Keep it up!</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {weakest.map((d) => (
                  <li key={d.domain} className="d-flex justify-content-between py-1">
                    <span>{d.domain}</span>
                    <span className="fw-semibold" style={{ color: DANGER }}>{d.averageScore}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ECO Domain Bar Chart */}
      {data.ecoDomains.length > 0 && (
        <div className="mb-4">
          <h6 className="mb-2">ECO Domain Scores</h6>
          <div style={{ maxHeight: 280 }}>
            <Bar data={domainChartData} options={domainOptions} />
          </div>
        </div>
      )}

      {/* Moving Average Trend */}
      {examAttempts.length >= 3 && (
        <div>
          <h6 className="mb-2">Score Trend (Moving Average)</h6>
          <p className="text-muted small">Smoothed trend line showing your improvement over time.</p>
          <div style={{ maxHeight: 280 }}>
            <Line data={trendChartData} options={trendOptions} />
          </div>
        </div>
      )}
    </div>
  );
}
