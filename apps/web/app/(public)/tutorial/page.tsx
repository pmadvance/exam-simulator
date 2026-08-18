import Link from "next/link";
import { PublicNavbar } from "../PublicNavbar";
import { Footer } from "../Footer";

const steps = [
  {
    num: "01",
    title: "Unlock Access",
    detail: "Choose your targeted certification package from the catalog and quickly check out.",
    icon: "bi-cart-check",
  },
  {
    num: "02",
    title: "Launch a Simulation",
    detail: "Start a mock exam in real-time. Switch on Training Mode to submit each answer and reveal guided feedback while practicing.",
    icon: "bi-play-circle",
  },
  {
    num: "03",
    title: "Use Smart Cues",
    detail: "Flag challenging questions, use strikethroughs to eliminate wrong choices, and navigate seamlessly across modules.",
    icon: "bi-bookmark-star",
  },
  {
    num: "04",
    title: "Review Performance",
    detail: "Submit your session to unlock detailed rationales for every question and track your proficiency score trends.",
    icon: "bi-check2-circle",
  },
];

export default function TutorialPage() {
  return (
    <>
      <PublicNavbar />
      <main style={{ background: "#F3F4F6", minHeight: "100vh" }}>
        <div className="container py-5 animate-in">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
            <div>
              <p className="text-uppercase fw-semibold mb-2" style={{ fontSize: 12, letterSpacing: "0.18em", color: "#2B7A87" }}>
                Student Tutorial
              </p>
              <h1 className="fw-bold mb-1" style={{ fontSize: "1.875rem", color: "#1A1D23" }}>
                Master the Simulator in 4 Steps
              </h1>
              <p className="mb-0" style={{ color: "#6B7280", fontSize: 14 }}>
                Everything you need to navigate, practice, and pass your exam on our platform.
              </p>
            </div>
            <Link
              href="/me/dashboard"
              className="fw-semibold text-decoration-none d-flex align-items-center gap-1"
              style={{ color: "#2B7A87", fontSize: 14 }}
            >
              Go to dashboard
              <i className="bi bi-arrow-right" style={{ fontSize: 14 }} />
            </Link>
          </div>

          {/* Steps */}
          <div className="row g-3">
            {steps.map((step, i) => (
              <div className="col-md-6" key={i}>
                <div className="card border-0 h-100" style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div className="card-body p-4 d-flex gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 48, height: 48, background: "#FFF3EB" }}
                    >
                      <i className={`bi ${step.icon}`} style={{ color: "#E8792B", fontSize: 22 }} />
                    </div>
                    <div>
                      <p className="fw-bold mb-0" style={{ fontSize: 11, color: "#E8792B", letterSpacing: "0.1em" }}>
                        STEP {step.num}
                      </p>
                      <h3 className="fw-semibold mt-1 mb-2" style={{ fontSize: 16, color: "#1A1D23" }}>
                        {step.title}
                      </h3>
                      <p className="mb-0" style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pro tips */}
          <div className="card border-0 mt-4" style={{ borderRadius: 12, borderLeft: "3px solid #2B7A87", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="card-body p-4">
              <h3 className="fw-semibold mb-3" style={{ fontSize: 16, color: "#1A1D23" }}>
                <i className="bi bi-lightbulb me-2" style={{ color: "#2B7A87" }} />
                Pro Tips
              </h3>
              <ul className="mb-0 ps-3" style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.8 }}>
                <li><strong>Activate Training Mode Early:</strong> Turn this on during your first few runs to submit each answer and view detailed rationale right after submission.</li>
                <li><strong>Flag Now, Answer Later:</strong> Don&apos;t let tough questions eat up your clock. Flag them to jump back easily before finalizing your test submission.</li>
                <li><strong>Monitor Your Analytics:</strong> Consistently track your Performance dashboard to target and fix weak domains before actual exam day.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
