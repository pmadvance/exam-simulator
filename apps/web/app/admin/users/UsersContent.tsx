"use client";

import React, { useState, useCallback } from "react";
import { UserManager } from "../../components/admin/UserManager";
import { AdminModal, PromptModal } from "../components/AdminModal";
import { browserApiFetch } from "../../../lib/api";
import type { AdminUser, AdminProduct, AdminUserDetail } from "../../../lib/admin-api";

type AddUserForm = {
  email: string;
  fullName: string;
  password: string;
  role: string;
  productSlug: string;
  accessDays: string;
  sendWelcomeEmail: boolean;
};

const emptyAddUser: AddUserForm = {
  email: "",
  fullName: "",
  password: "",
  role: "student",
  productSlug: "",
  accessDays: "",
  sendWelcomeEmail: true,
};

type BulkPreview = {
  total: number;
  newUsers: number;
  duplicates: number;
  withEnrollment: number;
  errors: Array<{ row: number; reason: string }>;
  records?: Array<{ rowNumber: number; email: string; importable: boolean; alreadyExists: boolean; productSlug: string | null; productResolved: boolean | null }>;
};

interface UsersContentProps {
  initialUsers: AdminUser[];
  products: AdminProduct[];
}

export function UsersContent({ initialUsers, products }: UsersContentProps) {
  const activeProducts = products.filter((product) => product.visibility === "published");
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [busy, setBusy] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>(emptyAddUser);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkPreview | null>(null);
  const [bulkSendEmail, setBulkSendEmail] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [reasonModal, setReasonModal] = useState<{ open: boolean; title: string; onConfirm: (reason: string) => void }>({ open: false, title: "", onConfirm: () => {} });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [accessUser, setAccessUser] = useState<AdminUser | null>(null);
  const [accessDetail, setAccessDetail] = useState<AdminUserDetail | null>(null);
  const [accessForm, setAccessForm] = useState({ productSlug: "", accessDays: "90" });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const filteredUsers = users.filter((u) => {
    if (searchQuery && !u.email.toLowerCase().includes(searchQuery.toLowerCase()) && !u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  });

  const handleRoleChange = useCallback((userId: number, userEmail: string, newRole: string) => {
    setReasonModal({
      open: true,
      title: `Reason for role change to ${newRole}`,
      onConfirm: async (reason) => {
        setReasonModal((prev) => ({ ...prev, open: false }));
        if (!reason.trim()) return;
        try {
          setBusy(true);
          await browserApiFetch(`/api/admin/users/${userId}/role`, {
            method: "PATCH",
            body: JSON.stringify({ role: newRole, reason }),
          });
          setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, role: newRole } : x)));
          setStatusMessage(`Role updated for ${userEmail}`);
        } catch (err) {
          setStatusMessage(err instanceof Error ? err.message : "Failed to change role");
        } finally {
          setBusy(false);
        }
      },
    });
  }, []);

  const handleToggleStatus = useCallback((userId: number, currentStatus: string) => {
    const next = currentStatus === "active" ? "suspended" : "active";
    setReasonModal({
      open: true,
      title: `Reason for ${next}`,
      onConfirm: async (reason) => {
        setReasonModal((prev) => ({ ...prev, open: false }));
        try {
          setBusy(true);
          const result = await browserApiFetch<{ id: number; status: string; lastRemark?: string }>(`/api/admin/users/${userId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: next, reason: reason.trim() || "Admin action" }),
          });
          setUsers((u) => u.map((x) => (x.id === userId ? { ...x, status: next, lastRemark: result.lastRemark || reason.trim() } : x)));
          setStatusMessage(`User ${userId} is now ${next}.`);
        } catch (error) {
          setStatusMessage(error instanceof Error ? error.message : "Failed to update user status.");
        } finally {
          setBusy(false);
        }
      },
    });
  }, []);

  async function submitAddUser() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        email: addUserForm.email.trim(),
        fullName: addUserForm.fullName.trim(),
        role: addUserForm.role,
        sendWelcomeEmail: addUserForm.sendWelcomeEmail,
      };
      if (addUserForm.password.trim()) body.password = addUserForm.password.trim();
      if (addUserForm.productSlug.trim()) body.productSlug = addUserForm.productSlug.trim();
      if (addUserForm.accessDays.trim()) body.accessDays = Number(addUserForm.accessDays);
      const created = await browserApiFetch<{ id: number; email: string; fullName: string; role: string; generatedPassword?: string }>(
        "/api/admin/users", { method: "POST", body: JSON.stringify(body) }
      );
      setUsers((prev) => [{ id: created.id, email: created.email, fullName: created.fullName, role: created.role, status: "active", createdAt: new Date().toISOString() } as AdminUser, ...prev]);
      const pwNote = created.generatedPassword ? ` (temp password: ${created.generatedPassword})` : "";
      setStatusMessage(`User created: ${created.email}${pwNote}`);
      setShowAddUser(false);
      setAddUserForm(emptyAddUser);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create user");
    } finally { setBusy(false); }
  }

  async function previewBulkUsers() {
    setBusy(true);
    try {
      const data = await browserApiFetch<BulkPreview>("/api/admin/users/import/preview",
        { method: "POST", body: JSON.stringify({ csv: bulkCsv }) });
      setBulkPreview(data);
      if (data.errors.length > 0) {
        setStatusMessage(`Preview found ${data.errors.length} error${data.errors.length === 1 ? "" : "s"}. Fix them before applying.`);
      } else {
        setStatusMessage(`Preview: ${data.newUsers} new, ${data.duplicates} duplicates`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Preview failed");
    } finally { setBusy(false); }
  }

  async function applyBulkUsers() {
    setBusy(true);
    try {
      const data = await browserApiFetch<{ created: number; skipped: number; results?: Array<{ email: string; generatedPassword?: string }> }>(
        "/api/admin/users/import/apply",
        { method: "POST", body: JSON.stringify({ csv: bulkCsv, sendWelcomeEmail: bulkSendEmail }) }
      );
      const generated = data.results?.filter((r) => r.generatedPassword) ?? [];
      const generatedNote = generated.length > 0
        ? ` Generated passwords: ${generated.map((r) => `${r.email}: ${r.generatedPassword}`).join("; ")}`
        : "";
      setStatusMessage(`Bulk import: ${data.created} users created, ${data.skipped} skipped.${generatedNote}`);
      setShowBulkImport(false);
      setBulkCsv("");
      setBulkFileName("");
      setBulkPreview(null);
      const refreshed = await browserApiFetch<AdminUser[]>("/api/admin/users");
      setUsers(refreshed);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Bulk import failed");
    } finally { setBusy(false); }
  }

  async function loadBulkCsvFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
    if (!isCsv) {
      setStatusMessage("Please choose a .csv file.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      setBulkCsv(text);
      setBulkFileName(file.name);
      setBulkPreview(null);
      setStatusMessage(`Loaded CSV file: ${file.name}`);
    } catch {
      setStatusMessage("Could not read the selected CSV file.");
    }
  }

  async function openAccessManager(user: AdminUser) {
    setAccessUser(user);
    setAccessForm({ productSlug: activeProducts[0]?.slug ?? "", accessDays: String(activeProducts[0]?.accessDays ?? 90) });
    setAccessDetail(null);
    try {
      setBusy(true);
      const detail = await browserApiFetch<AdminUserDetail>(`/api/admin/users/${user.id}`);
      setAccessDetail(detail);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to load user access");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAccessUser(userId = accessUser?.id) {
    if (!userId) return;
    const detail = await browserApiFetch<AdminUserDetail>(`/api/admin/users/${userId}`);
    setAccessDetail(detail);
    setUsers((prev) => prev.map((user) => user.id === userId ? { ...user, enrollments: detail.enrollments } : user));
  }

  async function grantAccess() {
    if (!accessUser || !accessForm.productSlug || Number(accessForm.accessDays) <= 0) return;
    try {
      setBusy(true);
      await browserApiFetch(`/api/admin/users/${accessUser.id}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ productSlug: accessForm.productSlug, accessDays: Number(accessForm.accessDays) }),
      });
      await refreshAccessUser(accessUser.id);
      setStatusMessage(`Access updated for ${accessUser.email}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update access");
    } finally {
      setBusy(false);
    }
  }

  async function extendEnrollment(enrollmentId: number, days: number) {
    try {
      setBusy(true);
      await browserApiFetch(`/api/admin/enrollments/${enrollmentId}/extend`, {
        method: "PATCH",
        body: JSON.stringify({ days, reason: `Admin extended access by ${days} days` }),
      });
      await refreshAccessUser();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to extend access");
    } finally {
      setBusy(false);
    }
  }

  async function setEnrollmentStatus(enrollmentId: number, status: "active" | "revoked") {
    try {
      setBusy(true);
      await browserApiFetch(`/api/admin/enrollments/${enrollmentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refreshAccessUser();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update access");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await browserApiFetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setStatusMessage(`Account for ${deleteTarget.email} has been anonymised and deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button type="button" className="btn-close" onClick={() => setStatusMessage("")} />
        </div>
      )}

      <UserManager
        users={filteredUsers}
        busy={busy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddUser={() => setShowAddUser(true)}
        onBulkImport={() => setShowBulkImport(true)}
        onRoleChange={handleRoleChange}
        onToggleStatus={handleToggleStatus}
        onManageAccess={openAccessManager}
        onDeleteUser={(u) => setDeleteTarget(u)}
      />

      <AdminModal
        open={showAddUser}
        title="Add New User"
        onClose={() => setShowAddUser(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowAddUser(false)} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" onClick={submitAddUser} disabled={busy || !addUserForm.email || !addUserForm.fullName}>
              {busy ? "Creating…" : "Create User"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <div>
            <label className="form-label small fw-semibold">Email *</label>
            <input className="form-control form-control-sm" type="email" value={addUserForm.email} onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })} />
          </div>
          <div>
            <label className="form-label small fw-semibold">Full Name *</label>
            <input className="form-control form-control-sm" value={addUserForm.fullName} onChange={(e) => setAddUserForm({ ...addUserForm, fullName: e.target.value })} />
          </div>
          <div>
            <label className="form-label small fw-semibold">Password (leave blank to auto-generate)</label>
            <input className="form-control form-control-sm" type="text" value={addUserForm.password} onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })} />
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">Role</label>
              <select className="form-select form-select-sm" value={addUserForm.role} onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}>
                <option value="student">student</option>
                <option value="content_admin">content_admin</option>
                <option value="support_admin">support_admin</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Access Days (optional)</label>
              <input className="form-control form-control-sm" type="number" value={addUserForm.accessDays} onChange={(e) => setAddUserForm({ ...addUserForm, accessDays: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label small fw-semibold">Enroll into Product (optional)</label>
            <select className="form-select form-select-sm" value={addUserForm.productSlug} onChange={(e) => setAddUserForm({ ...addUserForm, productSlug: e.target.value })}>
              <option value="">— None —</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="form-check mt-2">
            <input id="addUserSendEmail" className="form-check-input" type="checkbox" checked={addUserForm.sendWelcomeEmail} onChange={(e) => setAddUserForm({ ...addUserForm, sendWelcomeEmail: e.target.checked })} />
            <label htmlFor="addUserSendEmail" className="form-check-label small">Send welcome email with credentials</label>
          </div>
        </div>
      </AdminModal>

      <PromptModal
        open={reasonModal.open}
        title={reasonModal.title}
        label="Reason (required for audit log)"
        placeholder="Enter reason..."
        onSubmit={reasonModal.onConfirm}
        onCancel={() => setReasonModal((prev) => ({ ...prev, open: false }))}
        busy={busy}
      />

      <AdminModal
        open={showBulkImport}
        title="Bulk Import Students"
        onClose={() => { setShowBulkImport(false); setBulkPreview(null); setBulkCsv(""); setBulkFileName(""); }}
        size="lg"
        footer={
          <>
            <button className="btn btn-light" onClick={() => { setShowBulkImport(false); setBulkPreview(null); setBulkCsv(""); setBulkFileName(""); }} disabled={busy}>Close</button>
            <button className="btn btn-outline-primary" onClick={previewBulkUsers} disabled={busy || bulkCsv.trim().length < 10}>
              <i className="bi bi-eye me-1"></i>Preview
            </button>
            <button className="btn btn-primary" onClick={applyBulkUsers} disabled={busy || !bulkPreview || bulkPreview.newUsers === 0 || bulkPreview.errors.length > 0}>
              <i className="bi bi-check-lg me-1"></i>Apply Import
            </button>
          </>
        }
      >
        <p className="small text-muted mb-2">
          Use a header row: <code>email,fullName,password,productSlug,accessDays</code>, or paste rows in that exact order without a header.
          Leave <code>productSlug</code> blank and use <code>0</code> access days for users without enrollment.
          For multiple products, separate slugs with <code>;</code>.
        </p>
        {activeProducts.length > 0 && (
          <p className="small text-muted mb-2">
            Active product slugs: {activeProducts.map((p) => <code key={p.id} className="me-1">{p.slug}</code>)}
          </p>
        )}
        <div className="mb-2">
          <label className="form-label small fw-semibold">Upload CSV file</label>
          <input
            className="form-control form-control-sm"
            type="file"
            accept=".csv,text/csv"
            onChange={loadBulkCsvFile}
          />
          {bulkFileName && <div className="form-text">Loaded: {bulkFileName}</div>}
        </div>
        <textarea
          className="form-control font-monospace mb-2"
          rows={8}
          style={{ fontSize: 12 }}
          placeholder={"email,fullName,password,productSlug,accessDays\njane@example.com,Jane Doe,TempPass123,pmp-mock-01;capm-mock-01,90\nnoaccess@example.com,No Access,TempPass123,,0\n\nor without a header:\njane@example.com,Jane Doe,TempPass123,pmp-mock-01,90"}
          value={bulkCsv}
          onChange={(e) => { setBulkCsv(e.target.value); setBulkPreview(null); }}
        />
        <div className="form-check mb-2">
          <input id="bulkSendEmail" className="form-check-input" type="checkbox" checked={bulkSendEmail} onChange={(e) => setBulkSendEmail(e.target.checked)} />
          <label htmlFor="bulkSendEmail" className="form-check-label small">Send welcome email to each new user</label>
        </div>
        {bulkPreview && (
          <div className="border rounded p-3 bg-light small">
            <div className="d-flex gap-3 flex-wrap">
              <div><strong>Total:</strong> {bulkPreview.total}</div>
              <div className={bulkPreview.newUsers > 0 ? "text-success" : ""}><strong>Ready:</strong> {bulkPreview.newUsers}</div>
              <div className="text-warning"><strong>Duplicates:</strong> {bulkPreview.duplicates}</div>
              <div><strong>With enrollment:</strong> {bulkPreview.withEnrollment}</div>
            </div>
            {bulkPreview.errors.length > 0 && (
              <div className="mt-2">
                <strong className="text-danger">Errors ({bulkPreview.errors.length}):</strong>
                <ul className="mb-0 small">
                  {bulkPreview.errors.slice(0, 10).map((e, i) => (<li key={i}>Row {e.row}: {e.reason}</li>))}
                </ul>
              </div>
            )}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(accessUser)}
        title={accessUser ? `Product Access: ${accessUser.email}` : "Product Access"}
        onClose={() => { setAccessUser(null); setAccessDetail(null); }}
        size="lg"
        footer={
          <button className="btn btn-light" onClick={() => { setAccessUser(null); setAccessDetail(null); }} disabled={busy}>Close</button>
        }
      >
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-7">
            <label className="form-label small fw-semibold">Product</label>
            <select
              className="form-select form-select-sm"
              value={accessForm.productSlug}
              onChange={(event) => {
                const selected = activeProducts.find((product) => product.slug === event.target.value);
                setAccessForm({ productSlug: event.target.value, accessDays: String(selected?.accessDays ?? 90) });
              }}
            >
              {activeProducts.map((product) => (
                <option key={product.id} value={product.slug}>{product.title}</option>
              ))}
            </select>
            {activeProducts.length === 0 && (
              <div className="form-text text-danger">No published products are available to grant.</div>
            )}
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold">Access days</label>
            <input
              className="form-control form-control-sm"
              type="number"
              min={1}
              value={accessForm.accessDays}
              onChange={(event) => setAccessForm((prev) => ({ ...prev, accessDays: event.target.value }))}
            />
          </div>
          <div className="col-md-2">
            <button className="btn btn-sm btn-primary w-100" onClick={grantAccess} disabled={busy || activeProducts.length === 0 || !accessForm.productSlug || Number(accessForm.accessDays) <= 0}>
              Grant
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0" style={{ minWidth: 760 }}>
            <thead className="table-light">
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Starts</th>
                <th>Expires</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!accessDetail && (
                <tr><td colSpan={5} className="text-muted">Loading access...</td></tr>
              )}
              {accessDetail && accessDetail.enrollments.length === 0 && (
                <tr><td colSpan={5} className="text-muted">No product access yet.</td></tr>
              )}
              {accessDetail?.enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>
                    <div className="fw-semibold">{enrollment.productTitle}</div>
                    <div className="small text-muted">{enrollment.productSlug}</div>
                  </td>
                  <td><span className={`badge ${enrollment.status === "active" ? "badge-primary-soft" : "badge-neutral-soft"}`}>{enrollment.status}</span></td>
                  <td>{enrollment.startsAt ? new Date(enrollment.startsAt).toLocaleDateString() : "—"}</td>
                  <td>{enrollment.expiresAt ? new Date(enrollment.expiresAt).toLocaleDateString() : "—"}</td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm">
                      {enrollment.status === "revoked" ? (
                        <button className="btn btn-outline-success" onClick={() => setEnrollmentStatus(enrollment.id, "active")} disabled={busy}>Activate</button>
                      ) : (
                        <>
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => extendEnrollment(enrollment.id, 30)}
                            disabled={busy}
                            title="Extend expiry by 30 days"
                          >
                            Extend 30d
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => setEnrollmentStatus(enrollment.id, "revoked")} disabled={busy}>Revoke</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminModal>

      {/* Delete User Confirmation Modal */}
      <AdminModal
        open={!!deleteTarget}
        title="Delete User Account"
        onClose={() => setDeleteTarget(null)}
        size="sm"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDeleteUser} disabled={busy}>
              {busy ? "Deleting…" : "Yes, Delete Account"}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div>
            <p className="mb-2">This will <strong>anonymise</strong> the account — PII will be wiped and the email freed for re-registration. Orders and audit history are kept with an anonymised placeholder.</p>
            <div className="p-3 rounded bg-light">
              <div className="fw-semibold">{deleteTarget.fullName || "—"}</div>
              <div className="small text-muted">{deleteTarget.email}</div>
              <div className="small text-muted">Role: {deleteTarget.role}</div>
              {deleteTarget.enrollments && deleteTarget.enrollments.length > 0 && (
                <div className="small text-warning mt-1">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Has {deleteTarget.enrollments.length} enrollment(s)
                </div>
              )}
            </div>
            <p className="mt-2 mb-0 small text-danger fw-semibold">This action cannot be undone.</p>
          </div>
        )}
      </AdminModal>
    </>
  );
}
