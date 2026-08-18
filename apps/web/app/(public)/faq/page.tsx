"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicNavbar } from "../PublicNavbar";
import { Footer } from "../Footer";

const faqItems = [
  {
    question: "How long do I get access after purchase?",
    answer: "Each product grants access for the number of days listed on the product card. Access starts once payment is confirmed.",
    icon: "bi-clock",
  },
  {
    question: "Can I pause and resume a timed attempt?",
    answer: "Yes. You can save a test in progress and resume it later from your dashboard.",
    icon: "bi-pause-circle",
  },
  {
    question: "Do I get explanations for each question?",
    answer: "Yes. Comprehensive answer rationales are provided for every single question. You can view them after submitting an answer while practicing in Training Mode, or review them all after test completion in Review Mode.",
    icon: "bi-lightbulb",
  },
  {
    question: "What happens if my payment fails?",
    answer: "If your transaction fails, your order status will remain marked as Pending or Failed. You can retry the checkout process from your account dashboard or initiate a fresh order from the catalog.",
    icon: "bi-credit-card",
  },
  {
    question: "Is this platform PMI-authorized?",
    answer: "Yes. PM Advance Sdn Bhd is an official PMI Authorized Training Partner (ATP #4930). All of our exam simulators and practice questions are meticulously aligned with the latest global PMI Examination Content Outline (ECO).",
    icon: "bi-patch-check",
  },
  {
    question: "Can I access my account from multiple devices?",
    answer: "Yes, you can log in from any device, and your progress will sync automatically. However, to protect account security and prevent unauthorized access, only one active session is allowed at a time. Logging into a new device will automatically log out your account from any previous device.",
    icon: "bi-laptop",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <>
      <PublicNavbar />
      <main style={{ background: "#F3F4F6", minHeight: "100vh" }}>
        <div className="container py-5 animate-in">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
            <div>
              <p className="text-uppercase fw-semibold mb-2" style={{ fontSize: 12, letterSpacing: "0.18em", color: "#2B7A87" }}>
                Help center
              </p>
              <h1 className="fw-bold mb-0" style={{ fontSize: "1.875rem", color: "#1A1D23" }}>
                Frequently Asked Questions
              </h1>
            </div>
            <Link
              href="/"
              className="fw-semibold text-decoration-none d-flex align-items-center gap-1"
              style={{ color: "#2B7A87", fontSize: 14 }}
            >
              <i className="bi bi-arrow-left" style={{ fontSize: 14 }} />
              Back home
            </Link>
          </div>

          {/* Accordion */}
          <div className="accordion" id="faqAccordion">
            {faqItems.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div className="accordion-item border-0 mb-2 rounded-3 overflow-hidden" key={i} style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <h2 className="accordion-header">
                    <button
                      className={`accordion-button ${isOpen ? "" : "collapsed"} fw-semibold`}
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      style={{ fontSize: 15, color: "#1A1D23", background: "#fff" }}
                    >
                      <i className={`bi ${item.icon} me-3 flex-shrink-0`} style={{ color: "#E8792B", fontSize: 18 }} />
                      {item.question}
                    </button>
                  </h2>
                  <div
                    className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}
                  >
                    <div className="accordion-body" style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, paddingLeft: 52 }}>
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="card border-0 mt-4 text-center" style={{ background: "#FFF3EB", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="card-body py-4">
              <p className="fw-semibold mb-1" style={{ color: "#1A1D23", fontSize: 16 }}>
                Still have questions?
              </p>
              <p className="mb-3" style={{ color: "#6B7280", fontSize: 13 }}>
                Reach out to our support team and we&apos;ll get back to you within 24 hours.
              </p>
              <a href="mailto:support@pmadvance.com" className="btn fw-semibold px-4" style={{ background: "#E8792B", color: "#fff", borderRadius: 8, fontSize: 14 }}>
                <i className="bi bi-envelope me-2" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
