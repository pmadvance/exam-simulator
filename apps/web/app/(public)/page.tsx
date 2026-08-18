import Link from "next/link";

import { getProducts } from "../../lib/api";
import { PublicNavbar } from "./PublicNavbar";
import { CatalogSection } from "./CatalogSection";
import { Footer } from "./Footer";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <main>
      <PublicNavbar />

      {/* ── Hero ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #1A1D23 0%, #2A1E14 40%, #3D2415 70%, #1A1D23 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-30%",
            right: "-10%",
            width: "60%",
            height: "140%",
            background: "radial-gradient(ellipse at center, rgba(232,121,43,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="container py-5" style={{ position: "relative" }}>
          <div className="row align-items-center g-5 py-lg-4">
            <div className="col-lg-7">
              <div
                className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill mb-4"
                style={{ background: "rgba(232,121,43,0.15)", border: "1px solid rgba(232,121,43,0.25)" }}
              >
                <i className="bi bi-award-fill" style={{ color: "#F4A261", fontSize: 14 }} />
                <span style={{ color: "#F4A261", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>
                  PMI Authorized Training Partner #4930
                </span>
              </div>

              <h1
                className="fw-bold text-white mb-3"
                style={{ fontSize: "clamp(2.2rem, 5vw, 3.25rem)", lineHeight: 1.12, letterSpacing: "-0.025em" }}
              >
                Pass Your Project Management Exam on the First Attempt.
              </h1>

              <p className="mb-4" style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem", lineHeight: 1.65, maxWidth: "52ch" }}>
                Don&apos;t risk costly retake fees. Master the exact logic of the PMP®, CAPM®, PMI-RMP®, and PMI-ACP® exams with realistic timed simulations, instant explanations, and 15+ years of PM Advance expertise.
              </p>

              <div className="d-flex gap-3 flex-wrap mb-4">
                <Link
                  href="/login"
                  className="btn btn-lg fw-semibold px-4 text-white d-flex align-items-center gap-2"
                  style={{ background: "#E8792B", borderRadius: 10, border: "none", fontSize: 16 }}
                >
                  Start Free Practice Exam
                  <i className="bi bi-arrow-right" />
                </Link>
                <a
                  href="#catalog"
                  className="btn btn-lg px-4 d-flex align-items-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.8)",
                    borderRadius: 10,
                    fontSize: 16,
                  }}
                >
                  View Exam Packs
                </a>
              </div>

              {/* Micro trust signals */}
              <div className="d-flex flex-wrap gap-4" style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
                <span className="d-flex align-items-center gap-1">
                  <i className="bi bi-shield-check" style={{ color: "#2B7A87" }} /> Instant access
                </span>
                <span className="d-flex align-items-center gap-1">
                  <i className="bi bi-clock" style={{ color: "#2B7A87" }} /> Timed simulations
                </span>
                <span className="d-flex align-items-center gap-1">
                  <i className="bi bi-bar-chart-line" style={{ color: "#2B7A87" }} /> Performance tracking
                </span>
              </div>
            </div>

            {/* Right side — feature highlights card */}
            <div className="col-lg-5">
              <div
                className="rounded-4 p-4"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <h6 className="fw-bold mb-3" style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  <i className="bi bi-lightning-charge-fill me-1" style={{ color: "#E8792B" }} />
                  Why Trust PM Advance?
                </h6>
                <ul className="list-unstyled d-grid gap-3 mb-0">
                  {[
                    { icon: "bi-patch-check", text: "100% Aligned with PMI Standards - Official Training Partner #4930." },
                    { icon: "bi-people", text: "3,000+ Malaysian Graduates Trained - 15+ years of proven certification excellence." },
                    { icon: "bi-cash-coin", text: "100% HRDCorp Claimable - Fully eligible for corporate/employer sponsorship." },
                    { icon: "bi-graph-up-arrow", text: "Smart Performance Analytics - Pinpoint your weaknesses before buying the real exam." },
                    { icon: "bi-lightbulb", text: "Detailed Answer Explanations - Learn why an answer is right or wrong instantly." },
                  ].map((item) => (
                    <li key={item.text} className="d-flex align-items-start gap-3">
                      <span
                        className="d-inline-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                        style={{ width: 32, height: 32, background: "rgba(232,121,43,0.12)" }}
                      >
                        <i className={`bi ${item.icon}`} style={{ color: "#F4A261", fontSize: 15 }} />
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.5 }}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
        <div className="container py-4">
          <div className="row g-4 text-center">
            {[
              { value: "15+", label: "Years of Excellence", icon: "bi-calendar-check" },
              { value: "3,000+", label: "Graduates Trained", icon: "bi-mortarboard" },
              { value: "1,000+", label: "Real-Exam Style Questions", icon: "bi-book" },
              { value: "ATP #4930", label: "PMI Authorized", icon: "bi-patch-check" },
            ].map((stat) => (
              <div className="col-6 col-md-3" key={stat.label}>
                <div className="d-flex flex-column align-items-center gap-1">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-3 mb-2"
                    style={{ width: 44, height: 44, background: "#FFF3EB" }}
                  >
                    <i className={`bi ${stat.icon}`} style={{ color: "#E8792B", fontSize: 20 }} />
                  </div>
                  <span className="fw-bold" style={{ fontSize: "1.5rem", color: "#1A1D23", letterSpacing: "-0.02em" }}>
                    {stat.value}
                  </span>
                  <span style={{ color: "#6B7280", fontSize: 13 }}>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ background: "#F9FAFB" }}>
        <div className="container py-5">
          <div className="text-center mb-5">
            <span
              className="d-inline-block px-3 py-1 rounded-pill mb-3 fw-semibold"
              style={{ background: "#E6F4F6", color: "#2B7A87", fontSize: 12, letterSpacing: "0.06em" }}
            >
              HOW IT WORKS
            </span>
            <h2 className="fw-bold" style={{ color: "#1A1D23" }}>Start practising in 3 steps</h2>
            <p style={{ color: "#6B7280", maxWidth: "48ch", margin: "8px auto 0" }}>
              From purchase to performance review — everything you need in one platform.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {[
              {
                step: "01",
                title: "Choose Your Exam",
                desc: "Select the certification you’re targeting (PMP®, CAPM®, PMI-RMP®, or PMI-ACP®) and create your free account in less than a minute.",
                icon: "bi-bag-check",
                color: "#E8792B",
                bg: "#FFF3EB",
              },
              {
                step: "02",
                title: "Practice in Real-Exam Mode",
                desc: "Experience realistic, timed simulations featuring an authentic test interface equipped with countdown timers, question flagging, and strikethrough tools.",
                icon: "bi-stopwatch",
                color: "#2B7A87",
                bg: "#E6F4F6",
              },
              {
                step: "03",
                title: "Analyze & Pass With Confidence",
                desc: "Study detailed, instant rationales for every right and wrong answer. Track your performance analytics to pinpoint exactly where to improve before test day.",
                icon: "bi-graph-up-arrow",
                color: "#059669",
                bg: "#ECFDF5",
              },
            ].map((item) => (
              <div className="col-md-4" key={item.step}>
                <div
                  className="h-100 rounded-4 p-4 d-flex flex-column"
                  style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
                >
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 48, height: 48, background: item.bg, flexShrink: 0 }}
                    >
                      <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: 22 }} />
                    </span>
                    <span style={{ color: "#D1D5DB", fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
                      {item.step}
                    </span>
                  </div>
                  <h5 className="fw-bold mb-2" style={{ color: "#1A1D23" }}>{item.title}</h5>
                  <p className="mb-0" style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Link
              href="#catalog"
              className="fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
              style={{ color: "#2B7A87", fontSize: 14 }}
            >
              Explore Practice Simulators <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      {/* Catalog with cart */}
      <CatalogSection products={products} />

      <Footer />
    </main>
  );
}
