"use client";

import { useState } from "react";
import { StatusBadge } from "../../components/admin/StatusBadge";
import type { SalesReport, EnrollmentReport, AttemptReport } from "../../../lib/admin-api";

type ReportTab = "revenue" | "users" | "exams" | "referrals";

interface ReportsContentProps {
  initialSalesReport: SalesReport[];
  initialEnrollmentReport: EnrollmentReport[];
  initialAttemptReport: AttemptReport[];
}

export function ReportsContent({
  initialSalesReport,
  initialEnrollmentReport,
  initialAttemptReport,
}: ReportsContentProps) {
  const [salesReport] = useState<SalesReport[]>(initialSalesReport);
  const [enrollmentReport] = useState<EnrollmentReport[]>(initialEnrollmentReport);
  const [attemptReport] = useState<AttemptReport[]>(initialAttemptReport);
  const [activeTab, setActiveTab] = useState<ReportTab>("revenue");

  const totalRevenue = salesReport.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = salesReport.reduce((sum, r) => sum + r.orderCount, 0);
  const uniqueProducts = new Set(salesReport.map((r) => r.productTitle)).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const tabs: { key: ReportTab; label: string; icon: string }[] = [
    { key: "revenue", label: "Revenue", icon: "bi-currency-dollar" },
    { key: "users", label: "Users", icon: "bi-people" },
    { key: "exams", label: "Exams", icon: "bi-pencil-square" },
    { key: "referrals", label: "Referrals", icon: "bi-arrow-left-right" },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white">
          <div className="d-flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`btn btn-sm ${
                  activeTab === tab.key
                    ? "btn-primary"
                    : "btn-outline-secondary"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={`bi ${tab.icon} me-1`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Tab */}
      {activeTab === "revenue" && (
        <>
          <div className="stats-grid mb-4">
            <div className="stat-card">
              <div className="stat-icon orange">
                <i className="bi bi-currency-dollar"></i>
              </div>
              <div className="stat-value">USD {totalRevenue.toFixed(2)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon teal">
                <i className="bi bi-cart"></i>
              </div>
              <div className="stat-value">{totalOrders}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <i className="bi bi-box"></i>
              </div>
              <div className="stat-value">{uniqueProducts}</div>
              <div className="stat-label">Products Sold</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <i className="bi bi-receipt"></i>
              </div>
              <div className="stat-value">USD {avgOrderValue.toFixed(2)}</div>
              <div className="stat-label">Avg Order Value</div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-currency-dollar me-2"></i>Revenue by Product
              </span>
              <a
                className="btn btn-outline-secondary btn-sm"
                href="/api/admin/reports/sales?days=30&format=csv"
                target="_blank"
                rel="noreferrer"
              >
                <i className="bi bi-download me-1"></i>CSV
              </a>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReport.map((r, i) => (
                    <tr key={r.date + "-" + r.productTitle + "-" + i}>
                      <td>{r.date}</td>
                      <td>{r.productTitle}</td>
                      <td>{r.orderCount}</td>
                      <td className="fw-semibold">USD {r.revenue}</td>
                    </tr>
                  ))}
                  {salesReport.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        No sales data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <>
          <div className="chart-container mb-4">
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-bar-chart-line fs-1 mb-2"></i>
              <span>User enrollment chart coming soon</span>
            </div>
          </div>
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-people me-2"></i>Enrollments
              </span>
              <a
                className="btn btn-outline-secondary btn-sm"
                href="/api/admin/reports/enrollments?format=csv"
                target="_blank"
                rel="noreferrer"
              >
                <i className="bi bi-download me-1"></i>CSV
              </a>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>Total</th>
                    <th>Active</th>
                    <th>Expired</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentReport.map((r) => (
                    <tr key={r.productSlug}>
                      <td>{r.productTitle}</td>
                      <td>{r.totalEnrollments}</td>
                      <td>
                        <StatusBadge status="active" />
                        <span className="ms-1">{r.activeCount}</span>
                      </td>
                      <td>
                        <StatusBadge status="expired" />
                        <span className="ms-1">{r.expiredCount}</span>
                      </td>
                    </tr>
                  ))}
                  {enrollmentReport.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Exams Tab */}
      {activeTab === "exams" && (
        <>
          <div className="chart-container mb-4">
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-bar-chart-line fs-1 mb-2"></i>
              <span>Exam attempt chart coming soon</span>
            </div>
          </div>
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-pencil-square me-2"></i>Attempt Analysis
              </span>
              <a
                className="btn btn-outline-secondary btn-sm"
                href="/api/admin/reports/attempts?format=csv"
                target="_blank"
                rel="noreferrer"
              >
                <i className="bi bi-download me-1"></i>CSV
              </a>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Exam</th>
                    <th>Total</th>
                    <th>Completed</th>
                    <th>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptReport.map((r) => (
                    <tr key={r.examSlug}>
                      <td>{r.examTitle}</td>
                      <td>{r.totalAttempts}</td>
                      <td>{r.completedAttempts}</td>
                      <td className="fw-semibold">
                        {r.avgScore ?? "\u2014"}%
                      </td>
                    </tr>
                  ))}
                  {attemptReport.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Referrals Tab */}
      {activeTab === "referrals" && (
        <div className="chart-container">
          <div className="d-flex flex-column align-items-center">
            <i className="bi bi-bar-chart-line fs-1 mb-2"></i>
            <span>Referral analytics chart coming soon</span>
          </div>
        </div>
      )}
    </>
  );
}
