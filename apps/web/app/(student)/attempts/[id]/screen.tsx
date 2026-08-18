"use client";

import { useState } from "react";
import type { AttemptResultDetail } from "../../../../lib/api";

type Props = {
  result: AttemptResultDetail;
};

const PRIMARY = "#E8792B";
const TEAL = "#2B7A87";
const INK = "#1A1D23";
const MUTED = "#6B7280";
const SUCCESS = "#059669";
const DANGER = "#DC2626";

export function AttemptReviewScreen({ result }: Props) {
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const displayQuestions = showOnlyIncorrect
    ? result.questions.filter((q) => !q.isCorrect)
    : result.questions;

  const correctCount = result.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = result.questions.length - correctCount;
  const scorePct = result.totalQuestions ? Math.round((result.score / result.totalQuestions) * 100) : 0;
  const shareText = `I scored ${scorePct}% on ${result.examTitle} with PM Exam Pro.`;
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://pmadvance.com";
  const shareLinks = [
    {
      label: "X",
      icon: "bi-twitter-x",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "Facebook",
      icon: "bi-facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    },
    {
      label: "LinkedIn",
      icon: "bi-linkedin",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "WhatsApp",
      icon: "bi-whatsapp",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
  ];

  const stats = [
    { icon: "bi-bullseye", label: "Score", value: `${result.score}/${result.totalQuestions}`, sub: `${scorePct}%`, accent: PRIMARY },
    { icon: "bi-flag", label: "Pass Threshold", value: `${result.passThreshold}%`, accent: TEAL },
    { icon: result.passed ? "bi-check-circle" : "bi-x-circle", label: "Result", value: result.passed ? "PASSED" : "FAILED", accent: result.passed ? SUCCESS : DANGER },
    { icon: "bi-bar-chart", label: "Correct / Incorrect", value: `${correctCount} / ${incorrectCount}`, accent: TEAL },
  ];

  return (
    <div className="container py-4 animate-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
        <div>
          <p className="text-uppercase fw-semibold mb-2" style={{ fontSize: 12, letterSpacing: "0.18em", color: TEAL }}>
            Attempt review
          </p>
          <h1 className="fw-bold mb-0" style={{ fontSize: "1.875rem", color: INK }}>
            {result.examTitle}
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

      {/* Stat cards */}
      <div className="row g-3 mb-4 stagger-children">
        {stats.map((s, i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="card border-0 h-100" style={{ borderTop: `3px solid ${s.accent}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="card-body d-flex align-items-start gap-3 p-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 42, height: 42, background: `${s.accent}14` }}
                >
                  <i className={`bi ${s.icon}`} style={{ color: s.accent, fontSize: 18 }} />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 22, color: s.accent, lineHeight: 1.2 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED }}>{s.label}</div>
                  {s.sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{s.sub}</div>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 mb-4" style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="card-body d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <div className="fw-semibold" style={{ color: INK, fontSize: 14 }}>Share your result</div>
            <div style={{ color: MUTED, fontSize: 13 }}>{shareText}</div>
          </div>
          <div className="position-relative">
            <button
              className="btn btn-sm fw-semibold"
              type="button"
              onClick={() => setShowShareOptions((current) => !current)}
              aria-expanded={showShareOptions}
              style={{ background: PRIMARY, color: "#fff", borderRadius: 8 }}
            >
              <i className="bi bi-share me-1" />
              Share
            </button>
            {showShareOptions && (
              <div
                className="position-absolute end-0 mt-2 bg-white border shadow-sm"
                style={{ borderRadius: 8, minWidth: 180, zIndex: 10, overflow: "hidden" }}
              >
                {shareLinks.map((link) => (
                  <a
                    key={link.label}
                    className="d-flex align-items-center gap-2 text-decoration-none"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: INK, fontSize: 13, padding: "10px 12px" }}
                  >
                    <i className={`bi ${link.icon}`} style={{ color: TEAL }} />
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="form-check form-switch mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            id="filterIncorrect"
            checked={showOnlyIncorrect}
            onChange={(e) => setShowOnlyIncorrect(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label className="form-check-label fw-medium" htmlFor="filterIncorrect" style={{ fontSize: 13, color: INK, cursor: "pointer" }}>
            Show only incorrect ({incorrectCount})
          </label>
        </div>
      </div>

      {/* Questions */}
      <div className="d-grid gap-3">
        {displayQuestions.map((q, index) => {
          const questionNum = showOnlyIncorrect
            ? result.questions.findIndex((x) => x.id === q.id) + 1
            : index + 1;
          const correctParts = (q.correctAnswer ?? "").split(",").map(s => s.trim());
          const selectedParts = (q.selectedAnswer ?? "").split(",").map(s => s.trim()).filter(Boolean);
          const options = q.questionType === "true_false" ? (["A", "B"] as const) : (["A", "B", "C", "D", "E"] as const);
          const borderColor = q.isCorrect ? SUCCESS : DANGER;

          return (
            <div
              key={q.id}
              className="card border-0"
              style={{ borderLeft: `4px solid ${borderColor}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span
                    className="px-2 py-1 rounded-2 fw-semibold"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      background: q.isCorrect ? "#ECFDF5" : "#FEF2F2",
                      color: q.isCorrect ? SUCCESS : DANGER,
                    }}
                  >
                    {q.isCorrect ? "CORRECT" : "INCORRECT"}
                  </span>
                  <span className="text-uppercase fw-semibold" style={{ fontSize: 11, letterSpacing: "0.12em", color: MUTED }}>
                    Question {questionNum}
                    {q.questionType === "multiple_response" ? " · Multiple Response" : q.questionType === "true_false" ? " · True/False" : ""}
                  </span>
                </div>

                <p className="fw-semibold mb-3" style={{ fontSize: 15, color: INK, lineHeight: 1.5 }}>
                  {q.prompt}
                </p>

                <div className="d-grid gap-2">
                  {options.map((letter) => {
                    const optionKey = `option${letter}` as "optionA" | "optionB" | "optionC" | "optionD" | "optionE";
                    if (!q[optionKey]) return null;
                    const isCorrectAnswer = correctParts.includes(letter);
                    const isSelected = selectedParts.includes(letter);
                    let bg = "#F9FAFB";
                    let border = "#E5E7EB";
                    if (isCorrectAnswer) { bg = "#ECFDF5"; border = `${SUCCESS}40`; }
                    if (isSelected && !isCorrectAnswer) { bg = "#FEF2F2"; border = `${DANGER}40`; }
                    return (
                      <div
                        key={letter}
                        className="d-flex align-items-center gap-2 rounded-3"
                        style={{ padding: "10px 14px", background: bg, border: `1px solid ${border}` }}
                      >
                        <strong className="flex-shrink-0" style={{ width: 22, color: INK, fontSize: 13 }}>{letter}.</strong>
                        <span style={{ fontSize: 14, color: INK, flex: 1 }}>{q[optionKey]}</span>
                        {isSelected && (
                          <span className="flex-shrink-0 fw-medium" style={{ fontSize: 11, color: isCorrectAnswer ? SUCCESS : DANGER }}>
                            <i className={`bi ${isCorrectAnswer ? "bi-check-circle-fill" : "bi-x-circle-fill"} me-1`} />
                            Your answer
                          </span>
                        )}
                        {isCorrectAnswer && !isSelected && (
                          <span className="flex-shrink-0 fw-medium" style={{ fontSize: 11, color: SUCCESS }}>
                            <i className="bi bi-check-circle-fill me-1" />
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="rounded-3 mt-3 p-3" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
                    <p className="text-uppercase fw-semibold mb-1" style={{ fontSize: 11, letterSpacing: "0.12em", color: TEAL }}>
                      <i className="bi bi-lightbulb me-1" />
                      Explanation
                    </p>
                    <p className="mb-0" style={{ fontSize: 14, color: "#3D4149", lineHeight: 1.6 }}>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
