"use client";

import { useEffect, useState } from "react";
import { browserApiFetch, apiUrl } from "../../../lib/api";
import { AdminModal } from "../../admin/components/AdminModal";

type PreviewQuestion = {
  id: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation: string;
  questionType: "single_choice" | "multiple_response" | "true_false";
  imageUrl?: string | null;
};

interface PreviewModalProps {
  examId: number | null;
  examTitle: string;
  open: boolean;
  onClose: () => void;
}

export function PreviewModal({ examId, examTitle, open, onClose }: PreviewModalProps) {
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && examId) {
      setLoading(true);
      setCurrentIdx(0);
      setAnswers({});
      setShowAnswer(false);
      browserApiFetch<PreviewQuestion[]>(`/api/admin/exams/${examId}/preview-questions`)
        .then((data) => setQuestions(data))
        .finally(() => setLoading(false));
    }
  }, [open, examId]);

  if (!open || !examId) return null;

  const q = questions[currentIdx];
  const options = q?.questionType === "true_false"
    ? [{ key: "A", text: q.optionA }, { key: "B", text: q.optionB }]
    : q ? [
        { key: "A", text: q.optionA },
        { key: "B", text: q.optionB },
        { key: "C", text: q.optionC },
        { key: "D", text: q.optionD },
        ...(q.optionE ? [{ key: "E", text: q.optionE }] : [])
      ] : [];

  const selected = q ? (answers[q.id] ?? "") : "";
  const correctKeys = q ? q.correctAnswer.split(",").map((s) => s.trim()) : [];

  function selectOption(key: string) {
    if (showAnswer || !q) return;
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

  // Navigator pagination
  const navigatorPageSize = 25;
  const navigatorPageCount = Math.ceil(questions.length / navigatorPageSize);
  const currentNavigatorPage = Math.floor(currentIdx / navigatorPageSize);

  return (
    <AdminModal
      open={open}
      title={
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-warning text-dark">PREVIEW</span>
          <span>{examTitle || `Exam #${examId}`}</span>
          {questions.length > 0 && <span className="text-muted small">({questions.length} questions)</span>}
        </div>
      }
      onClose={onClose}
      size="xl"
      footer={
        <div className="d-flex justify-content-between align-items-center w-100">
          <button 
            className="btn btn-outline-secondary btn-sm" 
            disabled={currentIdx === 0} 
            onClick={() => goTo(currentIdx - 1)}
          >
            <i className="bi bi-arrow-left me-1"></i>Prev
          </button>
          
          <div className="d-flex align-items-center gap-3">
            <span className="small text-muted">Question {currentIdx + 1} of {questions.length}</span>
            <button 
              className="btn btn-info text-white btn-sm px-3" 
              onClick={() => setShowAnswer(!showAnswer)}
            >
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </button>
          </div>
          
          <button 
            className="btn btn-outline-secondary btn-sm" 
            disabled={currentIdx >= questions.length - 1} 
            onClick={() => goTo(currentIdx + 1)}
          >
            Next<i className="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="text-muted mt-2">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-exclamation-circle fs-1 d-block mb-2"></i>
          No published questions found for this exam.
        </div>
      ) : !q ? (
        <div className="text-center py-5 text-muted">Question not found</div>
      ) : (
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {/* Progress */}
          <div className="mb-3">
            <div className="progress" style={{ height: 6 }}>
              <div 
                className="progress-bar bg-primary" 
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} 
              />
            </div>
          </div>

          {/* Question */}
          <div className="card border-0 bg-light mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <span className="badge bg-secondary">
                  {q.questionType === "single_choice" ? "Single Choice" : q.questionType === "multiple_response" ? "Multiple Response" : "True / False"}
                </span>
              </div>
              
              <p className="fw-semibold mb-3" style={{ fontSize: "1.1rem" }}>{q.prompt}</p>

              {q.imageUrl && (
                <div className="mb-3 text-center">
                  <img 
                    src={q.imageUrl.startsWith("http") ? q.imageUrl : apiUrl + q.imageUrl}
                    alt="Question" 
                    style={{ maxWidth: "100%", maxHeight: 250, borderRadius: 8 }} 
                  />
                </div>
              )}

              <div className="d-flex flex-column gap-2">
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
                        padding: "12px 16px", 
                        borderRadius: 8, 
                        border: `2px solid ${border}`, 
                        background: bg, 
                        color: textColor,
                        cursor: showAnswer ? "default" : "pointer"
                      }}
                    >
                      <strong className="me-2">{opt.key}.</strong>{opt.text}
                    </div>
                  );
                })}
              </div>

              {showAnswer && q.explanation && (
                <div className="alert alert-info mt-3 mb-0">
                  <strong><i className="bi bi-info-circle me-2"></i>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          </div>

          {/* Navigator */}
          <div className="card border-0">
            <div className="card-body p-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-semibold">Question Navigator</span>
                {navigatorPageCount > 1 && (
                  <div className="btn-group btn-group-sm">
                    <button 
                      className="btn btn-outline-secondary" 
                      disabled={currentNavigatorPage === 0}
                      onClick={() => goTo((currentNavigatorPage - 1) * navigatorPageSize)}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="btn btn-light disabled small">
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
              
              <div className="d-flex flex-wrap gap-1">
                {questions
                  .slice(currentNavigatorPage * navigatorPageSize, (currentNavigatorPage + 1) * navigatorPageSize)
                  .map((qItem, idx) => {
                    const actualIdx = currentNavigatorPage * navigatorPageSize + idx;
                    return (
                      <button
                        key={actualIdx}
                        className={`btn btn-sm ${actualIdx === currentIdx ? "btn-primary" : answers[qItem.id] ? "btn-outline-success" : "btn-outline-secondary"}`}
                        style={{ width: 36, height: 36, padding: 0, fontSize: "0.8rem" }}
                        onClick={() => goTo(actualIdx)}
                      >
                        {actualIdx + 1}
                      </button>
                    );
                  })}
              </div>
              
              <div className="d-flex gap-3 mt-2 small text-muted">
                <span><span className="badge bg-primary">&nbsp;</span> Current</span>
                <span><span className="badge border text-success border-success">&nbsp;</span> Answered</span>
                <span><span className="badge border text-secondary border-secondary">&nbsp;</span> Not visited</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
