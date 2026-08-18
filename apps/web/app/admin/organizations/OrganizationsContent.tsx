"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminModal } from "../components/AdminModal";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { browserApiFetch } from "../../../lib/api";
import type { AdminProduct } from "../../../lib/admin-api";

const PRIMARY = "#E8792B";

type Organization = {
  id: number;
  slug: string;
  name: string;
  contactEmail: string | null;
  status: string;
  memberCount: number;
  orderCount: number;
  seatTierOverride: number | null;
};

type OrgMember = {
  id: number;
  userId: number;
  email: string;
  fullName: string;
  role: string;
  joinedAt: string;
};

type OrgOrderRow = {
  id: number;
  orderId: number;
  seatCount: number;
  discountPercent: number;
  createdAt: string;
  orderStatus: string;
  totalAmount: number;
};

type OrgDetail = Organization & {
  members: OrgMember[];
  orders: OrgOrderRow[];
};

interface OrganizationsContentProps {
  initialOrganizations: Organization[];
  initialProducts?: AdminProduct[];
}

export function OrganizationsContent({
  initialOrganizations,
  initialProducts = [],
}: OrganizationsContentProps) {
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [showOrgCreate, setShowOrgCreate] = useState(false);
  const [orgForm, setOrgForm] = useState({
    slug: "",
    name: "",
    contactEmail: "",
    contactPhone: "",
    seatTierOverride: "",
    notes: "",
  });

  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [orgDetailLoading, setOrgDetailLoading] = useState(false);
  const [orgMemberForm, setOrgMemberForm] = useState({
    userEmail: "",
    role: "member" as "owner" | "admin" | "member",
  });
  const [orgSeatOrder, setOrgSeatOrder] = useState<{
    productSlug: string;
    selectedMemberIds: number[];
    paymentStatus: "paid" | "pending";
  }>({ productSlug: "", selectedMemberIds: [], paymentStatus: "paid" });
  const [orgQuotePreview, setOrgQuotePreview] = useState<{
    seats: number;
    discountPercent: number;
    source: string;
  } | null>(null);

  useEffect(() => {
    if (products.length === 0) {
      browserApiFetch<AdminProduct[]>("/api/admin/products")
        .then(setProducts)
        .catch(() => {});
    }
  }, [products.length]);

  const refreshOrganizations = useCallback(async () => {
    try {
      const data = await browserApiFetch<Organization[]>("/api/admin/organizations");
      setOrganizations(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  async function submitOrgCreate() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        slug: orgForm.slug.trim().toLowerCase(),
        name: orgForm.name.trim(),
        contactEmail: orgForm.contactEmail.trim() || null,
        contactPhone: orgForm.contactPhone.trim() || null,
        notes: orgForm.notes.trim() || null,
      };
      if (orgForm.seatTierOverride.trim()) body.seatTierOverride = Number(orgForm.seatTierOverride);
      const created = await browserApiFetch<Organization>(
        "/api/admin/organizations",
        { method: "POST", body: JSON.stringify(body) }
      );
      setOrganizations((prev) => [created, ...prev]);
      setStatusMessage(`Organization "${created.name}" created`);
      setShowOrgCreate(false);
      setOrgForm({ slug: "", name: "", contactEmail: "", contactPhone: "", seatTierOverride: "", notes: "" });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setBusy(false);
    }
  }

  async function openOrgDetail(orgId: number) {
    setOrgDetailLoading(true);
    setOrgDetail(null);
    setOrgQuotePreview(null);
    setOrgSeatOrder({ productSlug: "", selectedMemberIds: [], paymentStatus: "paid" });
    try {
      const data = await browserApiFetch<OrgDetail>(`/api/admin/organizations/${orgId}`);
      setOrgDetail(data);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setOrgDetailLoading(false);
    }
  }

  async function refreshOrgDetail(orgId: number) {
    try {
      const data = await browserApiFetch<OrgDetail>(`/api/admin/organizations/${orgId}`);
      setOrgDetail(data);
      refreshOrganizations();
    } catch {
      /* ignore */
    }
  }

  async function addOrgMember() {
    if (!orgDetail || !orgMemberForm.userEmail.trim()) return;
    setBusy(true);
    try {
      await browserApiFetch(`/api/admin/organizations/${orgDetail.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          userEmail: orgMemberForm.userEmail.trim(),
          role: orgMemberForm.role,
        }),
      });
      setStatusMessage(`Member added to ${orgDetail.name}`);
      setOrgMemberForm({ userEmail: "", role: "member" });
      await refreshOrgDetail(orgDetail.id);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setBusy(false);
    }
  }

  async function removeOrgMember(memberId: number) {
    if (!orgDetail) return;
    setBusy(true);
    try {
      await browserApiFetch(
        `/api/admin/organizations/${orgDetail.id}/members/${memberId}`,
        { method: "DELETE" }
      );
      setStatusMessage("Member removed");
      await refreshOrgDetail(orgDetail.id);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setBusy(false);
    }
  }

  async function previewSeatQuote() {
    if (!orgDetail) return;
    const seats = orgSeatOrder.selectedMemberIds.length;
    if (seats === 0) {
      setOrgQuotePreview(null);
      return;
    }
    try {
      const q = await browserApiFetch<{
        seats: number;
        discountPercent: number;
        source: string;
      }>(`/api/admin/organizations/${orgDetail.id}/quote?seats=${seats}`);
      setOrgQuotePreview(q);
    } catch {
      setOrgQuotePreview(null);
    }
  }

  async function submitSeatOrder() {
    if (!orgDetail) return;
    if (!orgSeatOrder.productSlug.trim()) {
      setStatusMessage("Pick a product");
      return;
    }
    if (orgSeatOrder.selectedMemberIds.length === 0) {
      setStatusMessage("Select at least one member");
      return;
    }
    setBusy(true);
    try {
      const result = await browserApiFetch<{
        orderId: number;
        seats: number;
        discountPercent: number;
        discountedTotal: number;
        enrolledCount: number;
        alreadyEnrolledCount: number;
      }>(`/api/admin/organizations/${orgDetail.id}/orders`, {
        method: "POST",
        body: JSON.stringify({
          productSlug: orgSeatOrder.productSlug.trim(),
          memberUserIds: orgSeatOrder.selectedMemberIds,
          paymentStatus: orgSeatOrder.paymentStatus,
        }),
      });
      setStatusMessage(
        `Seat order #${result.orderId} created — ${result.seats} seat(s) at ${result.discountPercent}% off, USD ${result.discountedTotal.toFixed(2)}. Enrolled ${result.enrolledCount}, already-enrolled ${result.alreadyEnrolledCount}.`
      );
      setOrgSeatOrder({ productSlug: "", selectedMemberIds: [], paymentStatus: "paid" });
      setOrgQuotePreview(null);
      await refreshOrgDetail(orgDetail.id);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to create seat order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setStatusMessage("")}
          />
        </div>
      )}

      {/* Page header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">Organizations (B2B)</h4>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowOrgCreate(true)}
          disabled={busy}
        >
          <i className="bi bi-plus-lg me-1"></i>New Organization
        </button>
      </div>

      {/* Tier Discount Info */}
      <div className="card border-0 shadow-sm mb-4" style={{ background: "var(--teal-soft)" }}>
        <div className="card-body">
          <h6 className="fw-bold mb-3">
            <i className="bi bi-info-circle me-2"></i>Tier Discount Structure
          </h6>
          <div className="table-responsive">
            <table className="table table-sm mb-0" style={{ background: "transparent" }}>
              <thead className="table-light">
                <tr>
                  <th>Seats</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1 – 4 seats</td>
                  <td><StatusBadge status="0%" /></td>
                </tr>
                <tr>
                  <td>5 – 9 seats</td>
                  <td><StatusBadge status="10%" /></td>
                </tr>
                <tr>
                  <td>10 – 19 seats</td>
                  <td><StatusBadge status="15%" /></td>
                </tr>
                <tr>
                  <td>20+ seats</td>
                  <td><StatusBadge status="20%" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small text-muted mb-0 mt-2">
            Set a per-organization override in the organization details.
          </p>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th>Organization</th>
                <th>Contact</th>
                <th>Members</th>
                <th>Orders</th>
                <th>Discount</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="fw-semibold">{o.name}</div>
                    <div className="text-muted small">{o.slug}</div>
                  </td>
                  <td className="text-muted">{o.contactEmail ?? "—"}</td>
                  <td>{o.memberCount}</td>
                  <td>{o.orderCount}</td>
                  <td>
                    {o.seatTierOverride !== null ? (
                      <StatusBadge status={`${o.seatTierOverride}%`} />
                    ) : (
                      <StatusBadge status="tiered" />
                    )}
                  </td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => openOrgDetail(o.id)}
                    >
                      <i className="bi bi-people me-1"></i>Manage
                    </button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No organizations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        open={showOrgCreate}
        title="Create Organization"
        onClose={() => setShowOrgCreate(false)}
        size="md"
        footer={
          <>
            <button
              className="btn btn-light"
              onClick={() => setShowOrgCreate(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="btn text-white"
              style={{ background: PRIMARY }}
              onClick={submitOrgCreate}
              disabled={busy || !orgForm.slug || !orgForm.name}
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        <div className="d-flex flex-column gap-2">
          <div className="row g-2">
            <div className="col-5">
              <label className="form-label small fw-semibold">Slug *</label>
              <input
                className="form-control form-control-sm font-monospace"
                value={orgForm.slug}
                onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                placeholder="acme-corp"
              />
            </div>
            <div className="col-7">
              <label className="form-label small fw-semibold">Name *</label>
              <input
                className="form-control form-control-sm"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                placeholder="Acme Corporation"
              />
            </div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-semibold">Contact Email</label>
              <input
                className="form-control form-control-sm"
                type="email"
                value={orgForm.contactEmail}
                onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Contact Phone</label>
              <input
                className="form-control form-control-sm"
                value={orgForm.contactPhone}
                onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="form-label small fw-semibold">
              Discount Override % (blank = use tiered: 5–9=10, 10–19=15, 20+=20)
            </label>
            <input
              className="form-control form-control-sm"
              type="number"
              value={orgForm.seatTierOverride}
              onChange={(e) => setOrgForm({ ...orgForm, seatTierOverride: e.target.value })}
              placeholder="e.g., 25"
            />
          </div>
          <div>
            <label className="form-label small fw-semibold">Notes</label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={orgForm.notes}
              onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
            />
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={!!orgDetail || orgDetailLoading}
        title={orgDetail ? `Manage: ${orgDetail.name}` : "Loading…"}
        onClose={() => {
          setOrgDetail(null);
          setOrgDetailLoading(false);
        }}
        size="lg"
        footer={
          <button
            className="btn btn-light"
            onClick={() => {
              setOrgDetail(null);
              setOrgDetailLoading(false);
            }}
            disabled={busy}
          >
            Close
          </button>
        }
      >
        {orgDetailLoading && (
          <div className="text-center py-4 text-muted">
            <span className="spinner-border spinner-border-sm me-2" /> Loading…
          </div>
        )}
        {orgDetail && (
          <div className="d-flex flex-column gap-4">
            <div>
              <h6 className="fw-bold mb-2">
                <i className="bi bi-people me-2"></i>Members ({orgDetail.members.length})
              </h6>
              <div className="table-responsive" style={{ maxHeight: 240, overflowY: "auto" }}>
                <table className="table table-sm align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgDetail.members.map((m) => (
                      <tr key={m.id}>
                        <td className="font-monospace">{m.email}</td>
                        <td>{m.fullName}</td>
                        <td>
                          <span className="badge bg-light text-dark border">{m.role}</span>
                        </td>
                        <td className="text-muted">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeOrgMember(m.id)}
                            disabled={busy}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orgDetail.members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">
                          No members yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex gap-2 mt-2 align-items-end">
                <div className="flex-grow-1">
                  <label className="form-label small fw-semibold mb-1">
                    Add member by email
                  </label>
                  <input
                    className="form-control form-control-sm"
                    type="email"
                    placeholder="user@example.com"
                    value={orgMemberForm.userEmail}
                    onChange={(e) =>
                      setOrgMemberForm({ ...orgMemberForm, userEmail: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="form-label small fw-semibold mb-1">Role</label>
                  <select
                    className="form-select form-select-sm"
                    value={orgMemberForm.role}
                    onChange={(e) =>
                      setOrgMemberForm({
                        ...orgMemberForm,
                        role: e.target.value as "owner" | "admin" | "member",
                      })
                    }
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                </div>
                <button
                  className="btn btn-sm text-white"
                  style={{ background: PRIMARY }}
                  onClick={addOrgMember}
                  disabled={busy || !orgMemberForm.userEmail.trim()}
                >
                  <i className="bi bi-plus-lg me-1"></i>Add
                </button>
              </div>
            </div>

            <hr className="my-1" />

            <div>
              <h6 className="fw-bold mb-2">
                <i className="bi bi-cart-plus me-2"></i>Create Seat Order
              </h6>
              <p className="small text-muted mb-3">
                Bulk-enroll selected members at the org discount. Discount auto-applies based on seat count
                {orgDetail.seatTierOverride !== null
                  ? ` (override: ${orgDetail.seatTierOverride}%)`
                  : " (tiered: 5+=10%, 10+=15%, 20+=20%)"}
                .
              </p>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Product</label>
                  <select
                    className="form-select form-select-sm"
                    value={orgSeatOrder.productSlug}
                    onChange={(e) =>
                      setOrgSeatOrder({ ...orgSeatOrder, productSlug: e.target.value })
                    }
                  >
                    <option value="">— Select a product —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.title} — USD {p.priceUsd}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Payment</label>
                  <select
                    className="form-select form-select-sm"
                    value={orgSeatOrder.paymentStatus}
                    onChange={(e) =>
                      setOrgSeatOrder({
                        ...orgSeatOrder,
                        paymentStatus: e.target.value as "paid" | "pending",
                      })
                    }
                  >
                    <option value="paid">paid (enroll now)</option>
                    <option value="pending">pending (await payment)</option>
                  </select>
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <button
                    className="btn btn-sm btn-outline-secondary w-100"
                    onClick={previewSeatQuote}
                    disabled={orgSeatOrder.selectedMemberIds.length === 0}
                  >
                    Refresh quote
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label small fw-semibold d-flex justify-content-between">
                  <span>
                    Select members to enroll ({orgSeatOrder.selectedMemberIds.length} selected)
                  </span>
                  <span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 me-2"
                      style={{ fontSize: 12 }}
                      onClick={() => {
                        setOrgSeatOrder({
                          ...orgSeatOrder,
                          selectedMemberIds: orgDetail.members.map((m) => m.userId),
                        });
                        setOrgQuotePreview(null);
                      }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      style={{ fontSize: 12 }}
                      onClick={() => {
                        setOrgSeatOrder({ ...orgSeatOrder, selectedMemberIds: [] });
                        setOrgQuotePreview(null);
                      }}
                    >
                      Clear
                    </button>
                  </span>
                </label>
                <div
                  className="border rounded p-2"
                  style={{ maxHeight: 160, overflowY: "auto", background: "#FAFAFA" }}
                >
                  {orgDetail.members.length === 0 ? (
                    <div className="text-center text-muted small py-2">
                      Add members first.
                    </div>
                  ) : (
                    orgDetail.members.map((m) => {
                      const checked = orgSeatOrder.selectedMemberIds.includes(m.userId);
                      return (
                        <div key={m.id} className="form-check small">
                          <input
                            id={`org-seat-m-${m.id}`}
                            type="checkbox"
                            className="form-check-input"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? orgSeatOrder.selectedMemberIds.filter((id) => id !== m.userId)
                                : [...orgSeatOrder.selectedMemberIds, m.userId];
                              setOrgSeatOrder({ ...orgSeatOrder, selectedMemberIds: next });
                              setOrgQuotePreview(null);
                            }}
                          />
                          <label htmlFor={`org-seat-m-${m.id}`} className="form-check-label">
                            <span className="font-monospace">{m.email}</span>
                            <span className="text-muted ms-2">— {m.fullName}</span>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {orgQuotePreview && (
                <div className="alert alert-info small mt-3 mb-0 py-2">
                  <strong>{orgQuotePreview.seats}</strong> seat(s) →{" "}
                  <strong>{orgQuotePreview.discountPercent}%</strong> off (
                  {orgQuotePreview.source})
                </div>
              )}

              <div className="d-flex justify-content-end mt-3">
                <button
                  className="btn btn-sm text-white"
                  style={{ background: PRIMARY }}
                  onClick={submitSeatOrder}
                  disabled={
                    busy ||
                    !orgSeatOrder.productSlug ||
                    orgSeatOrder.selectedMemberIds.length === 0
                  }
                >
                  <i className="bi bi-cart-plus me-1"></i>
                  {busy
                    ? "Creating…"
                    : `Create order (${orgSeatOrder.selectedMemberIds.length} seat${
                        orgSeatOrder.selectedMemberIds.length === 1 ? "" : "s"
                      })`}
                </button>
              </div>
            </div>

            {orgDetail.orders.length > 0 && (
              <>
                <hr className="my-1" />
                <div>
                  <h6 className="fw-bold mb-2">
                    <i className="bi bi-receipt me-2"></i>Recent Seat Orders
                  </h6>
                  <div className="table-responsive" style={{ maxHeight: 200, overflowY: "auto" }}>
                    <table className="table table-sm small mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Order</th>
                          <th>Seats</th>
                          <th>Discount</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgDetail.orders.map((o) => (
                          <tr key={o.id}>
                            <td>#{o.orderId}</td>
                            <td>{o.seatCount}</td>
                            <td>{o.discountPercent}%</td>
                            <td>USD {Number(o.totalAmount).toFixed(2)}</td>
                            <td>
                              <StatusBadge status={o.orderStatus} />
                            </td>
                            <td className="text-muted">
                              {new Date(o.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </AdminModal>
    </>
  );
}
