"use client";

import React, { useState, useMemo, useEffect } from "react";
import { StatusBadge } from "./StatusBadge";
import type { AdminUser } from "../../../lib/admin-api";

interface UserManagerProps {
  users: AdminUser[];
  busy: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  roleFilter: string;
  onRoleFilterChange: (r: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  onAddUser: () => void;
  onBulkImport: () => void;
  onRoleChange: (userId: number, userEmail: string, newRole: string) => void;
  onToggleStatus: (userId: number, currentStatus: string) => void;
  onManageAccess?: (user: AdminUser) => void;
  onDeleteUser?: (user: AdminUser) => void;
}

function RoleBadge({ role }: { role: string }) {
  const roleStyles: Record<string, string> = {
    super_admin: "badge-warning-soft",
    admin: "badge-primary-soft",
    content_admin: "badge-accent-soft",
    support_admin: "badge-primary-soft",
    student: "badge-neutral-soft",
  };

  return (
    <span className={`badge ${roleStyles[role] || "badge-neutral-soft"}`}>
      {role}
    </span>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UserManager({
  users,
  busy,
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onAddUser,
  onBulkImport,
  onRoleChange,
  onToggleStatus,
  onManageAccess,
  onDeleteUser,
}: UserManagerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

  const totalPages = Math.ceil(users.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchQuery, roleFilter, statusFilter]);

  return (
    <>
      <div className="toolbar">
        <div className="search-box">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select className="form-select form-select-sm" style={{ width: 140 }} value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)}>
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="content_admin">Content Admin</option>
          <option value="support_admin">Support Admin</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: 140 }} value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onBulkImport}
          disabled={busy}
        >
          <i className="bi bi-upload me-1"></i>Bulk Import
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={onAddUser}
          disabled={busy}
        >
          <i className="bi bi-plus-lg me-1"></i>Add User
        </button>
      </div>

      <div className="card border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: 1180 }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: 170 }}>User</th>
                <th style={{ width: 260 }}>Email</th>
                <th style={{ width: 140 }}>Role</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 260 }}>Access</th>
                <th style={{ width: 120 }}>Joined</th>
                <th style={{ width: 160 }}>Last Remark</th>
                <th className="text-end" style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u.id}>
                  <td className="fw-semibold">{u.fullName || "—"}</td>
                  <td>{u.email}</td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td>
                    {u.enrollments && u.enrollments.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {u.enrollments.slice(0, 2).map((enrollment) => (
                          <span key={enrollment.id} className={`badge ${enrollment.status === "active" ? "badge-primary-soft" : "badge-neutral-soft"}`} title={enrollment.productTitle}>
                            {enrollment.productSlug}
                          </span>
                        ))}
                        {u.enrollments.length > 2 && <span className="badge badge-neutral-soft">+{u.enrollments.length - 2}</span>}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td className="small text-muted" style={{ maxWidth: 150 }}>
                    {u.lastRemark ? (
                      <span className="text-truncate d-inline-block" style={{ maxWidth: 140 }} title={u.lastRemark}>
                        {u.lastRemark}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-end">
                    <div className="d-flex gap-1 justify-content-end">
                    {onManageAccess && (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onManageAccess(u)}
                        disabled={busy}
                      >
                        Access
                      </button>
                    )}
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 132, fontSize: 11 }}
                      value={u.role}
                      onChange={(e) =>
                        onRoleChange(u.id, u.email, e.target.value)
                      }
                      disabled={busy}
                    >
                      <option value="student">student</option>
                      <option value="content_admin">content_admin</option>
                      <option value="support_admin">support_admin</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                    <button
                      className={`btn btn-sm ${
                        u.status === "active"
                          ? "btn-outline-danger"
                          : "btn-outline-success"
                      }`}
                      onClick={() => onToggleStatus(u.id, u.status)}
                      disabled={busy}
                    >
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    {onDeleteUser && (
                      <button
                        className="btn btn-sm btn-danger"
                        title="Delete account (anonymise)"
                        onClick={() => onDeleteUser(u)}
                        disabled={busy}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {users.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="small text-muted">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, users.length)} of {users.length} users
          </div>
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="btn-group">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
