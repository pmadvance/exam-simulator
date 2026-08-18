"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { browserApiFetch, type AttemptResult, type AttemptState, type TrialQuestion } from "../../../../lib/api";
import { useSwipe } from "../../../../app/hooks/useSwipe";

type SimulatorProps = {
  slug: string;
  title: string;
  timeLimitMinutes: number;
  questionCount: number;
  productSlug?: string;
  previewQuestion?: {
    id?: number;
    prompt: string;
    options: Record<string, string>;
    explanation: string;
  };
  trialQuestions?: TrialQuestion[];
};

type FullQuestion = {
  id: number;
  questionType?: "single_choice" | "multiple_response" | "true_false";
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer?: string;
  explanation?: string;
  imageUrl?: string | null;
  options?: Array<{ originalKey: string; displayLabel: string; text: string }>;
};

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function getQuestionOptions(question: FullQuestion) {
  if (question.options?.length) return question.options;
  const keys = question.questionType === "true_false" ? ["A", "B"] : ["A", "B", "C", "D", "E"];
  return keys
    .map((key) => {
      const optionKey = `option${key}` as keyof FullQuestion;
      const text = question[optionKey] as string | undefined;
      return text ? { originalKey: key, displayLabel: key, text } : null;
    })
    .filter(Boolean) as Array<{ originalKey: string; displayLabel: string; text: string }>;
}

export function Simulator({ slug, title, timeLimitMinutes, questionCount, productSlug, previewQuestion, trialQuestions }: SimulatorProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes * 60);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [questions, setQuestions] = useState<FullQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [strikethroughs, setStrikethroughs] = useState<Record<string, Set<string>>>({});
  const [questionHighlights, setQuestionHighlights] = useState<Set<string>>(new Set());
  const [optionHighlights, setOptionHighlights] = useState<Record<string, Set<string>>>({});
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Sign in and purchase access to start tracked attempts.");
  const [busy, setBusy] = useState(false);
  const [trainingMode, setTrainingMode] = useState(false);
  const [autoForward, setAutoForward] = useState(true);
  const [submittedTrainingAnswers, setSubmittedTrainingAnswers] = useState<Set<string>>(new Set());
  const [showStartScreen, setShowStartScreen] = useState(false);
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "answered" | "unanswered" | "marked">("all");
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoNextRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerActiveRef = useRef(false);
  const timerStartedAtRef = useRef<number | null>(null); // Track when timer started to distinguish "loaded with 0" vs "ran out"

  // ─── Swipe navigation for mobile ───
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1)),
    onSwipeRight: () => setCurrentIndex((i) => Math.max(0, i - 1)),
    threshold: 50,
  });

  // ─── Timer ───
  useEffect(() => {
    if (!attempt || result || attempt.trainingMode) return;
    timerActiveRef.current = true;
    timerStartedAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => { window.clearInterval(timer); timerActiveRef.current = false; timerStartedAtRef.current = null; };
  }, [attempt, result]);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const activeFullscreenExam = isFullscreen && Boolean(attempt) && !result;
    document.body.classList.toggle("pm-exam-fullscreen", activeFullscreenExam);
    return () => document.body.classList.remove("pm-exam-fullscreen");
  }, [isFullscreen, attempt, result]);

  // ─── Anti-cheating: block copy/paste/cut and right-click during active exam ───
  useEffect(() => {
    if (!attempt || result) return;
    function blockCopy(e: Event) { e.preventDefault(); }
    function blockContextMenu(e: Event) { e.preventDefault(); }
    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    document.addEventListener("paste", blockCopy);
    document.addEventListener("contextmenu", blockContextMenu);
    return () => {
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("paste", blockCopy);
      document.removeEventListener("contextmenu", blockContextMenu);
    };
  }, [attempt, result]);

  // ─── Anti-cheating: detect tab/window switches ───
  useEffect(() => {
    if (!attempt || result) return;
    function onVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((c) => {
          const next = c + 1;
          if (next >= 3) {
            setStatusMessage("Warning: Multiple tab switches detected. Your activity is being monitored.");
          }
          return next;
        });
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [attempt, result]);

  // ─── Auto-submit on timer expiry ───
  const submitAttempt = useCallback(async () => {
    if (!attempt) return;
    setShowSubmitConfirm(false);
    setBusy(true);
    try {
      // Best-effort save — don't let a save failure block submission
      try {
        await browserApiFetch<AttemptState>(`/api/attempts/${attempt.id}/progress`, {
          method: "PATCH",
          body: JSON.stringify({ answers, markedForReview: Array.from(markedForReview) })
        });
      } catch { /* continue to submit even if save fails */ }
      const submission = await browserApiFetch<AttemptResult>(`/api/attempts/${attempt.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers })
      });
      setResult(submission);
      setShowReviewScreen(false);
      setStatusMessage("Attempt submitted successfully.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to submit attempt.");
    } finally { setBusy(false); }
  }, [attempt, answers, markedForReview]);

  // ─── Auto-submit on timer expiry ───
  useEffect(() => {
    // Only auto-submit if timer actually reached 0 during the exam (not on initial load)
    // timerStartedAtRef ensures we only submit if the timer was running for at least 1 second
    if (secondsLeft === 0 && attempt && !result && !attempt.trainingMode && timerActiveRef.current && timerStartedAtRef.current) {
      void submitAttempt();
    }
  }, [secondsLeft, attempt, result, submitAttempt]);

  // ─── Helper: load attempt into state ───
  const loadAttemptIntoState = useCallback(async (a: AttemptState, jumpToUnanswered = false) => {
    setAttempt(a);
    setAnswers(a.answers ?? {});
    setMarkedForReview(new Set(a.markedForReview ?? []));
    setSubmittedTrainingAnswers(new Set());
    // Use remainingMinutes from API if available (resuming), otherwise use full time (new attempt)
    const remainingSeconds = a.remainingMinutes !== undefined 
      ? Math.max(0, a.remainingMinutes * 60)
      : timeLimitMinutes * 60;
    setSecondsLeft(remainingSeconds);
    setShowMarkedOnly(false);
    setReviewFilter("all");
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const qs = await browserApiFetch<FullQuestion[]>(`/api/attempts/${a.id}/questions`);
      setQuestions(qs);
      
      if (qs.length === 0) {
        setQuestionsError("No questions available for this exam. Please contact support.");
      }
      
      // Jump to first unanswered question if resuming
      if (jumpToUnanswered && qs.length > 0) {
        const answeredIds = new Set(Object.keys(a.answers ?? {}));
        const firstUnansweredIndex = qs.findIndex((q) => !answeredIds.has(String(q.id)));
        setCurrentIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
      } else {
        setCurrentIndex(0);
      }
    } catch (error) { 
      setQuestionsError(error instanceof Error ? error.message : "Failed to load questions");
      setCurrentIndex(0);
    } finally {
      setQuestionsLoading(false);
    }
  }, [timeLimitMinutes]);

  // ─── Check enrollment access + resume in-progress attempt ───
  useEffect(() => {
    let cancelled = false;
    async function loadAccess() {
      try {
        const response = await browserApiFetch<{ hasAccess: boolean }>(`/api/exams/${slug}/access`);
        if (!cancelled) {
          setHasAccess(response.hasAccess);
          if (!response.hasAccess) { setStatusMessage("You need an active enrollment for this exam before starting an attempt."); return; }
          // Check for an existing in-progress attempt to resume
          try {
            const existing = await browserApiFetch<AttemptState | null>(`/api/exams/${slug}/in-progress`);
            if (!cancelled && existing && existing.status === "in_progress") {
              await loadAttemptIntoState(existing, true); // true = jump to first unanswered
              setStatusMessage("Resumed your in-progress attempt.");
              return;
            }
          } catch {
            // If check fails, just show start screen so user can start fresh
            // Don't block the user - the error is likely transient
          }
          // Show start screen for new attempts (don't auto-start)
          if (!cancelled) {
            setShowStartScreen(true);
          }
        }
      } catch {
        if (!cancelled) { setHasAccess(false); setStatusMessage("Login and purchase access before starting a tracked attempt."); }
      }
    }
    void loadAccess();
    return () => { cancelled = true; };
  }, [slug, loadAttemptIntoState]);

  // ─── Auto-save progress (debounced) ───
  useEffect(() => {
    if (!attempt || result) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      try {
        await browserApiFetch<AttemptState>(`/api/attempts/${attempt.id}/progress`, {
          method: "PATCH",
          body: JSON.stringify({ answers, markedForReview: Array.from(markedForReview) })
        });
      } catch {
        // silent
      }
    }, 500);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [answers, markedForReview, attempt, result]);

  async function startAttempt() {
    if (hasAccess !== true) { setStatusMessage("Active enrollment required."); return; }
    setBusy(true);
    setResult(null);
    setShowStartScreen(false);
    try {
      const nextAttempt = await browserApiFetch<AttemptState>(`/api/exams/${slug}/attempts`, {
        method: "POST",
        body: JSON.stringify({ trainingMode })
      });
      await loadAttemptIntoState(nextAttempt);
      setStatusMessage("Tracked attempt started. Navigate freely between questions.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to start attempt.");
      setShowStartScreen(true);
    } finally { setBusy(false); }
  }

  async function toggleExamFullscreen() {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setStatusMessage("Fullscreen is unavailable in this browser.");
    }
  }

  async function saveAndResumeLater() {
    if (!attempt || result) return;
    setBusy(true);
    try {
      await browserApiFetch<AttemptState>(`/api/attempts/${attempt.id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ answers, markedForReview: Array.from(markedForReview) })
      });
      setStatusMessage("Progress saved. You can resume this test later from My Exams.");
      window.location.href = "/me/exams";
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save progress.");
    } finally {
      setBusy(false);
    }
  }

  function jumpToMarkedQuestion() {
    if (!markedForReview.size) {
      setStatusMessage("No marked questions yet.");
      return;
    }
    setReviewFilter("marked");
    setShowMarkedOnly(true);
    setShowReviewScreen(true);
    setStatusMessage(`Displaying ${markedForReview.size} marked question${markedForReview.size === 1 ? "" : "s"}.`);
  }

  function selectAnswer(questionId: string, option: string) {
    if (attempt?.trainingMode && submittedTrainingAnswers.has(questionId)) return;
    const qt = questions[currentIndex]?.questionType ?? "single_choice";
    if (qt === "multiple_response") {
      // Multiple response questions always allow exactly 2 selections
      const maxSelections = 2;
      
      // Toggle the option in a comma-separated list
      setAnswers((prev) => {
        const current = prev[questionId] ?? "";
        const selected = current ? current.split(",") : [];
        const idx = selected.indexOf(option);
        if (idx >= 0) { 
          // Unselect if already selected
          selected.splice(idx, 1); 
        } else { 
          // If at max selections, remove the first one (FIFO)
          if (selected.length >= maxSelections) {
            selected.shift();
          }
          selected.push(option); 
          selected.sort(); 
        }
        return { ...prev, [questionId]: selected.join(",") };
      });
    } else {
      // For single choice: toggle if clicking same answer
      setAnswers((prev) => {
        if (prev[questionId] === option) {
          const next = { ...prev };
          delete next[questionId];
          return next;
        }
        return { ...prev, [questionId]: option };
      });
      // Auto-advance to next question after a brief delay (skip in training mode or if auto-forward is off)
      const activeTraining = Boolean(attempt?.trainingMode);
      if (!activeTraining && autoForward && currentIndex < questions.length - 1) {
        if (autoNextRef.current) clearTimeout(autoNextRef.current);
        autoNextRef.current = setTimeout(() => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1)), 350);
      }
    }
  }

  function submitTrainingAnswer(questionId: string) {
    if (!answers[questionId]) {
      setStatusMessage("Select an answer before submitting.");
      return;
    }
    setSubmittedTrainingAnswers((prev) => new Set(prev).add(questionId));
    setStatusMessage("Answer submitted. Review the explanation, then continue.");
  }

  function toggleReviewMark(questionId: string) {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return next;
    });
  }

  function toggleStrikethrough(questionId: string, option: string) {
    setStrikethroughs((prev) => {
      const current = prev[questionId] ?? new Set();
      const next = new Set(current);
      if (next.has(option)) next.delete(option); else next.add(option);
      return { ...prev, [questionId]: next };
    });
  }

  function toggleQuestionHighlight(questionId: string) {
    setQuestionHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return next;
    });
  }

  function toggleOptionHighlight(questionId: string, option: string) {
    setOptionHighlights((prev) => {
      const current = prev[questionId] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(option)) next.delete(option); else next.add(option);
      return { ...prev, [questionId]: next };
    });
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  // ─── Review mode: show question status grid ───
  if (showReviewScreen && attempt && !result) {
    const visibleQuestions = questions.filter((question) => {
      const qid = String(question.id);
      if (reviewFilter === "answered") return Boolean(answers[qid]);
      if (reviewFilter === "unanswered") return !answers[qid];
      if (reviewFilter === "marked") return markedForReview.has(qid);
      return true;
    });
    const reviewStats = [
      { label: "Answered", value: answeredCount, color: "#059669", background: "#ECFDF5" },
      { label: "Unanswered", value: unansweredCount, color: "#6B7280", background: "#F3F4F6" },
      { label: "Flagged", value: markedForReview.size, color: "#D97706", background: "#FFF7ED" },
    ];

    return (
      <section className="simulatorCard examFullscreenRoot">
        <div className="simulatorHeader">
          <div>
            <p className="eyebrow">Review before submit</p>
            <h1>{title}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="secondaryButton fullscreenButton" type="button" onClick={toggleExamFullscreen}>
              <i className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-fullscreen"}`} />
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
            {!attempt.trainingMode && <div className="timerPill" style={secondsLeft < 300 ? { background: "#d32f2f", color: "#fff" } : {}}>{formatTime(secondsLeft)}</div>}
          </div>
        </div>
        <div className="reviewSummaryGrid">
          {reviewStats.map((stat) => (
            <div key={stat.label} className="reviewSummaryItem" style={{ background: stat.background, color: stat.color }}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="reviewMatrixLayout">
          <div className="reviewMatrixPanel">
            <div className="reviewDisplayBanner">Displaying {visibleQuestions.length} question{visibleQuestions.length === 1 ? "" : "s"}</div>
            <div className="reviewMatrixGrid">
              {visibleQuestions.map((q) => {
                const i = questions.findIndex((candidate) => candidate.id === q.id);
                const qid = String(q.id);
                const selectedAnswer = answers[qid];
                const isAnswered = Boolean(selectedAnswer);
                const isFlagged = markedForReview.has(qid);
                const statusClass = isFlagged
                  ? "marked"
                  : isAnswered
                    ? "answered"
                    : "unanswered";
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => { setCurrentIndex(i); setShowReviewScreen(false); }}
                    className={`reviewMatrixTile ${statusClass}`}
                  >
                    <strong>Q : {i + 1}</strong>
                    {selectedAnswer ? <span>{selectedAnswer}</span> : <span>&nbsp;</span>}
                    {isFlagged ? <em><i className="bi bi-check2" /> Marked</em> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="reviewFilterPanel">
            <strong>Filter:</strong>
            {(["all", "answered", "unanswered", "marked"] as const).map((filter) => (
              <label key={filter}>
                <input
                  type="checkbox"
                  checked={reviewFilter === filter}
                  onChange={() => {
                    setReviewFilter(filter);
                    setShowMarkedOnly(filter === "marked");
                  }}
                />
                <span>{filter[0].toUpperCase() + filter.slice(1)}</span>
              </label>
            ))}
          </aside>
        </div>

        <div className="reviewLegendPanel">
          <strong>Legend:</strong>
          <div><span className="legendSample unanswered"><strong>Q : X</strong></span> - Unanswered question</div>
          <div><span className="legendSample marked"><strong>Q : X</strong><em><i className="bi bi-check2" /> Marked</em></span> - Marked unanswered question</div>
          <div><span className="legendSample marked"><strong>Q : X</strong><span>A</span><em><i className="bi bi-check2" /> Marked</em></span> - Marked answered question</div>
          <div><span className="legendSample answered"><strong>Q : X</strong><span>A</span></span> - Answered question</div>
        </div>
        <div className="simulatorActions" style={{ justifyContent: "space-between" }}>
          <button className="cta buttonCta" type="button" onClick={() => setShowSubmitConfirm(true)} disabled={busy}>
            End test / Submit
          </button>
          <button className="secondaryButton" type="button" onClick={() => setShowReviewScreen(false)}>Go Back</button>
        </div>
        {showSubmitConfirm ? (
          <SubmissionConfirmDialog
            unansweredCount={unansweredCount}
            totalQuestions={questions.length}
            busy={busy}
            onCancel={() => setShowSubmitConfirm(false)}
            onConfirm={() => void submitAttempt()}
          />
        ) : null}
        <p className="statusLine">{statusMessage}</p>
      </section>
    );
  }

  // ─── Result view ───
  if (result) {
    return (
      <section className="simulatorCard examFullscreenRoot">
        <div className="simulatorHeader">
          <div>
            <p className="eyebrow">Exam complete</p>
            <h1>{title}</h1>
          </div>
        </div>
        <div className="resultCard">
          <p className="eyebrow">Result</p>
          <h2>Score {result.score} / {result.totalQuestions}</h2>
          <p className="explanation">Submitted at {new Date(result.submittedAt).toLocaleString()}</p>
        </div>
        <div className="simulatorActions">
          <a href={`/attempts/${result.attemptId}`} className="cta buttonCta">Review answers</a>
          <a href="/me/dashboard" className="secondaryButton">Dashboard</a>
        </div>
      </section>
    );
  }

  // ─── Loading/Error state when attempt exists but questions not loaded ───
  if (attempt && questionsLoading) {
    return (
      <section className="simulatorCard examFullscreenRoot">
        <div className="simulatorHeader">
          <div>
            <p className="eyebrow">Simulator</p>
            <h1>{title}</h1>
          </div>
          {!attempt.trainingMode && <div className="timerPill">{formatTime(secondsLeft)}</div>}
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading questions...</span>
          </div>
          <p className="statusLine">Loading questions...</p>
        </div>
      </section>
    );
  }

  if (attempt && questionsError) {
    return (
      <section className="simulatorCard examFullscreenRoot">
        <div className="simulatorHeader">
          <div>
            <p className="eyebrow">Simulator</p>
            <h1>{title}</h1>
          </div>
          {!attempt.trainingMode && <div className="timerPill">{formatTime(secondsLeft)}</div>}
        </div>
        <div className="questionCard" style={{ marginTop: 24, textAlign: "center" }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 48, color: "#DC2626" }} />
          <h3 style={{ marginTop: 16, color: "#DC2626" }}>Error Loading Questions</h3>
          <p className="statusLine" style={{ marginTop: 8 }}>{questionsError}</p>
          <div className="simulatorActions" style={{ marginTop: 24, justifyContent: "center" }}>
            <a href="/me/dashboard" className="secondaryButton">Back to Dashboard</a>
          </div>
        </div>
      </section>
    );
  }

  // ─── Active exam with questions loaded ───
  if (attempt && currentQuestion) {
    const qid = String(currentQuestion.id);
    const qStrikethroughs = strikethroughs[qid] ?? new Set();
    const qOptionHighlights = optionHighlights[qid] ?? new Set<string>();
    const isQuestionHighlighted = questionHighlights.has(qid);
    const activeTrainingMode = Boolean(attempt.trainingMode);
    const selectedAnswer = answers[qid];
    const trainingAnswerSubmitted = submittedTrainingAnswers.has(qid);
    const showTrainingFeedback = activeTrainingMode && trainingAnswerSubmitted && Boolean(selectedAnswer) && Boolean(currentQuestion.correctAnswer);

    return (
      <section className="simulatorCard examFullscreenRoot">
        <div className="simulatorHeader compactExamHeader">
          <div>
            <p className="eyebrow">Question {currentIndex + 1} of {questions.length}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="secondaryButton fullscreenButton" type="button" onClick={toggleExamFullscreen}>
              <i className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-fullscreen"}`} />
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
            {!activeTrainingMode && (
              <div className="timerPill" style={secondsLeft < 300 ? { background: "#d32f2f", color: "#fff" } : {}}>{formatTime(secondsLeft)}</div>
            )}
          </div>
        </div>

        <div className="simulatorActions compactExamActions" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="secondaryButton" type="button" onClick={saveAndResumeLater} disabled={busy}>
              Save and Exit
            </button>
            <button
              className="secondaryButton dangerButton"
              type="button"
              onClick={() => {
                setReviewFilter("all");
                setShowMarkedOnly(false);
                setShowReviewScreen(true);
              }}
            >
              End test
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {!activeTrainingMode && (
              <span className="statusLine" style={{ margin: 0, fontSize: 12 }}>
                Auto-forward: {autoForward ? "ON" : "OFF"}
              </span>
            )}
            {activeTrainingMode ? <span className="statusLine" style={{ margin: 0 }}>Training Mode</span> : null}
            {tabSwitchCount > 0 && !activeTrainingMode ? (
              <span className="statusLine" style={{ margin: 0, color: "#d32f2f", fontWeight: 600 }}>
                ⚠ Tab switches: {tabSwitchCount}
              </span>
            ) : null}
          </div>
        </div>

        <div className="questionCard" {...swipeHandlers}>
          <div className="swipe-hint">
            <i className="bi bi-arrow-left-right" />
            <span>Swipe to navigate</span>
          </div>
          {currentQuestion.questionType !== "single_choice" && (
            <p className="questionLabel">{currentQuestion.questionType === "multiple_response" ? "Select all that apply" : "True/False"}</p>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <h2
              className="examQuestionText"
              style={isQuestionHighlighted ? { background: "#FEF3C7", borderRadius: 6, padding: "4px 6px" } : undefined}
            >
              {currentQuestion.prompt}
            </h2>
            <button
              type="button"
              className="secondaryButton"
              onClick={() => toggleQuestionHighlight(qid)}
              style={{ padding: "4px 8px", flexShrink: 0 }}
            >
              Highlight
            </button>
          </div>

          {currentQuestion.imageUrl && (
            <div style={{ margin: "12px 0" }}>
              <img
                src={currentQuestion.imageUrl}
                alt="Question diagram"
                style={{ maxWidth: "100%", height: "auto", borderRadius: 8, border: "1px solid var(--line)" }}
              />
            </div>
          )}

          <div className="optionList">
            {getQuestionOptions(currentQuestion).map((option) => {
              const selectedParts = (answers[qid] ?? "").split(",").filter(Boolean);
              const isSelected = currentQuestion.questionType === "multiple_response" ? selectedParts.includes(option.originalKey) : answers[qid] === option.originalKey;
              const isStruck = qStrikethroughs.has(option.originalKey);
              const isHighlighted = qOptionHighlights.has(option.originalKey);
              return (
                <div key={option.originalKey} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className={isSelected ? "optionButton active" : "optionButton"}
                    onClick={() => selectAnswer(qid, option.originalKey)}
                    type="button"
                    disabled={activeTrainingMode && trainingAnswerSubmitted}
                    style={{
                      textDecoration: isStruck ? "line-through" : "none",
                      opacity: isStruck ? 0.5 : 1,
                      background: isHighlighted ? "#FEF3C7" : undefined
                    }}
                  >
                    <span>{option.displayLabel}</span>
                    <span>{option.text}</span>
                  </button>
                  <button type="button" onClick={() => toggleStrikethrough(qid, option.originalKey)}
                    title="Toggle strikethrough"
                    style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "4px 6px", cursor: "pointer", fontSize: 11, textDecoration: isStruck ? "line-through" : "none" }}>
                    S
                  </button>
                  <button type="button" onClick={() => toggleOptionHighlight(qid, option.originalKey)}
                    title="Toggle option highlight"
                    style={{ background: isHighlighted ? "#FEF3C7" : "none", border: "1px solid var(--line)", borderRadius: 4, padding: "4px 6px", cursor: "pointer", fontSize: 11 }}>
                    H
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={markedForReview.has(qid)} onChange={() => toggleReviewMark(qid)} />
              Mark for review
            </label>
          </div>

          {activeTrainingMode && !trainingAnswerSubmitted && (
            <div className="simulatorActions" style={{ marginTop: 12, justifyContent: "flex-start" }}>
              <button className="cta buttonCta" type="button" onClick={() => submitTrainingAnswer(qid)} disabled={!selectedAnswer}>
                Submit Answer
              </button>
            </div>
          )}

          {showTrainingFeedback ? (() => {
            const correctStr = currentQuestion.correctAnswer ?? "";
            const correctKeys = correctStr.split(",").map(s => s.trim());
            const correctDisplay = getQuestionOptions(currentQuestion)
              .filter((option) => correctKeys.includes(option.originalKey))
              .map((option) => option.displayLabel)
              .join(", ");
            let isCorrect = false;
            if (currentQuestion.questionType === "multiple_response") {
              const correctParts = correctKeys.sort();
              const userParts = (selectedAnswer ?? "").split(",").map(s => s.trim()).filter(Boolean).sort();
              isCorrect = correctParts.length === userParts.length && correctParts.every((c, i) => c === userParts[i]);
            } else {
              isCorrect = selectedAnswer === correctStr;
            }
            return (
              <div className="resultCard" style={{ marginTop: 12 }}>
                <p className="eyebrow">Training feedback</p>
                <h3 style={{ marginTop: 0 }}>{isCorrect ? "Correct" : "Incorrect"}</h3>
                <p className="explanation" style={{ marginBottom: 4 }}>
                  Correct answer: <strong>{correctDisplay || correctStr}</strong>
                </p>
                <p className="explanation">{currentQuestion.explanation ?? "No explanation available."}</p>
                <div className="simulatorActions" style={{ marginTop: 12, justifyContent: "flex-start" }}>
                  <button
                    className="cta buttonCta"
                    type="button"
                    onClick={() => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1))}
                    disabled={currentIndex >= questions.length - 1}
                  >
                    Next Question
                  </button>
                </div>
              </div>
            );
          })() : null}
        </div>

        <div className="simulatorActions">
          <button className="secondaryButton" type="button" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0}>
            Previous
          </button>
          <button
            className="secondaryButton"
            type="button"
            onClick={() => {
              setReviewFilter("all");
              setShowMarkedOnly(false);
              setShowReviewScreen(true);
            }}
          >
            Review all ({answeredCount}/{questions.length})
          </button>
          {currentIndex < questions.length - 1 ? (
            <button className="cta buttonCta" type="button" onClick={() => setCurrentIndex((i) => i + 1)}>Next</button>
          ) : (
            <button
              className="cta buttonCta"
              type="button"
              onClick={() => {
                setReviewFilter("all");
                setShowMarkedOnly(false);
                setShowReviewScreen(true);
              }}
            >
              Finish & Review
            </button>
          )}
        </div>
        <p className="statusLine">{statusMessage}</p>
      </section>
    );
  }

  // ─── Pre-start / preview mode (only shown for non-enrolled users or while loading) ───
  return (
    <section className="simulatorCard examFullscreenRoot">
      <div className="simulatorHeader">
        <div>
          <p className="eyebrow">Simulator</p>
          <h1>{title}</h1>
        </div>
        <div className="timerPill">{formatTime(secondsLeft)}</div>
      </div>

      <div className="examMeta">
        <span>{questionCount} questions</span>
        <span>Free question navigation</span>
        <span>Strikethrough & review</span>
      </div>

      {/* Start screen for paid users */}
      {hasAccess === true && showStartScreen && (
        <div className="questionCard" style={{ marginTop: 24 }}>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <h2 style={{ margin: "8px 0" }}>Ready to start?</h2>
            <p style={{ color: "var(--muted)", maxWidth: 420, margin: "12px auto" }}>
              You have {questionCount} questions and {timeLimitMinutes} minutes. 
              Configure your preferences below.
            </p>
            <div style={{ margin: "20px auto", maxWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", justifyContent: "center" }}>
                <input type="checkbox" checked={trainingMode} onChange={() => setTrainingMode(!trainingMode)} />
                <span style={{ fontSize: 14 }}>Training mode (submit to reveal feedback)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", justifyContent: "center" }}>
                <input type="checkbox" checked={autoForward} onChange={() => setAutoForward(!autoForward)} />
                <span style={{ fontSize: 14 }}>Auto-advance to next question</span>
              </label>
            </div>
            <button className="cta buttonCta" type="button" onClick={startAttempt} disabled={busy}>
              {busy ? "Starting..." : "Start Exam"}
            </button>
          </div>
        </div>
      )}

      {hasAccess === true && !showStartScreen && !attempt && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="statusLine">Loading...</p>
        </div>
      )}

      {hasAccess !== true && <p className="statusLine">{statusMessage}</p>}

      {hasAccess !== true && trialQuestions && trialQuestions.length > 0 ? (
        <TrialSimulator trialQuestions={trialQuestions} productSlug={productSlug ?? slug} title={title} timeLimitMinutes={timeLimitMinutes} />
      ) : hasAccess !== true && previewQuestion ? (
        <div className="questionCard">
          <p className="questionLabel">Question Preview (read-only)</p>
          <h2>{previewQuestion.prompt}</h2>
          <div className="optionList">
            {Object.entries(previewQuestion.options).map(([key, value]) => (
              <button key={key} className="optionButton" type="button" disabled>
                <span>{key}</span>
                <span>{value}</span>
              </button>
            ))}
          </div>
          <p className="explanation">Explanation: {previewQuestion.explanation}</p>
        </div>
      ) : null}
    </section>
  );
}

function SubmissionConfirmDialog({
  unansweredCount,
  totalQuestions,
  busy,
  onCancel,
  onConfirm,
}: {
  unansweredCount: number;
  totalQuestions: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const hasUnanswered = unansweredCount > 0;

  return (
    <div className="submissionModalOverlay" role="presentation">
      <div className="submissionModal" role="dialog" aria-modal="true" aria-labelledby="submission-confirm-title">
        <div className="submissionModalIcon">
          <i className={`bi ${hasUnanswered ? "bi-exclamation-triangle" : "bi-check2-circle"}`} />
        </div>
        <h3 id="submission-confirm-title">Submit test?</h3>
        <p>
          {hasUnanswered
            ? `There are still ${unansweredCount} unanswered question${unansweredCount === 1 ? "" : "s"} out of ${totalQuestions}. Are you sure you want to submit the test?`
            : "All questions have been answered. Are you sure you want to submit the test?"}
        </p>
        <div className="submissionModalActions">
          <button className="secondaryButton" type="button" onClick={onCancel} disabled={busy}>
            Continue test
          </button>
          <button className="cta buttonCta" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Submitting..." : "Submit test"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Trial Mini-Simulator (full-featured for non-enrolled users) ─── */
function TrialSimulator({ trialQuestions, productSlug, title, timeLimitMinutes }: { trialQuestions: TrialQuestion[]; productSlug: string; title: string; timeLimitMinutes: number }) {
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialAnswers, setTrialAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [showReview, setShowReview] = useState(false);
  // Use 1 minute for trial regardless of passed timeLimitMinutes
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [trainingMode, setTrainingMode] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [strikethroughs, setStrikethroughs] = useState<Record<number, Set<string>>>({});
  const [questionHighlights, setQuestionHighlights] = useState<Set<number>>(new Set());
  const [optionHighlights, setOptionHighlights] = useState<Record<number, Set<string>>>({});
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "answered" | "unanswered" | "marked">("all");
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [autoForward, setAutoForward] = useState(true);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const autoNextRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Swipe navigation for mobile ───
  const trialSwipeHandlers = useSwipe({
    onSwipeLeft: () => { setTrialIndex((i) => Math.min(i + 1, trialQuestions.length - 1)); setRevealedAnswer(false); },
    onSwipeRight: () => { setTrialIndex((i) => Math.max(0, i - 1)); setRevealedAnswer(false); },
    threshold: 50,
  });

  const q = trialQuestions[trialIndex];
  const selected = trialAnswers[trialIndex];
  const isCorrect = selected === q?.correctAnswer;
  const answeredCount = Object.keys(trialAnswers).length;
  const unansweredCount = Math.max(0, trialQuestions.length - answeredCount);
  const trialScore = trialQuestions.reduce(
    (count, tq, i) => count + (trialAnswers[i] === tq.correctAnswer ? 1 : 0),
    0
  );
  const qStrikethroughs = strikethroughs[trialIndex] ?? new Set<string>();
  const qOptionHighlights = optionHighlights[trialIndex] ?? new Set<string>();
  const isQuestionHighlighted = questionHighlights.has(trialIndex);

  // Timer
  useEffect(() => {
    if (!trialStarted || showResult || showTimeUpModal || trainingMode) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setShowTimeUpModal(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => { window.clearInterval(timer); };
  }, [trialStarted, showResult, showTimeUpModal]);

  // Block copy/paste/right-click during active trial
  useEffect(() => {
    if (!trialStarted || showResult) return;
    function block(e: Event) { e.preventDefault(); }
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
    };
  }, [trialStarted, showResult]);

  // Tab switch detection
  useEffect(() => {
    if (!trialStarted || showResult || trainingMode) return;
    function onVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [trialStarted, showResult, trainingMode]);

  function selectTrialAnswer(option: string) {
    if (trainingMode && revealedAnswer) return;
    setTrialAnswers((prev) => {
      const current = prev[trialIndex];
      // If clicking the same answer, unselect it
      if (current === option) {
        const next = { ...prev };
        delete next[trialIndex];
        return next;
      }
      return { ...prev, [trialIndex]: option };
    });
    if (!trainingMode && autoForward) {
      // Auto-next after 350ms only if auto-forward is enabled
      if (trialIndex < trialQuestions.length - 1) {
        if (autoNextRef.current) clearTimeout(autoNextRef.current);
        autoNextRef.current = setTimeout(() => setTrialIndex((i) => Math.min(i + 1, trialQuestions.length - 1)), 350);
      }
    }
  }

  function submitTrialAnswer() {
    if (!selected) {
      setStatusMessage("Select an answer before submitting.");
      return;
    }
    setRevealedAnswer(true);
    setStatusMessage("Answer submitted. Review the explanation, then continue.");
  }

  function nextTrialQuestion() {
    setRevealedAnswer(false);
    if (trialIndex < trialQuestions.length - 1) {
      setTrialIndex(trialIndex + 1);
    }
  }

  function toggleReviewMark(index: number) {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function toggleStrikethrough(index: number, option: string) {
    setStrikethroughs((prev) => {
      const current = prev[index] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(option)) next.delete(option); else next.add(option);
      return { ...prev, [index]: next };
    });
  }

  function toggleQuestionHighlight(index: number) {
    setQuestionHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function toggleOptionHighlight(index: number, option: string) {
    setOptionHighlights((prev) => {
      const current = prev[index] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(option)) next.delete(option); else next.add(option);
      return { ...prev, [index]: next };
    });
  }

  function jumpToMarkedQuestion() {
    if (!markedForReview.size) {
      setStatusMessage("No marked questions yet.");
      return;
    }
    setReviewFilter("marked");
    setShowMarkedOnly(true);
    setShowReview(true);
    setStatusMessage(`Displaying ${markedForReview.size} marked question${markedForReview.size === 1 ? "" : "s"}.`);
  }

  function restartTrial() {
    setTrialIndex(0);
    setTrialAnswers({});
    setShowResult(false);
    setShowReview(false);
    setRevealedAnswer(false);
    setTrialStarted(false);
    setSecondsLeft(60);
    setMarkedForReview(new Set());
    setStrikethroughs({});
    setShowMarkedOnly(false);
    setReviewFilter("all");
    setTabSwitchCount(0);
    setShowTimeUpModal(false);
    setShowSubmitConfirm(false);
    setStatusMessage("");
  }

  // Pre-start screen
  if (!trialStarted) {
    return (
      <div className="questionCard" style={{ marginTop: 24 }}>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <h2 style={{ margin: "8px 0" }}>
            Try {trialQuestions.length} sample questions
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: 420, margin: "12px auto" }}>
            Experience the full simulator with timer, navigation, and review — just like the real exam.
          </p>
          <div style={{ margin: "16px auto", maxWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", justifyContent: "center" }}>
              <input type="checkbox" checked={trainingMode} onChange={() => setTrainingMode(!trainingMode)} />
              <span style={{ fontSize: 14 }}>Training mode (submit to reveal feedback)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", justifyContent: "center" }}>
              <input type="checkbox" checked={autoForward} onChange={() => setAutoForward(!autoForward)} />
              <span style={{ fontSize: 14 }}>Auto-advance to next question</span>
            </label>
          </div>
          <button className="cta buttonCta" type="button" onClick={() => setTrialStarted(true)}>
            Start Trial
          </button>
        </div>
      </div>
    );
  }

  // Result screen
  if (showResult) {
    return (
      <div className="questionCard" style={{ marginTop: 24 }}>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Free Trial Complete</p>
          <h2 style={{ margin: "8px 0" }}>
            You scored {trialScore} / {trialQuestions.length}
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: 420, margin: "12px auto" }}>
            This was a quick preview. Purchase access to unlock all {" "}
            questions with full tracking, timer, and detailed analytics.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button className="secondaryButton" type="button" onClick={restartTrial}>
              Try Again
            </button>
            <a href={`/checkout?product=${productSlug}`} className="cta" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Get Full Access
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Review screen
  if (showReview) {
    const visibleQuestions = trialQuestions
      .map((question, index) => ({ question, index }))
      .filter(({ index }) => {
        const isAnswered = trialAnswers[index] !== undefined;
        const isFlagged = markedForReview.has(index);
        if (reviewFilter === "answered") return isAnswered;
        if (reviewFilter === "unanswered") return !isAnswered;
        if (reviewFilter === "marked") return isFlagged;
        return true;
      });
    const reviewStats = [
      { label: "Answered", value: answeredCount, color: "#059669", background: "#ECFDF5" },
      { label: "Unanswered", value: unansweredCount, color: "#6B7280", background: "#F3F4F6" },
      { label: "Flagged", value: markedForReview.size, color: "#D97706", background: "#FFF7ED" },
    ];

    return (
      <div className="questionCard" style={{ marginTop: 24 }}>
        <div className="simulatorHeader compactExamHeader" style={{ marginBottom: 12 }}>
          <div>
            <p className="eyebrow">Review before submit</p>
            <p style={{ fontWeight: 600, margin: 0 }}>{title}</p>
          </div>
          {!trainingMode && <div className="timerPill" style={secondsLeft < 60 ? { background: "#d32f2f", color: "#fff" } : {}}>{formatTime(secondsLeft)}</div>}
        </div>
        <div className="reviewSummaryGrid">
          {reviewStats.map((stat) => (
            <div key={stat.label} className="reviewSummaryItem" style={{ background: stat.background, color: stat.color }}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="reviewMatrixLayout">
          <div className="reviewMatrixPanel">
            <div className="reviewDisplayBanner">Displaying {visibleQuestions.length} question{visibleQuestions.length === 1 ? "" : "s"}</div>
            <div className="reviewMatrixGrid">
              {visibleQuestions.map(({ index: i }) => {
                const selectedAnswer = trialAnswers[i];
                const isAnswered = selectedAnswer !== undefined;
                const isFlagged = markedForReview.has(i);
                const statusClass = isFlagged
                  ? "marked"
                  : isAnswered
                    ? "answered"
                    : "unanswered";
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setTrialIndex(i); setShowReview(false); setRevealedAnswer(false); }}
                    className={`reviewMatrixTile ${statusClass}`}
                  >
                    <strong>Q : {i + 1}</strong>
                    {selectedAnswer ? <span>{selectedAnswer}</span> : <span>&nbsp;</span>}
                    {isFlagged ? <em><i className="bi bi-check2" /> Marked</em> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="reviewFilterPanel">
            <strong>Filter:</strong>
            {(["all", "answered", "unanswered", "marked"] as const).map((filter) => (
              <label key={filter}>
                <input
                  type="checkbox"
                  checked={reviewFilter === filter}
                  onChange={() => {
                    setReviewFilter(filter);
                    setShowMarkedOnly(filter === "marked");
                  }}
                />
                <span>{filter[0].toUpperCase() + filter.slice(1)}</span>
              </label>
            ))}
          </aside>
        </div>

        <div className="reviewLegendPanel">
          <strong>Legend:</strong>
          <div><span className="legendSample unanswered"><strong>Q : X</strong></span> - Unanswered question</div>
          <div><span className="legendSample marked"><strong>Q : X</strong><em><i className="bi bi-check2" /> Marked</em></span> - Marked unanswered question</div>
          <div><span className="legendSample marked"><strong>Q : X</strong><span>A</span><em><i className="bi bi-check2" /> Marked</em></span> - Marked answered question</div>
          <div><span className="legendSample answered"><strong>Q : X</strong><span>A</span></span> - Answered question</div>
        </div>
        <div className="simulatorActions" style={{ justifyContent: "space-between" }}>
          <button className="cta buttonCta" type="button" onClick={() => setShowSubmitConfirm(true)}>
            End test / Submit
          </button>
          <button className="secondaryButton" type="button" onClick={() => { setShowReview(false); setRevealedAnswer(false); }}>Go Back</button>
        </div>
        {showSubmitConfirm ? (
          <SubmissionConfirmDialog
            unansweredCount={unansweredCount}
            totalQuestions={trialQuestions.length}
            busy={false}
            onCancel={() => setShowSubmitConfirm(false)}
            onConfirm={() => {
              setShowSubmitConfirm(false);
              setShowResult(true);
            }}
          />
        ) : null}
      </div>
    );
  }

  // Active trial question
  return (
    <div style={{ marginTop: 24 }}>
      {/* Time Up Modal - blocks interaction when timer expires */}
      {showTimeUpModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: "32px 40px",
            maxWidth: 400,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              width: 64, height: 64,
              borderRadius: "50%",
              background: "#FEF2F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <i className="bi bi-clock-history" style={{ fontSize: 32, color: "#DC2626" }} />
            </div>
            <h3 style={{ margin: "0 0 8px", color: "#1A1D23" }}>Time's Up!</h3>
            <p style={{ color: "#6B7280", margin: "0 0 24px" }}>
              Your time has expired. Please submit your answers to see your results.
            </p>
            <button
              className="cta buttonCta"
              type="button"
              onClick={() => setShowResult(true)}
              style={{ width: "100%" }}
            >
              Submit Answers
            </button>
          </div>
        </div>
      )}

      <div className="simulatorHeader compactExamHeader" style={{ marginBottom: 8 }}>
        <div>
          <p className="eyebrow">Question {trialIndex + 1} of {trialQuestions.length}</p>
        </div>
        {!trainingMode && <div className="timerPill" style={secondsLeft < 60 ? { background: "#d32f2f", color: "#fff" } : {}}>{formatTime(secondsLeft)}</div>}
      </div>

      <div className="simulatorActions compactExamActions" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="secondaryButton dangerButton"
            type="button"
            onClick={() => {
              setReviewFilter("all");
              setShowMarkedOnly(false);
              setShowReview(true);
            }}
          >
            End test
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!trainingMode && (
            <span className="statusLine" style={{ margin: 0, fontSize: 12 }}>
              Auto-forward: {autoForward ? "ON" : "OFF"}
            </span>
          )}
          {trainingMode ? <span className="statusLine" style={{ margin: 0 }}>Training Mode</span> : null}
          {tabSwitchCount > 0 && !trainingMode ? (
            <span className="statusLine" style={{ margin: 0, color: "#d32f2f", fontWeight: 600 }}>
              ⚠ Tab switches: {tabSwitchCount}
            </span>
          ) : null}
        </div>
      </div>

      <div className="questionCard" {...trialSwipeHandlers}>
        <div className="swipe-hint">
          <i className="bi bi-arrow-left-right" />
          <span>Swipe to navigate</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <h2
            className="examQuestionText"
            style={isQuestionHighlighted ? { background: "#FEF3C7", borderRadius: 6, padding: "4px 6px" } : undefined}
          >
            {q.prompt}
          </h2>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => toggleQuestionHighlight(trialIndex)}
            style={{ padding: "4px 8px", flexShrink: 0 }}
          >
            Highlight
          </button>
        </div>

        {q.imageUrl && (
          <div style={{ margin: "12px 0" }}>
            <img
              src={q.imageUrl}
              alt="Question diagram"
              style={{ maxWidth: "100%", height: "auto", borderRadius: 8, border: "1px solid var(--line)" }}
            />
          </div>
        )}

        <div className="optionList">
          {Object.entries(q.options).map(([key, value]) => {
            const isSelected = trialAnswers[trialIndex] === key;
            const isStruck = qStrikethroughs.has(key);
            const isHighlighted = qOptionHighlights.has(key);

            // Training mode feedback styling
            let className = "optionButton";
            if (trainingMode && revealedAnswer) {
              if (key === q.correctAnswer) className += " trialCorrect";
              else if (key === selected && !isCorrect) className += " trialWrong";
            } else if (isSelected) {
              className += " active";
            }

            return (
              <div key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className={className}
                  type="button"
                  onClick={() => selectTrialAnswer(key)}
                  disabled={trainingMode && revealedAnswer}
                  style={{
                    textDecoration: isStruck ? "line-through" : "none",
                    opacity: isStruck ? 0.5 : 1,
                    background: isHighlighted ? "#FEF3C7" : undefined
                  }}
                >
                  <span>{key}</span>
                  <span>{value}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleStrikethrough(trialIndex, key)}
                  title="Toggle strikethrough"
                  style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "4px 6px", cursor: "pointer", fontSize: 11, textDecoration: isStruck ? "line-through" : "none" }}
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => toggleOptionHighlight(trialIndex, key)}
                  title="Toggle option highlight"
                  style={{ background: isHighlighted ? "#FEF3C7" : "none", border: "1px solid var(--line)", borderRadius: 4, padding: "4px 6px", cursor: "pointer", fontSize: 11 }}
                >
                  H
                </button>
              </div>
            );
          })}
        </div>

        {trainingMode && !revealedAnswer && (
          <div className="simulatorActions" style={{ marginTop: 12, justifyContent: "flex-start" }}>
            <button className="cta buttonCta" type="button" onClick={submitTrialAnswer} disabled={!selected}>
              Submit Answer
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={markedForReview.has(trialIndex)} onChange={() => toggleReviewMark(trialIndex)} />
            Mark for review
          </label>
        </div>

        {trainingMode && revealedAnswer && (
          <div className="resultCard" style={{ marginTop: 12 }}>
            <p className="eyebrow">Training feedback</p>
            <h3 style={{ marginTop: 0 }}>{isCorrect ? "Correct" : "Incorrect"}</h3>
            <p className="explanation" style={{ marginBottom: 4 }}>
              Correct answer: <strong>{q.correctAnswer}</strong>
            </p>
            <p className="explanation" style={{ margin: 0 }}>{q.explanation}</p>
            <div style={{ marginTop: 16 }}>
              <button className="cta buttonCta" type="button" onClick={nextTrialQuestion} disabled={trialIndex >= trialQuestions.length - 1}>
                Next Question
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="simulatorActions">
        <button className="secondaryButton" type="button" onClick={() => { setTrialIndex((i) => Math.max(0, i - 1)); setRevealedAnswer(false); }} disabled={trialIndex === 0}>
          Previous
        </button>
        <button
          className="secondaryButton"
          type="button"
          onClick={() => {
            setReviewFilter("all");
            setShowMarkedOnly(false);
            setShowReview(true);
          }}
        >
          Review all ({answeredCount}/{trialQuestions.length})
        </button>
        {trialIndex < trialQuestions.length - 1 ? (
          <button className="cta buttonCta" type="button" onClick={() => { setTrialIndex((i) => i + 1); setRevealedAnswer(false); }}>Next</button>
        ) : (
          <button
            className="cta buttonCta"
            type="button"
            onClick={() => {
              setReviewFilter("all");
              setShowMarkedOnly(false);
              setShowReview(true);
            }}
          >
            Finish & Review
          </button>
        )}
      </div>
      {statusMessage ? <p className="statusLine">{statusMessage}</p> : null}
    </div>
  );
}
