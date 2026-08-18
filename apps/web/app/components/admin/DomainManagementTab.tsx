"use client";

import { useState } from "react";
import type { AdminProduct } from "../../../lib/admin-api";

const PRIMARY = "#E8792B";

const BORDER_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
];

interface DomainItem {
  id: number;
  productId: number;
  name: string;
  description: string | null;
}

interface DomainManagementTabProps {
  title: string;
  icon: string;
  description: string;
  domains: DomainItem[];
  products: AdminProduct[];
  busy: boolean;
  variant?: "eco" | "performance";
  onRefresh: () => Promise<void>;
  onCreate: (productId: number, name: string, description: string) => Promise<void>;
  onUpdate: (id: number, name: string, description: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function DomainManagementTab({
  title,
  icon,
  description,
  domains,
  products,
  busy,
  variant = "performance",
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: DomainManagementTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formProductId, setFormProductId] = useState(products[0]?.id?.toString() ?? "1");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [filterProductId, setFilterProductId] = useState<string>("all");

  const filtered = filterProductId === "all" ? domains : domains.filter((d) => d.productId === Number(filterProductId));

  const getProductName = (productId: number) => {
    return products.find((p) => p.id === productId)?.title ?? `Product ${productId}`;
  };

  const startEdit = (d: DomainItem) => {
    setEditingId(d.id);
    setFormName(d.name);
    setFormDesc(d.description ?? "");
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setFormProductId(products[0]?.id?.toString() ?? "1");
    setFormName("");
    setFormDesc("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormDesc("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await onUpdate(editingId, formName, formDesc);
    } else {
      await onCreate(Number(formProductId), formName, formDesc);
    }
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormDesc("");
  };

  return (
    <>
      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white fw-bold d-flex align-items-center gap-2">
            <i className={`bi ${icon}`} style={{ color: PRIMARY }}></i>
            {editingId ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-2">
                {!editingId && (
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Exam (Product)</label>
                    <select
                      className="form-select form-select-sm"
                      value={formProductId}
                      onChange={(e) => setFormProductId(e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={editingId ? "col-md-6" : "col-md-4"}>
                  <label className="form-label small fw-semibold">Name</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="e.g. People, Process"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className={editingId ? "col-md-6" : "col-md-4"}>
                  <label className="form-label small fw-semibold">Description</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Brief description"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-sm text-white" style={{ background: PRIMARY }} disabled={busy}>
                  {busy ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Table View for both ECO and Performance Domains */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span className="fw-bold d-flex align-items-center gap-2">
              <i className={`bi ${icon}`} style={{ color: PRIMARY }}></i>
              {title}
            </span>
            <div className="d-flex gap-2 align-items-center">
              <select
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
              >
                <option value="all">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-sm text-white"
                style={{ background: PRIMARY }}
                onClick={startCreate}
                disabled={busy}
              >
                <i className="bi bi-plus-lg me-1"></i>New
              </button>
            </div>
          </div>
          <p className="px-3 pt-2 mb-0 small text-muted">{description}</p>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Domain</th>
                  <th>Description</th>
                  <th>Product</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td className="fw-semibold">{d.name}</td>
                    <td className="text-muted">{d.description || "\u2014"}</td>
                    <td className="small text-muted">{getProductName(d.productId)}</td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => startEdit(d)}
                          disabled={busy}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            if (confirm(`Delete "${d.name}"?`)) onDelete(d.id);
                          }}
                          disabled={busy}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      No domains
                      {filterProductId !== "all" ? " for this product" : ""}. Click &quot;New&quot; to add one.
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
