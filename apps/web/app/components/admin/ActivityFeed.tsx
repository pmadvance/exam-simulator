"use client";

import React from "react";
import { StatusBadge } from "./StatusBadge";
import type { AdminOrder, AdminAuditLog } from "../../../lib/admin-api";

interface RecentOrdersTableProps {
  orders: AdminOrder[];
  limit?: number;
}

const STATUS_ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  paid: { icon: "bi-check-lg", color: "#059669", bg: "#ECFDF5" },
  pending: { icon: "bi-clock", color: "#D97706", bg: "#FEF3C7" },
  failed: { icon: "bi-x-lg", color: "#DC2626", bg: "#FEE2E2" },
};

function ActivityIcon({ status }: { status: string }) {
  const style = STATUS_ICON_MAP[status.toLowerCase()] ?? { icon: "bi-receipt", color: "#2B7A87", bg: "#E6F4F6" };
  return (
    <div className="activity-icon" style={{ background: style.bg, color: style.color }}>
      <i className={`bi ${style.icon}`}></i>
    </div>
  );
}

export function RecentOrdersTable({ orders, limit = 5 }: RecentOrdersTableProps) {
  const displayOrders = orders.slice(0, limit);

  return (
    <div className="card border-0 p-4" style={{ marginBottom: 0 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div className="admin-card-title">Recent Orders</div>
          <div className="admin-card-subtitle">Latest customer transactions</div>
        </div>
        <a href="/admin/orders" className="btn btn-sm btn-outline">View All</a>
      </div>
      <div className="activity-list">
        {displayOrders.map((o) => (
          <div className="activity-item" key={o.id}>
            <ActivityIcon status={o.status} />
            <div className="activity-content">
              <div className="activity-text">
                <strong>New order</strong> #{o.id} for {o.productTitle || "Unknown"}
              </div>
              <div className="activity-time">
                USD {o.totalAmount} • {o.userEmail}
              </div>
            </div>
            <div>
              <StatusBadge status={o.status} />
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-icon">🛒</div>
            <div className="empty-title">No orders yet</div>
            <div className="empty-text">Orders will appear here once customers start purchasing.</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RecentAuditLogsTableProps {
  auditLogs: AdminAuditLog[];
  limit?: number;
}

const ACTION_ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  "user.created": { icon: "bi-person-plus", color: "#059669", bg: "#ECFDF5" },
  "voucher.created": { icon: "bi-ticket-perforated", color: "#7C3AED", bg: "#F3E8FF" },
  "order.reconcile": { icon: "bi-arrow-repeat", color: "#D97706", bg: "#FEF3C7" },
  "organization.created": { icon: "bi-building", color: "#2B7A87", bg: "#E6F4F6" },
  "referral.rewarded": { icon: "bi-gift", color: "#E8792B", bg: "#FFF3EB" },
  "user.suspended": { icon: "bi-person-x", color: "#DC2626", bg: "#FEE2E2" },
};

function AuditIcon({ actionKey }: { actionKey: string }) {
  const style = ACTION_ICON_MAP[actionKey.toLowerCase()] ?? { icon: "bi-list-check", color: "#6B7280", bg: "#F3F4F6" };
  return (
    <div className="activity-icon" style={{ background: style.bg, color: style.color }}>
      <i className={`bi ${style.icon}`}></i>
    </div>
  );
}

export function RecentAuditLogsTable({ auditLogs, limit = 5 }: RecentAuditLogsTableProps) {
  const displayLogs = auditLogs.slice(0, limit);

  return (
    <div className="card border-0 p-4" style={{ marginBottom: 0 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <div className="admin-card-title">Recent Activity</div>
          <div className="admin-card-subtitle">Latest actions across the platform</div>
        </div>
        <a href="/admin/audit" className="btn btn-sm btn-outline">View All</a>
      </div>
      <div className="activity-list">
        {displayLogs.map((log) => (
          <div className="activity-item" key={log.id}>
            <AuditIcon actionKey={log.actionKey} />
            <div className="activity-content">
              <div className="activity-text">
                <strong>{log.actionKey}</strong> — {log.entityType}:{log.entityId}
              </div>
              <div className="activity-time">
                {log.actorEmail ?? "system"} • {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : "-"}
              </div>
            </div>
          </div>
        ))}
        {auditLogs.length === 0 && (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-icon">📋</div>
            <div className="empty-title">No activity yet</div>
            <div className="empty-text">Audit logs will appear here once actions are recorded.</div>
          </div>
        )}
      </div>
    </div>
  );
}
