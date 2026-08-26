"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { browserApiFetch } from "../../../../lib/api";

type PreviewQuestion = {
  id: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  questionType: "single_choice" | "multiple_response" | "true_false";
  imageUrl?: string | null;
};

export default function AdminPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const qs = await browserApiFetch<PreviewQuestion[]>(`/api/admin/exams/${examId}/preview-questions`);
        setQuestions(qs);
      } catch {
        setQuestions([]);
      }
      try {
        const exams = await browserApiFetch<{ id: number; title: string }[]>("/api/admin/exams");
        const exam = exams.find((e) => e.id === Number(examId));
        if (exam) setExamTitle(exam.title);
      } catch { /* ignore */ }
      setLoading(false);
    }
    void load();
  }, [examId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#f8f9fa" }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#f8f9fa" }}>
        <div className="card border-0 shadow-sm p-5 text-center">
          <i className="bi bi-exclamation-circle fs-1 text-muted mb-3"></i>
          <h4>No published questions found for this exam.</h4>
          <button className="btn btn-outline-secondary mt-3" onClick={() => router.back()}>← Back to Admin</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const options = q.questionType === "true_false"
    ? [{ key: "A", text: q.optionA }, { key: "B", text: q.optionB }]
    : [{ key: "A", text: q.optionA }, { key: "B", text: q.optionB }, { key: "C", text: q.optionC }, { key: "D", text: q.optionD }];

  const selected = answers[q.id] ?? "";
  const correctKeys = q.correctAnswer.split(",").map((s) => s.trim());

  function selectOption(key: string) {
    if (showAnswer) return;
    if (q.questionType === "multiple_response") {
      const current = selected ? selected.split(",") : [];
      const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      setAnswers({ ...answers, [q.id]: updated.sort().join(",") });
    } else {
      setAnswers({ ...answers, [q.id]: key });
    }
  }

  function goTo(idx: number) {
    setShowAnswer(false);
    setCurrentIdx(idx);
  }

  // Group questions into pages of 25 for the navigator
  const navigatorPageSize = 25;
  const navigatorPageCount = Math.ceil(questions.length / navigatorPageSize);
  const currentNavigatorPage = Math.floor(currentIdx / navigatorPageSize);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Clean Header without sidebar */}
      <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center sticky-top">
        <div className="d-flex align-items-center">
          <span className="badge bg-warning text-dark me-3">ADMIN PREVIEW</span>
          <strong className="fs-5">{examTitle || `Exam #${examId}`}</strong>
          <span className="text-muted ms-3">({questions.length} questions)</span>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => window.close()}>
          <i className="bi bi-x-lg me-1"></i>Close Preview
        </button>
      </div>

      <div className="container py-4" style={{ maxWidth: 900 }}>
        {/* Progress */}
        <div className="mb-3 d-flex justify-content-between align-items-center">
          <span className="fw-semibold">Question {currentIdx + 1} of {questions.length}</span>
          <div className="progress flex-grow-1 mx-3" style={{ height: 8 }}>
            <div 
              className="progress-bar bg-primary" 
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} 
            />
          </div>
          <span className="badge bg-secondary">
            {q.questionType === "single_choice" ? "SC" : q.questionType === "multiple_response" ? "MR" : "T/F"}
          </span>
        </div>

        {/* Question card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <p className="fw-semibold mb-3" style={{ fontSize: "1.15rem", lineHeight: 1.5 }}>{q.prompt}</p>

            {q.imageUrl && (
              <div className="mb-3 text-center">
                <img 
                  src={q.imageUrl} 
                  alt="Question image" 
                  style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8, border: "1px solid #dee2e6" }} 
                />
              </div>
            )}

            <div className="d-flex flex-column gap-2 mt-4">
              {options.map((opt) => {
                const isSelected = selected.split(",").includes(opt.key);
                const isCorrect = correctKeys.includes(opt.key);
                let bg = "white";
                let border = isSelected ? "#0d6efd" : "#dee2e6";
                let textColor = "inherit";
                if (showAnswer) {
                  if (isCorrect) { bg = "#d1e7dd"; border = "#198754"; textColor = "#0f5132"; }
                  else if (isSelected && !isCorrect) { bg = "#f8d7da"; border = "#dc3545"; textColor = "#842029"; }
                }
                return (
                  <div
                    key={opt.key}
                    onClick={() => selectOption(opt.key)}
                    style={{ 
                      padding: "14px 18px", 
                      borderRadius: 8, 
                      border: `2px solid ${border}`, 
                      background: bg, 
                      color: textColor,
                      cursor: showAnswer ? "default" : "pointer", 
                      transition: "all 0.15s",
                      fontSize: "1rem"
                    }}
                  >
                    <strong className="me-2">{opt.key}.</strong>{opt.text}
                  </div>
                );
              })}
            </div>

            {showAnswer && q.explanation && (
              <div className="alert alert-info mt-4 mb-0">
                <strong><i className="bi bi-info-circle me-2"></i>Explanation:</strong> {q.explanation}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <button 
            className="btn btn-outline-secondary" 
            disabled={currentIdx === 0} 
            onClick={() => goTo(currentIdx - 1)}
          >
            <i className="bi bi-arrow-left me-1"></i>Previous
          </button>
          
          <button 
            className="btn btn-info text-white px-4" 
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? (
              <><i className="bi bi-eye-slash me-1"></i>Hide Answer</>
            ) : (
              <><i className="bi bi-eye me-1"></i>Show Answer</>
            )}
          </button>
          
          <button 
            className="btn btn-outline-secondary" 
            disabled={currentIdx === questions.length - 1} 
            onClick={() => goTo(currentIdx + 1)}
          >
            Next<i className="bi bi-arrow-right ms-1"></i>
          </button>
        </div>

        {/* Question navigator - paginated */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="small fw-semibold mb-0">Question Navigator</p>
              {navigatorPageCount > 1 && (
                <div className="btn-group btn-group-sm">
                  <button 
                    className="btn btn-outline-secondary" 
                    disabled={currentNavigatorPage === 0}
                    onClick={() => goTo((currentNavigatorPage - 1) * navigatorPageSize)}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <span className="btn btn-light disabled">
                    {currentNavigatorPage * navigatorPageSize + 1}-{Math.min((currentNavigatorPage + 1) * navigatorPageSize, questions.length)}
                  </span>
                  <button 
                    className="btn btn-outline-secondary" 
                    disabled={currentNavigatorPage >= navigatorPageCount - 1}
                    onClick={() => goTo((currentNavigatorPage + 1) * navigatorPageSize)}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
            
            <div 
              className="d-flex flex-wrap gap-1" 
              style={{ 
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
                gap: "6px"
              }}
            >
              {questions
                .slice(currentNavigatorPage * navigatorPageSize, (currentNavigatorPage + 1) * navigatorPageSize)
                .map((qItem, idx) => {
                  const actualIdx = currentNavigatorPage * navigatorPageSize + idx;
                  return (
                    <button
                      key={actualIdx}
                      className={`btn btn-sm ${actualIdx === currentIdx ? "btn-primary" : answers[qItem.id] ? "btn-outline-success" : "btn-outline-secondary"}`}
                      style={{ 
                        width: 40, 
                        height: 40,
                        padding: 0,
                        fontSize: "0.875rem",
                        fontWeight: 600
                      }}
                      onClick={() => goTo(actualIdx)}
                    >
                      {actualIdx + 1}
                    </button>
                  );
                })}
            </div>
            
            {/* Legend */}
            <div className="d-flex gap-3 mt-3 pt-3 border-top small text-muted">
              <span><span className="badge bg-primary">&nbsp;</span> Current</span>
              <span><span className="badge border text-success border-success">&nbsp;</span> Answered</span>
              <span><span className="badge border text-secondary border-secondary">&nbsp;</span> Not visited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
