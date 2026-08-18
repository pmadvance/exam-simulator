"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { browserApiFetch } from "../../../lib/api";
import { AdminModal } from "../components/AdminModal";
import { StatusBadge } from "../../components/admin/StatusBadge";
import type { AdminVoucher, AdminVoucherPage, AdminProduct } from "../../../lib/admin-api";

const PRIMARY = "#E8792B";
const PAGE_SIZE = 25;

type VoucherForm = {
  code: string;
  type: "fixed" | "percentage";
  amount: string;
  minOrder: string;
  usageLimit: string;
  perUserLimit: string;
  validUntil: string;
  productId: string;
};

const emptyVoucherForm: VoucherForm = {
  code: "",
  type: "percentage",
  amount: "10",
  minOrder: "0",
  usageLimit: "",
  perUserLimit: "1",
  validUntil: "",
  productId: "",
};

interface VouchersContentProps {
  initialPage: AdminVoucherPage;
  products: AdminProduct[];
}

export function VouchersContent({ initialPage, products }: VouchersContentProps) {
  const publishedProducts = products.filter((p) => p.visibility === "published");

  const [page, setPage] = useState(initialPage.page);
  const [total, setTotal] = useState(initialPage.total);
  const [vouchers, setVouchers] = useState<AdminVoucher[]>(initialPage.data);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterProductId, setFilterProductId] = useState("");

  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [showVoucherCreate, setShowVoucherCreate] = useState(false);
  const [showVoucherBulk, setShowVoucherBulk] = useState(false);
  const [voucherForm, setVoucherForm] = useState<VoucherForm>(emptyVoucherForm);
  const [voucherBulk, setVoucherBulk] = useState({
    prefix: "PROMO",
    count: "10",
    type: "percentage" as "fixed" | "percentage",
    amount: "10",
    validUntil: "",
    productId: "",
  });

  const [emailVoucher, setEmailVoucher] = useState<AdminVoucher | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchVouchers = useCallback(async (
    p: number,
    s: string,
    status: string,
    type: string,
    productId: string,
  ) => {
    setBusy(true);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (s) qs.set("search", s);
      if (status) qs.set("status", status);
      if (type) qs.set("type", type);
      if (productId) qs.set("productId", productId);
      const data = await browserApiFetch<AdminVoucherPage>(`/api/admin/vouchers?${qs.toString()}`);
      setVouchers(data.data);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers(1, search, filterStatus, filterType, filterProductId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus, filterType, filterProductId]);

  const goToPage = (p: number) => fetchVouchers(p, search, filterStatus, filterType, filterProductId);

  const stats = useMemo(() => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expired = vouchers.filter((v) => v.status === "expired" || (v.validUntil && new Date(v.validUntil) < now)).length;
    const expiringSoon = vouchers.filter((v) => {
      if (!v.validUntil) return false;
      const d = new Date(v.validUntil);
      return d >= now && d <= in7Days;
    }).length;
    const totalRedemptions = vouchers.reduce((s, v) => s + (v.redemptions ?? 0), 0);
    return { expired, expiringSoon, totalRedemptions };
  }, [vouchers]);

  async function submitVoucherCreate() {
    setBusy(true);
    try {
      const body = {
        code: voucherForm.code.trim().toUpperCase(),
        type: voucherForm.type,
        amount: Number(voucherForm.amount),
        minOrder: Number(voucherForm.minOrder || "0"),
        usageLimit: voucherForm.usageLimit ? Number(voucherForm.usageLimit) : null,
        perUserLimit: Number(voucherForm.perUserLimit || "1"),
        validUntil: voucherForm.validUntil || null,
        productId: voucherForm.productId ? Number(voucherForm.productId) : null,
        status: "active" as const,
      };
      await browserApiFetch<AdminVoucher>("/api/admin/vouchers", { method: "POST", body: JSON.stringify(body) });
      setStatusMessage(`Voucher ${body.code} created`);
      setShowVoucherCreate(false);
      setVoucherForm(emptyVoucherForm);
      await fetchVouchers(1, search, filterStatus, filterType, filterProductId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create voucher");
    } finally { setBusy(false); }
  }

  async function toggleVoucherStatus(id: number, currentStatus: string) {
    setBusy(true);
    try {
      const nextStatus = currentStatus === "active" ? "inactive" : "active";
      const updated = await browserApiFetch<AdminVoucher>(`/api/admin/vouchers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, status: updated.status } : v)));
      setStatusMessage(`Voucher ${updated.code} ${nextStatus === "active" ? "activated" : "deactivated"}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update voucher status");
    } finally { setBusy(false); }
  }

  async function submitVoucherBulk() {
    setBusy(true);
    try {
      await browserApiFetch<{ requested: number; created: number }>(
        "/api/admin/vouchers/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            prefix: voucherBulk.prefix,
            count: Number(voucherBulk.count),
            type: voucherBulk.type,
            amount: Number(voucherBulk.amount),
            validUntil: voucherBulk.validUntil || null,
            productId: voucherBulk.productId ? Number(voucherBulk.productId) : null,
          }),
        }
      );
      setStatusMessage(`Bulk-issued vouchers (prefix: ${voucherBulk.prefix})`);
      setShowVoucherBulk(false);
      await fetchVouchers(1, search, filterStatus, filterType, filterProductId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Bulk issue failed");
    } finally { setBusy(false); }
  }

  async function submitSendEmail() {
    if (!emailVoucher) return;
    const emails = emailInput.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) { setStatusMessage("Enter at least one email address"); return; }
    setBusy(true);
    try {
      const result = await browserApiFetch<{ sent: number; failed: number; failedEmails: string[] }>(
        `/api/admin/vouchers/${emailVoucher.id}/send-email`,
        { method: "POST", body: JSON.stringify({ emails, message: emailMessage.trim() || undefined }) }
      );
      const note = result.failed > 0 ? ` (${result.failed} failed: ${result.failedEmails.join(", ")})` : "";
      setStatusMessage(`Sent voucher to ${result.sent} recipient(s)${note}`);
      setEmailVoucher(null);
      setEmailInput("");
      setEmailMessage("");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to send email");
    } finally { setBusy(false); }
  }

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button type="button" className="btn-close" onClick={() => setStatusMessage("")} />
        </div>
      )}

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Vouchers</h1>
          <p className="page-subtitle">Create and manage discount vouchers</p>
        </div>
        <div className="d-flex flex-column align-items-end gap-1">
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setShowVoucherBulk(true)} disabled={busy}>
              <i className="bi bi-collection me-1"></i>Bulk Issue
            </button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={() => setShowVoucherCreate(true)} disabled={busy}>
              <i className="bi bi-plus-lg me-1"></i>Create Voucher
            </button>
          </div>
          <p className="small text-muted mb-0">
            Generate multiple unique single-use voucher codes with a prefix (e.g., PROMO-A3K9M2).
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Vouchers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-success">{stats.totalRedemptions}</div>
          <div className="stat-label">Redemptions (page)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-warning">{stats.expiringSoon}</div>
          <div className="stat-label">Expiring Soon</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-danger">{stats.expired}</div>
          <div className="stat-label">Expired</div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
          <span className="fw-bold me-auto">
            <i className="bi bi-ticket-perforated me-2"></i>All Vouchers
          </span>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ width: 180 }}
            placeholder="Search by code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select form-select-sm"
            style={{ width: 140 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
          <select
            className="form-select form-select-sm"
            style={{ width: 140 }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="fixed">Fixed</option>
            <option value="percentage">Percentage</option>
          </select>
          <select
            className="form-select form-select-sm"
            style={{ width: 200 }}
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
          >
            <option value="">All Courses</option>
            {publishedProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Order</th>
                <th>Usage</th>
                <th>Course</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id}>
                  <td><code className="fw-bold">{v.code}</code></td>
                  <td className="text-capitalize">{v.type}</td>
                  <td>{v.amount}{v.type === "percentage" ? "%" : " USD"}</td>
                  <td>{v.minOrder > 0 ? `USD ${v.minOrder}` : "—"}</td>
                  <td>{v.redemptions ?? 0} / {v.usageLimit ?? "∞"}</td>
                  <td className="small text-muted" style={{ maxWidth: 160 }}>
                    {v.productTitle ? (
                      <span className="text-truncate d-inline-block" style={{ maxWidth: 150 }} title={v.productTitle}>
                        {v.productTitle}
                      </span>
                    ) : "All courses"}
                  </td>
                  <td className="small text-muted">
                    {v.validUntil ? new Date(v.validUntil).toLocaleDateString() : "∞"}
                  </td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        title="Send via email"
                        onClick={() => { setEmailVoucher(v); setEmailInput(""); setEmailMessage(""); }}
                        disabled={busy}
                      >
                        <i className="bi bi-envelope"></i>
                      </button>
                      <button
                        className={`btn btn-sm ${v.status === "active" ? "btn-outline-danger" : "btn-outline-success"}`}
                        onClick={() => toggleVoucherStatus(v.id, v.status)}
                        disabled={busy}
                      >
                        {v.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted py-4">No vouchers found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span className="small text-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} vouchers
            </span>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1 || busy}
                onClick={() => goToPage(page - 1)}
              >
                <i className="bi bi-chevron-left"></i> Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="btn btn-sm btn-outline-secondary disabled">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`btn btn-sm ${page === p ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => goToPage(p as number)}
                      disabled={busy}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages || busy}
                onClick={() => goToPage(page + 1)}
              >
                Next <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Voucher Modal */}
      <AdminModal
        open={showVoucherCreate}
        title="Create Voucher"
        onClose={() => setShowVoucherCreate(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowVoucherCreate(false)} disabled={busy}>Cancel</button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={submitVoucherCreate} disabled={busy || !voucherForm.code}>
              {busy ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <div className="row g-2">
            <div className="col-8">
              <label className="form-label small fw-semibold">Code *</label>
              <input className="form-control form-control-sm font-monospace" value={voucherForm.code} onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value })} placeholder="WELCOME10" />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Type</label>
              <select className="form-select form-select-sm" value={voucherForm.type} onChange={(e) => setVoucherForm({ ...voucherForm, type: e.target.value as "fixed" | "percentage" })}>
                <option value="fixed">Fixed (USD)</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
          </div>
          <div className="row g-2">
            <div className="col-4">
              <label className="form-label small fw-semibold">Amount</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Min Order</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.minOrder} onChange={(e) => setVoucherForm({ ...voucherForm, minOrder: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Per User Limit</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.perUserLimit} onChange={(e) => setVoucherForm({ ...voucherForm, perUserLimit: e.target.value })} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">Total Usage Limit (blank = unlimited)</label>
              <input className="form-control form-control-sm" type="number" value={voucherForm.usageLimit} onChange={(e) => setVoucherForm({ ...voucherForm, usageLimit: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Valid Until (blank = no expiry)</label>
              <input className="form-control form-control-sm" type="date" value={voucherForm.validUntil} onChange={(e) => setVoucherForm({ ...voucherForm, validUntil: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label small fw-semibold">Restrict to Course (optional)</label>
            <select className="form-select form-select-sm" value={voucherForm.productId} onChange={(e) => setVoucherForm({ ...voucherForm, productId: e.target.value })}>
              <option value="">All courses</option>
              {publishedProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>
      </AdminModal>

      {/* Bulk Issue Modal */}
      <AdminModal
        open={showVoucherBulk}
        title="Bulk Issue Voucher Codes"
        onClose={() => setShowVoucherBulk(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setShowVoucherBulk(false)} disabled={busy}>Cancel</button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={submitVoucherBulk} disabled={busy || !voucherBulk.prefix || !voucherBulk.count}>
              {busy ? "Issuing…" : "Issue Codes"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <p className="small text-muted mb-1">Generates N unique codes formatted as <code>PREFIX-XXXXXX</code> (each single-use).</p>
          <div className="row g-2">
            <div className="col-8">
              <label className="form-label small fw-semibold">Prefix</label>
              <input className="form-control form-control-sm font-monospace" value={voucherBulk.prefix} onChange={(e) => setVoucherBulk({ ...voucherBulk, prefix: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Count (max 500)</label>
              <input className="form-control form-control-sm" type="number" max={500} value={voucherBulk.count} onChange={(e) => setVoucherBulk({ ...voucherBulk, count: e.target.value })} />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-4">
              <label className="form-label small fw-semibold">Type</label>
              <select className="form-select form-select-sm" value={voucherBulk.type} onChange={(e) => setVoucherBulk({ ...voucherBulk, type: e.target.value as "fixed" | "percentage" })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed (USD)</option>
              </select>
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Amount</label>
              <input className="form-control form-control-sm" type="number" value={voucherBulk.amount} onChange={(e) => setVoucherBulk({ ...voucherBulk, amount: e.target.value })} />
            </div>
            <div className="col-4">
              <label className="form-label small fw-semibold">Valid Until</label>
              <input className="form-control form-control-sm" type="date" value={voucherBulk.validUntil} onChange={(e) => setVoucherBulk({ ...voucherBulk, validUntil: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label small fw-semibold">Restrict to Course (optional)</label>
            <select className="form-select form-select-sm" value={voucherBulk.productId} onChange={(e) => setVoucherBulk({ ...voucherBulk, productId: e.target.value })}>
              <option value="">All courses</option>
              {publishedProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>
      </AdminModal>

      {/* Email Voucher Modal */}
      <AdminModal
        open={!!emailVoucher}
        title={`Send Voucher: ${emailVoucher?.code ?? ""}`}
        onClose={() => { setEmailVoucher(null); setEmailInput(""); setEmailMessage(""); }}
        size="md"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setEmailVoucher(null)} disabled={busy}>Cancel</button>
            <button className="btn text-white" style={{ background: PRIMARY }} onClick={submitSendEmail} disabled={busy || !emailInput.trim()}>
              {busy ? "Sending…" : "Send Email"}
            </button>
          </>
        }
      >
        {emailVoucher && (
          <div className="d-flex flex-column gap-3">
            <div className="p-3 rounded bg-light text-center">
              <div className="fw-bold font-monospace fs-5">{emailVoucher.code}</div>
              <div className="small text-muted mt-1">
                {emailVoucher.amount}{emailVoucher.type === "percentage" ? "%" : " USD"} off
                {emailVoucher.productTitle ? ` · ${emailVoucher.productTitle}` : " · All courses"}
                {emailVoucher.validUntil ? ` · Until ${new Date(emailVoucher.validUntil).toLocaleDateString()}` : " · No expiry"}
              </div>
            </div>
            <div>
              <label className="form-label small fw-semibold">Recipient Email(s) *</label>
              <input
                className="form-control form-control-sm"
                placeholder="john@example.com, jane@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <div className="form-text">Comma or space-separated for multiple recipients.</div>
            </div>
            <div>
              <label className="form-label small fw-semibold">Personal Message (optional)</label>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                placeholder="Add a note to include in the email…"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
          </div>
        )}
      </AdminModal>
    </>
  );
}
