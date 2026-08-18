"use client";

import Link from "next/link";
import { useExam } from "../../ExamContext";
import { browserApiFetch } from "../../../../lib/api";
import { useEffect, useState } from "react";

const PRIMARY = "#E8792B";

type ExamInfo = {
  id: number;
  slug: string;
  title: string;
  timeLimitMinutes: number;
  passThreshold: number;
  questionCount: number;
  status?: string;
};

type ProductWithExams = {
  id: number;
  slug: string;
  title: string;
  category: string;
  exams: ExamInfo[];
};

type ExamSummary = {
  examSlug: string;
  inProgress: {
    id: string;
    startedAt: string;
    trainingMode: boolean;
    questionCount: number;
    answeredCount: number;
    remainingMinutes: number;
  } | null;
  submittedCount: number;
};

export function ExamsContent() {
  const { selectedExamSlug, currentEnrollment, enrollments } = useExam();
  const [product, setProduct] = useState<ProductWithExams | null>(null);
  const [examSummaries, setExamSummaries] = useState<Record<string, ExamSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    async function loadProduct() {
      if (!selectedExamSlug) {
        setLoading(false);
        return;
      }
      
      try {
        const data = await browserApiFetch<ProductWithExams>(`/api/products/${selectedExamSlug}`);
        if (!cancelled) {
          setProduct(data);
          // Load exam summaries for each exam
          if (data.exams?.length) {
            const summaries: Record<string, ExamSummary> = {};
            for (const exam of data.exams) {
              try {
                const summary = await browserApiFetch<ExamSummary>(`/api/exams/${exam.slug}/summary`);
                summaries[exam.slug] = summary;
              } catch {
                summaries[exam.slug] = { examSlug: exam.slug, inProgress: null, submittedCount: 0 };
              }
            }
            if (!cancelled) {
              setExamSummaries(summaries);
            }
          }
        }
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadProduct();
    return () => { cancelled = true; };
  }, [selectedExamSlug]);

  const activeEnrollments = enrollments.filter((e) => e.status === "active" && new Date(e.expiresAt) > new Date());

  if (loading) {
    return (
      <div className="container-lg py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (activeEnrollments.length === 0) {
    return (
      <main className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h1 className="fw-bold" style={{ color: "#1A1D23", fontSize: "1.75rem", letterSpacing: "-0.02em" }}>My Practice Exams</h1>
          <Link href="/me/dashboard" className="btn btn-sm fw-medium px-3" style={{ color: "#3D4149", border: "1px solid #D1D5DB", borderRadius: 8 }}>
            <i className="bi bi-arrow-left me-1" />Dashboard
          </Link>
        </div>
        <div className="rounded-4 text-center py-5" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
          <i className="bi bi-journal-x d-block mb-2" style={{ fontSize: 40, color: "#D1D5DB" }} />
          <p style={{ color: "#6B7280" }} className="mb-1">No active subscriptions found.</p>
          <Link href="/" style={{ color: "#E8792B", fontWeight: 600 }}>Browse products to get started</Link>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h1 className="fw-bold" style={{ color: "#1A1D23", fontSize: "1.75rem", letterSpacing: "-0.02em" }}>My Practice Exams</h1>
          <Link href="/me/dashboard" className="btn btn-sm fw-medium px-3" style={{ color: "#3D4149", border: "1px solid #D1D5DB", borderRadius: 8 }}>
            <i className="bi bi-arrow-left me-1" />Dashboard
          </Link>
        </div>
        <div className="alert alert-info">Unable to load exam details.</div>
      </main>
    );
  }

  const publishedExams = product.exams.filter((e) => e.status === "published");

  return (
    <main className="container-lg py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="fw-bold mb-1" style={{ color: "#1A1D23", fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
            My Practice Exams
          </h1>
          {currentEnrollment && (
            <div 
              className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 mt-2"
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
          )}
        </div>
        <Link href="/me/dashboard" className="btn btn-sm fw-medium px-3" style={{ color: "#3D4149", border: "1px solid #D1D5DB", borderRadius: 8 }}>
          <i className="bi bi-arrow-left me-1" />Dashboard
        </Link>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-start justify-content-between" style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB", padding: "16px 20px" }}>
          <div>
            <h5 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color: "#1A1D23" }}>
              <i className="bi bi-journal-bookmark" style={{ color: PRIMARY }} />
              {product.title}
            </h5>
            <small style={{ color: "#6B7280" }}>
              {publishedExams.length > 0
                ? `${publishedExams.length} test${publishedExams.length !== 1 ? "s" : ""} available`
                : "Practice tests coming soon"}
            </small>
          </div>
          <span className="px-2 py-1 rounded-2 fw-semibold" style={{ fontSize: 11, background: "#FFF3EB", color: "#E8792B", letterSpacing: "0.04em" }}>
            {product.category}
          </span>
        </div>
        {publishedExams.length > 0 ? (
          <div className="card-body p-0">
            {publishedExams.map((exam, idx) => {
              const summary = examSummaries[exam.slug];
              const hasInProgress = summary?.inProgress !== null;
              const inProgress = summary?.inProgress;
              const attemptCount = summary?.submittedCount ?? 0;

              return (
                <div
                  key={exam.id}
                  className={`d-flex align-items-center py-3 px-4${idx < publishedExams.length - 1 ? " border-bottom" : ""}`}
                >
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 me-3"
                    style={{ width: 44, height: 44, background: hasInProgress ? "#FEF3C7" : "#FFF3EB" }}
                  >
                    <i className={`bi ${hasInProgress ? "bi-play-circle" : "bi-pencil-square"}`} style={{ color: hasInProgress ? "#D97706" : PRIMARY, fontSize: 18 }}></i>
                  </div>
                  <div className="flex-grow-1">
                    <span className="fw-semibold d-block">{exam.title}</span>
                    <small className="text-muted">
                      {exam.questionCount} question{exam.questionCount !== 1 ? "s" : ""} &middot; {exam.timeLimitMinutes} min &middot; Pass: {exam.passThreshold}%
                      {attemptCount > 0 && (
                        <span className="ms-2">
                          <span className="badge rounded-pill" style={{ background: "#ECFDF5", color: "#059669", fontSize: 10, fontWeight: 600 }}>
                            {attemptCount} attempt{attemptCount !== 1 ? "s" : ""}
                          </span>
                        </span>
                      )}
                    </small>
                    {hasInProgress && inProgress && (
                      <div className="mt-2 d-flex align-items-center gap-3" style={{ fontSize: 12 }}>
                        <span style={{ color: "#D97706", fontWeight: 500 }}>
                          <i className="bi bi-play-circle me-1" />
                          In Progress: {inProgress.answeredCount}/{inProgress.questionCount} answered
                        </span>
                        <span style={{ color: inProgress.remainingMinutes < 5 ? "#DC2626" : "#6B7280" }}>
                          <i className="bi bi-clock me-1" />
                          {inProgress.remainingMinutes} min remaining
                        </span>
                      </div>
                    )}
                  </div>
                  {hasInProgress ? (
                    <Link
                      href={`/exams/${exam.slug}`}
                      className="btn btn-sm text-white ms-3 flex-shrink-0 fw-semibold"
                      style={{ background: "#D97706", borderRadius: 8 }}
                    >
                      <i className="bi bi-play-fill me-1" />Resume Test
                    </Link>
                  ) : (
                    <Link
                      href={`/exams/${exam.slug}`}
                      className="btn btn-sm text-white ms-3 flex-shrink-0 fw-semibold"
                      style={{ background: PRIMARY, borderRadius: 8 }}
                    >
                      Start Test
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-body text-center py-4">
            <i className="bi bi-hourglass-split text-muted fs-4 d-block mb-2"></i>
            <p className="text-muted mb-0">Practice tests are being prepared. Check back soon!</p>
          </div>
        )}
      </div>
    </main>
  );
}
