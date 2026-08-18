"use client";

import { useState, useCallback, useMemo } from "react";
import { browserApiFetch } from "../../../lib/api";
import { StatusBadge } from "../../components/admin/StatusBadge";
import type { AdminAuditLog } from "../../../lib/admin-api";

interface AuditContentProps {
  initialAuditLogs: AdminAuditLog[];
}

export function AuditContent({ initialAuditLogs }: AuditContentProps) {
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(initialAuditLogs);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const refreshAuditLogs = useCallback(async () => {
    try {
      const data = await browserApiFetch<AdminAuditLog[]>(
        "/api/admin/audit-logs?limit=30",
      );
      setAuditLogs(data);
    } catch {
      // Non-critical
    }
  }, []);

  const actionOptions = useMemo(() => {
    const keys = new Set(auditLogs.map((l) => l.actionKey));
    return Array.from(keys).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return auditLogs.filter((log) => {
      const matchesSearch =
        query === "" ||
        String(log.id).includes(query) ||
        log.actionKey.toLowerCase().includes(query) ||
        (log.actorEmail ?? "").toLowerCase().includes(query) ||
        log.entityType.toLowerCase().includes(query) ||
        log.entityId.toLowerCase().includes(query);
      const matchesAction =
        actionFilter === "all" || log.actionKey === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [auditLogs, searchQuery, actionFilter]);

  return (
    <>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white border-bottom-0">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="search-box">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto", minWidth: 160 }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <button
              className="btn btn-outline-secondary btn-sm ms-auto"
              onClick={refreshAuditLogs}
              disabled={busy}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.slice(0, 30).map((log) => (
                <tr key={log.id}>
                  <td className="text-muted">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "\u2014"}
                  </td>
                  <td>
                    <StatusBadge status={log.actionKey} />
                  </td>
                  <td>
                    {log.actorEmail ?? (
                      <span className="text-muted fst-italic">system</span>
                    )}
                  </td>
                  <td>
                    <span className="text-muted">{log.entityType}</span>:<strong>{log.entityId}</strong>
                  </td>
                  <td>
                    <code className="small text-muted">
                      {log.payload
                        ? JSON.stringify(log.payload).slice(0, 60) +
                          (JSON.stringify(log.payload).length > 60 ? "..." : "")
                        : "\u2014"}
                    </code>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No logs yet
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
