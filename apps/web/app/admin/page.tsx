import { Suspense } from "react";
import {
  getDashboard,
  getAdminOrders,
  getAdminAuditLogs,
} from "../../lib/admin-api";
import { StatCardsGrid } from "../components/admin/StatCard";
import { RecentOrdersTable, RecentAuditLogsTable } from "../components/admin/ActivityFeed";

export default async function AdminDashboardPage() {
  const [snapshot, orders, auditLogs] = await Promise.all([
    getDashboard(),
    getAdminOrders(),
    getAdminAuditLogs(),
  ]);

  return (
    <>
      {/* Page Header */}
      <h1 className="page-title">Dashboard Overview</h1>
      <p className="page-subtitle">Welcome back! Here&apos;s what&apos;s happening with your platform today.</p>

      {/* Stats Grid */}
      <div style={{ marginBottom: 32 }}>
        <StatCardsGrid
          stats={[
            {
              label: "Revenue (USD)",
              value: "USD " + snapshot.revenueUsd,
              icon: "bi-currency-dollar",
              color: "orange",
              change: "vs last month",
              changeType: "positive",
            },
            {
              label: "Active Subscriptions",
              value: snapshot.activeSubscriptions,
              icon: "bi-bookmark-check",
              color: "teal",
              change: "new this week",
              changeType: "positive",
            },
            {
              label: "Questions in Library",
              value: snapshot.totalQuestions ?? 0,
              icon: "bi-journal-text",
              color: "green",
              change: "total count",
              changeType: "positive",
            },
            {
              label: "Expiring Soon",
              value: snapshot.expiringSoon,
              icon: "bi-exclamation-triangle",
              color: "purple",
              change: "Action needed",
              changeType: "negative",
            },
          ]}
        />
      </div>

      {/* Content Grid */}
      <div className="content-grid" style={{ marginTop: 32, marginBottom: 32 }}>
        {/* Recent Activity */}
        <RecentOrdersTable orders={orders} limit={5} />

        {/* Quick Actions */}
        <div className="card border-0 p-4" style={{ marginBottom: 0 }}>
          <div className="admin-card-title mb-3">Quick Actions</div>
          <div className="quick-actions">
            <a href="/admin/users" className="action-btn">
              <i className="bi bi-person-plus" style={{ color: "var(--primary)" }}></i>
              Add New User
            </a>
            <a href="/admin/questions" className="action-btn">
              <i className="bi bi-file-earmark-arrow-up" style={{ color: "var(--primary)" }}></i>
              Import Questions
            </a>
            <a href="/admin/vouchers" className="action-btn">
              <i className="bi bi-ticket-perforated" style={{ color: "var(--primary)" }}></i>
              Create Voucher
            </a>
            <a href="/admin/products" className="action-btn">
              <i className="bi bi-box-seam" style={{ color: "var(--primary)" }}></i>
              Add Product
            </a>
            <a href="/admin/organizations" className="action-btn">
              <i className="bi bi-building" style={{ color: "var(--primary)" }}></i>
              New Organization
            </a>
            <a href="/admin/referrals" className="action-btn">
              <i className="bi bi-share" style={{ color: "var(--primary)" }}></i>
              View Referrals
            </a>
          </div>
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div style={{ marginBottom: 32 }}>
        <RecentAuditLogsTable auditLogs={auditLogs} limit={5} />
      </div>
    </>
  );
}
