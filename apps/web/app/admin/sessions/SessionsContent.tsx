"use client";

import { useState, useCallback, useMemo } from "react";
import { browserApiFetch } from "../../../lib/api";
import { StatusBadge } from "../../components/admin/StatusBadge";
import type { AdminSession } from "../../../lib/admin-api";

interface SessionsContentProps {
  initialSessions: AdminSession[];
}

export function SessionsContent({ initialSessions }: SessionsContentProps) {
  const [sessions, setSessions] = useState<AdminSession[]>(initialSessions);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const active = sessions.filter((s) => !s.revokedAt).length;
    const revoked = sessions.filter((s) => s.revokedAt).length;
    return { active, total: sessions.length, revoked };
  }, [sessions]);

  const refreshSessions = useCallback(async () => {
    try {
      const data = await browserApiFetch<AdminSession[]>("/api/admin/sessions");
      setSessions(data);
    } catch {
      // Non-critical
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    setBusy(true);
    try {
      await browserApiFetch<void>("/api/admin/sessions/" + sessionId, {
        method: "DELETE",
      });
      await refreshSessions();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to revoke session.");
    } finally {
      setBusy(false);
    }
  }, [refreshSessions]);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">—</div>
          <div className="stat-label">Student Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">—</div>
          <div className="stat-label">Admin Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">—</div>
          <div className="stat-label">In Exam</div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <span className="fw-bold">
            <i className="bi bi-wifi me-2"></i>Active Sessions
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={refreshSessions}
            disabled={busy}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>IP Address</th>
                <th>Started</th>
                <th>Last Active</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 15).map((s) => (
                <tr
                  key={s.id}
                  className={s.revokedAt ? "table-secondary" : ""}
                >
                  <td>{s.email}</td>
                  <td>
                    <StatusBadge status={(s as unknown as { role?: string }).role ?? "unknown"} />
                  </td>
                  <td>
                    <code className="small">{s.ipAddress ?? "\u2014"}</code>
                  </td>
                  <td className="text-muted">
                    {s.issuedAt
                      ? new Date(s.issuedAt).toLocaleString()
                      : "\u2014"}
                  </td>
                  <td className="text-muted">
                    {s.expiresAt
                      ? new Date(s.expiresAt).toLocaleString()
                      : "\u2014"}
                  </td>
                  <td className="text-end">
                    <button
                      className={
                        "btn btn-sm " +
                        (s.revokedAt
                          ? "btn-outline-secondary"
                          : "btn-outline-danger")
                      }
                      onClick={() => revokeSession(s.id)}
                      disabled={busy || Boolean(s.revokedAt)}
                    >
                      {s.revokedAt ? "Revoked" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No sessions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
