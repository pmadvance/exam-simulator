"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserApiFetch, type EnrollmentSummary, type ProductCard } from "../../lib/api";
import { PriceDisplay } from "../components/PriceDisplay";

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

const difficultyColor: Record<string, { bg: string; fg: string }> = {
  Beginner: { bg: "#ECFDF5", fg: "#059669" },
  Intermediate: { bg: "#FFF3EB", fg: "#E8792B" },
  Advanced: { bg: "#FEF2F2", fg: "#DC2626" },
};

export function CatalogSection({ products }: { products: ProductCard[] }) {
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const data = await browserApiFetch<EnrollmentSummary[]>("/api/enrollments");
        if (!cancelled && Array.isArray(data)) {
          setEnrollments(data.filter((e) => e.status === "active" && new Date(e.expiresAt) > new Date()));
        }
      } catch { /* not logged in */ }
    }
    void check();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ["All", ...cats];
  }, [products]);

  const filtered = activeCategory === "All"
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <section id="catalog" style={{ background: "#FFFFFF" }}>
      <div className="container py-5">
        {/* Section header */}
        <div className="text-center mb-5">
          <span
            className="d-inline-block px-3 py-1 rounded-pill mb-3 fw-semibold"
            style={{ background: "#FFF3EB", color: "#E8792B", fontSize: 12, letterSpacing: "0.06em" }}
          >
            CATALOG
          </span>
          <h2 className="fw-bold" style={{ color: "#1A1D23", letterSpacing: "-0.02em" }}>
            Choose Your Exam Pack
          </h2>
          <p style={{ color: "#6B7280", maxWidth: "44ch", margin: "8px auto 0" }}>
            Get instant access and start practicing immediately. One-time payment, zero recurring subscription fees.
          </p>
        </div>

        <div className="row g-2 justify-content-center mb-4">
          {[
            "1,000+ Question Bank",
            "Complete ECO Coverage",
            "Real-Exam Timed Simulations",
            "Detailed Explanations & Rationales",
            "Companion tool for PM Advance 5-day bootcamp graduates",
          ].map((feature) => (
            <div className="col-sm-6 col-lg-auto" key={feature}>
              <div
                className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 h-100"
                style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#3D4149", fontSize: 13 }}
              >
                <i className="bi bi-check2-circle" style={{ color: "#059669" }} />
                <span>{feature}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Category filter pills */}
        {categories.length > 2 && (
          <div className="d-flex justify-content-center mb-4">
            <div className="d-inline-flex gap-2 p-1 rounded-pill" style={{ background: "#F3F4F6" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="border-0 px-3 py-2 rounded-pill small fw-semibold"
                  style={{
                    background: activeCategory === cat ? "#FFFFFF" : "transparent",
                    color: activeCategory === cat ? "#E8792B" : "#6B7280",
                    boxShadow: activeCategory === cat ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                  {cat !== "All" && (
                    <span
                      className="ms-1"
                      style={{
                        fontSize: 11,
                        color: activeCategory === cat ? "#E8792B" : "#9CA3AF",
                        fontWeight: 400,
                      }}
                    >
                      ({products.filter((p) => p.category === cat).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product cards */}
        <div className="row g-4 justify-content-center">
          {filtered.map((product) => {
            const enrollment = enrollments.find((e) => e.productSlug === product.slug);
            const remaining = enrollment ? daysUntil(enrollment.expiresAt) : 0;
            const diff = difficultyColor[product.difficulty] ?? { bg: "#F3F4F6", fg: "#6B7280" };

            return (
              <div className="col-md-6 col-lg-4" key={product.slug}>
                <div
                  className="h-100 d-flex flex-column rounded-4 overflow-hidden"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    transition: "box-shadow 0.2s ease, transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.08)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {/* Card header accent */}
                  <div style={{ height: 3, background: enrollment ? "#059669" : "#E8792B" }} />

                  <div className="p-4 d-flex flex-column flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span
                        className="px-2 py-1 rounded-2 fw-semibold"
                        style={{ fontSize: 11, letterSpacing: "0.04em", background: "#FFF3EB", color: "#E8792B" }}
                      >
                        {product.category}
                      </span>
                      <span
                        className="px-2 py-1 rounded-2 fw-semibold"
                        style={{ fontSize: 11, letterSpacing: "0.04em", background: diff.bg, color: diff.fg }}
                      >
                        {product.difficulty}
                      </span>
                    </div>

                    <h5 className="fw-bold mb-2" style={{ color: "#1A1D23", fontSize: "1.1rem" }}>
                      {product.title}
                    </h5>
                    <p className="flex-grow-1 mb-3" style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.55 }}>
                      {product.description}
                    </p>

                    {/* Stats row */}
                    <div
                      className="d-flex gap-3 px-3 py-2 rounded-3 mb-3"
                      style={{ background: "#F9FAFB" }}
                    >
                      <div className="d-flex align-items-center gap-1" style={{ fontSize: 13, color: "#3D4149" }}>
                        <i className="bi bi-clock" style={{ color: "#2B7A87", fontSize: 13 }} />
                        <span className="fw-semibold">{product.accessDays}</span>
                        <span style={{ color: "#9CA3AF" }}>Days Full Access</span>
                      </div>
                    </div>

                    {/* Price + actions */}
                    <div className="d-flex justify-content-between align-items-center pt-3" style={{ borderTop: "1px solid #F3F4F6" }}>
                      <span className="fw-bold" style={{ fontSize: "1.4rem", color: "#1A1D23", letterSpacing: "-0.02em" }}>
                        <PriceDisplay amountUsd={product.priceUsd} localClassName="d-block text-muted fw-medium" />
                      </span>
                      <div className="d-flex gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          className="btn btn-sm fw-medium px-3"
                          style={{ color: "#3D4149", border: "1px solid #D1D5DB", borderRadius: 8 }}
                        >
                          Details
                        </Link>
                        {enrollment ? (
                          <Link
                            href="/me/exams"
                            className="btn btn-sm fw-semibold px-3 text-white"
                            style={{ background: "#059669", borderRadius: 8, border: "none" }}
                          >
                            <i className="bi bi-check-circle-fill me-1" />
                            {remaining}d left
                          </Link>
                        ) : (
                          <Link
                            href={`/checkout?product=${product.slug}`}
                            className="btn btn-sm fw-semibold px-3 text-white"
                            style={{ background: "#E8792B", borderRadius: 8, border: "none" }}
                          >
                            Buy Now
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
