"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { apiUrl } from "../../lib/api";
import { BrandLogo } from "../../app/components/BrandLogo";
import { MobileBottomNav } from "../../app/components/MobileBottomNav";
import { ExamProvider, useExam } from "./ExamContext";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-vh-100" style={{ background: "#F5F6F8" }} />}>
      <ExamProvider>
        <StudentLayoutInner>{children}</StudentLayoutInner>
      </ExamProvider>
    </Suspense>
  );
}

function StudentLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const { enrollments, selectedExamSlug, setSelectedExamSlug, currentEnrollment, user } = useExam();

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showUserMenu]);

  const navLinks = [
    { href: "/me/dashboard", label: "Dashboard", icon: "bi-speedometer2" },
    { href: "/me/exams", label: "My Exams", icon: "bi-journal-text" },
    { href: "/me/performance", label: "Performance", icon: "bi-graph-up" },
  ];

  function handleSignOut() {
    window.location.href = `${apiUrl}/api/auth/signout`;
  }

  return (
    <div className="min-vh-100 d-flex flex-column has-bottom-nav" style={{ background: "#F5F6F8" }}>
      <nav
        className="navbar navbar-expand-md bg-white student-topnav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1030,
          height: collapsed ? 64 : undefined,
          minHeight: 64,
          transition: "box-shadow 0.2s ease",
          boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.08)" : "none",
          borderBottom: scrolled ? "none" : "1px solid #E5E7EB",
        }}
      >
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center py-0" href="/">
            <BrandLogo size="compact" />
          </Link>

          <button
            className="navbar-toggler border-0"
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Toggle navigation"
          >
            <i className={`bi ${collapsed ? "bi-list" : "bi-x-lg"}`} style={{ fontSize: 22, color: "#3D4149" }} />
          </button>

          <div className={`collapse navbar-collapse${collapsed ? "" : " show"}`}>
            <ul className="navbar-nav ms-4 me-auto gap-0">
              {navLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <li className="nav-item" key={link.href}>
                    <Link
                      className="nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-2 small fw-medium text-decoration-none"
                      style={{
                        color: active ? "#E8792B" : "#3D4149",
                        background: active ? "#FFF3EB" : "transparent",
                        transition: "background 0.15s ease, color 0.15s ease",
                      }}
                      href={link.href}
                      onClick={() => setCollapsed(true)}
                    >
                      <i className={`bi ${link.icon}`} style={{ fontSize: 15 }} />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Exam Selector */}
            {enrollments.length > 0 && currentEnrollment && (
              <div className="d-flex align-items-center me-3">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none p-0 d-flex align-items-center gap-2"
                  onClick={() => setShowExamModal(true)}
                  title="Click to change exam"
                >
                  <i className="bi bi-journal-bookmark-fill" style={{ color: "#E8792B", fontSize: 16 }} />
                  <span className="fw-semibold" style={{ color: "#1A1D23", fontSize: 14 }}>
                    {currentEnrollment.productTitle}
                  </span>
                  <i className="bi bi-chevron-down small" style={{ color: "#6B7280" }} />
                </button>
              </div>
            )}

            {/* User Menu */}
            <div className="user-menu-container position-relative">
              <button
                type="button"
                className="btn btn-sm fw-medium px-3 d-flex align-items-center gap-2 border rounded-pill"
                style={{ borderColor: "#E5E7EB", background: "#fff" }}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span style={{ color: "#1A1D23", maxWidth: 120 }} className="text-truncate d-none d-md-block">
                  {user?.fullName || user?.email || "User"}
                </span>
                <i className="bi bi-chevron-down" style={{ fontSize: 10, color: "#6B7280" }} />
              </button>
              
              {showUserMenu && (
                <div 
                  className="position-absolute end-0 mt-2 bg-white rounded-3 py-1"
                  style={{ 
                    zIndex: 1100, 
                    minWidth: 180, 
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12)", 
                    border: "1px solid #E5E7EB" 
                  }}
                >
                  <div className="px-3 py-2 border-bottom" style={{ borderColor: "#E5E7EB" }}>
                    <div className="fw-semibold small" style={{ color: "#1A1D23" }}>{user?.fullName || "User"}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{user?.email}</div>
                  </div>
                  <Link
                    href="/me/dashboard"
                    className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                    style={{ color: "#3D4149" }}
                    onClick={() => { setShowUserMenu(false); setCollapsed(true); }}
                  >
                    <i className="bi bi-speedometer2" style={{ color: "#E8792B" }} />
                    Dashboard
                  </Link>
                  <Link
                    href="/me/exams"
                    className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                    style={{ color: "#3D4149" }}
                    onClick={() => { setShowUserMenu(false); setCollapsed(true); }}
                  >
                    <i className="bi bi-journal-text" style={{ color: "#2B7A87" }} />
                    My Exams
                  </Link>
                  <Link
                    href="/me/performance"
                    className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                    style={{ color: "#3D4149" }}
                    onClick={() => { setShowUserMenu(false); setCollapsed(true); }}
                  >
                    <i className="bi bi-graph-up" style={{ color: "#2B7A87" }} />
                    Performance
                  </Link>
                  <hr className="my-1" style={{ borderColor: "#E5E7EB" }} />
                  <Link
                    href="/me/account"
                    className="d-flex align-items-center gap-2 px-3 py-2 small text-decoration-none"
                    style={{ color: "#3D4149" }}
                    onClick={() => { setShowUserMenu(false); setCollapsed(true); }}
                  >
                    <i className="bi bi-person-circle" style={{ color: "#E8792B" }} />
                    My Account
                  </Link>
                  <button
                    type="button"
                    className="d-flex align-items-center gap-2 px-3 py-2 small w-100 border-0 bg-transparent"
                    style={{ color: "#DC2626", cursor: "pointer" }}
                    onClick={handleSignOut}
                  >
                    <i className="bi bi-box-arrow-right" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div style={{ flex: 1 }}>{children}</div>
      {/* Exam Selection Modal */}
      {showExamModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 2000 }}
          onClick={() => setShowExamModal(false)}
        >
          <div 
            className="bg-white rounded-3 p-4"
            style={{ maxWidth: 400, width: "90%", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0" style={{ color: "#1A1D23" }}>
                <i className="bi bi-journal-bookmark me-2" style={{ color: "#E8792B" }} />
                Select Exam
              </h5>
              <button 
                type="button" 
                className="btn btn-sm btn-link text-muted"
                onClick={() => setShowExamModal(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <p className="text-muted small mb-3">Choose which exam pack to view:</p>
            <div className="d-grid gap-2">
              {enrollments.map((en) => (
                <button
                  key={en.id}
                  type="button"
                  className={`btn btn-outline-${selectedExamSlug === en.productSlug ? "primary" : "secondary"} text-start d-flex align-items-center gap-2`}
                  style={{ 
                    borderColor: selectedExamSlug === en.productSlug ? "#E8792B" : "#E5E7EB",
                    background: selectedExamSlug === en.productSlug ? "#FFF3EB" : "transparent",
                    color: selectedExamSlug === en.productSlug ? "#C9621A" : "#3D4149"
                  }}
                  onClick={() => {
                    setSelectedExamSlug(en.productSlug);
                    setShowExamModal(false);
                  }}
                >
                  <i className="bi bi-journal-text" />
                  <span>{en.productTitle}</span>
                  {selectedExamSlug === en.productSlug && (
                    <i className="bi bi-check-circle-fill ms-auto" style={{ color: "#E8792B" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="d-none d-md-block" style={{ background: "#1A1D23", color: "#9CA3AF", fontSize: 12, padding: "20px 0", textAlign: "center" }}>
        <div className="container">
          &copy; {new Date().getFullYear()} PM Advance Sdn Bhd &middot; PMI Authorized Training Partner #4930
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
