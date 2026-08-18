"use client";

import React, { useState, useMemo, useEffect } from "react";
import { StatusBadge } from "./StatusBadge";
import type { AdminProduct, AdminExam } from "../../../lib/admin-api";

const PRIMARY = "#E8792B";

interface ProductManagerProps {
  products: AdminProduct[];
  exams: AdminExam[];
  busy: boolean;
  onCreate: (product: Omit<AdminProduct, "id" | "slug">) => Promise<void>;
  onUpdate: (id: number, product: Partial<AdminProduct>) => Promise<void>;
  onToggleVisibility: (id: number, currentVisibility: string) => Promise<void>;
  onViewTests: (productId: number) => void;
}

type SortCol = "id" | "title" | "priceUsd" | "accessDays" | "visibility";
type SortDir = "asc" | "desc";

export function ProductManager({
  products,
  exams,
  busy,
  onCreate,
  onUpdate,
  onToggleVisibility,
  onViewTests,
}: ProductManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [sortCol, setSortCol] = useState<SortCol>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    category: "Professional Certification",
    difficulty: "Intermediate",
    priceUsd: "100",
    accessDays: "90",
    visibility: "draft" as "draft" | "published" | "archived",
  });

  const resetForm = () => {
    setFormData({
      slug: "",
      title: "",
      description: "",
      category: "Professional Certification",
      difficulty: "Intermediate",
      priceUsd: "100",
      accessDays: "90",
      visibility: "draft",
    });
  };

  const startEdit = (product: AdminProduct) => {
    setEditingProduct(product);
    setFormData({
      slug: product.slug,
      title: product.title,
      description: product.description,
      category: product.category,
      difficulty: product.difficulty,
      priceUsd: String(product.priceUsd),
      accessDays: String(product.accessDays),
      visibility: product.visibility,
    });
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingProduct(null);
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      difficulty: formData.difficulty,
      priceUsd: Number(formData.priceUsd),
      accessDays: Number(formData.accessDays),
      visibility: formData.visibility,
    };

    if (editingProduct) {
      await onUpdate(editingProduct.id, productData);
    } else {
      await onCreate(productData);
    }
    setShowForm(false);
    resetForm();
  };

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products
      .filter((p) => filterCategory === "all" || p.category === filterCategory)
      .filter((p) => filterVisibility === "all" || p.visibility === filterVisibility)
      .filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));

    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortCol === "title" || sortCol === "visibility") {
        return a[sortCol].localeCompare(b[sortCol]) * dir;
      }
      return ((a[sortCol] as number) - (b[sortCol] as number)) * dir;
    });
  }, [products, filterCategory, filterVisibility, search, sortCol, sortDir]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedProducts.slice(start, start + pageSize);
  }, [filteredAndSortedProducts, page, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterCategory, filterVisibility]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  return (
    <>
      {/* Form Modal */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-bold">
            <i className="bi bi-pencil-square me-2"></i>
            {editingProduct ? "Edit Exam" : "New Exam"}
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {editingProduct && (
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Slug <span className="text-muted fw-normal">(auto-generated)</span>
                    </label>
                    <input
                      className="form-control form-control-sm bg-light"
                      value={formData.slug}
                      disabled
                    />
                  </div>
                )}
                <div className={editingProduct ? "col-md-4" : "col-md-6"}>
                  <label className="form-label small fw-semibold">Title</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Exam title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className={editingProduct ? "col-md-4" : "col-md-6"}>
                  <label className="form-label small fw-semibold">Category</label>
                  <select
                    className="form-select form-select-sm"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option>Professional Certification</option>
                    <option>Public Training</option>
                    <option>In-House Training</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Description</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Difficulty</label>
                  <select
                    className="form-select form-select-sm"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Price (USD)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={formData.priceUsd}
                    onChange={(e) => setFormData({ ...formData, priceUsd: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Access (days)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={formData.accessDays}
                    onChange={(e) => setFormData({ ...formData, accessDays: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Visibility</label>
                  <select
                    className="form-select form-select-sm"
                    value={formData.visibility}
                    onChange={(e) =>
                      setFormData({ ...formData, visibility: e.target.value as typeof formData.visibility })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-sm text-white" style={{ background: PRIMARY }} disabled={busy}>
                  {busy ? "Saving..." : editingProduct ? "Update Exam" : "Create Exam"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="flex-grow-1" style={{ minWidth: 240, maxWidth: 360 }}>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              className="form-control form-control-sm border-start-0"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <select
          className="form-select form-select-sm"
          style={{ width: "auto", minWidth: 160 }}
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: "auto", minWidth: 180 }}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Certifications</option>
          <option value="Professional Certification">Professional Certification</option>
          <option value="Public Training">Public Training</option>
          <option value="In-House Training">In-House Training</option>
        </select>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => {
            setSearch("");
            setFilterCategory("all");
            setFilterVisibility("all");
          }}
        >
          Clear
        </button>
        <div className="btn-group ms-2">
          <button
            className={`btn btn-sm ${viewMode === "cards" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setViewMode("cards")}
            title="Card view"
          >
            <i className="bi bi-grid"></i>
          </button>
          <button
            className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <i className="bi bi-list"></i>
          </button>
        </div>
        <div className="ms-auto">
          <button
            className="btn btn-sm btn-primary"
            onClick={startCreate}
            disabled={busy}
          >
            <i className="bi bi-plus-lg me-1"></i>Add Exam
          </button>
        </div>
      </div>

      {/* Product Display */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-inbox fs-1 d-block mb-2" style={{ opacity: 0.4 }}></i>
          No exams match filters
        </div>
      ) : viewMode === "cards" ? (
        <div className="product-grid">
          {paginatedProducts.map((p) => {
            const testCount = exams.filter((e) => e.productId === p.id).length;
            return (
              <div key={p.id} className={`product-card ${p.visibility}`}>
                <div className="product-header">
                  <div>
                    <div className="product-title">{p.title}</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {p.category}
                    </div>
                  </div>
                  <StatusBadge status={p.visibility} />
                </div>

                <div className="product-meta">
                  <span>
                    <i className="bi bi-currency-dollar"></i>
                    USD {p.priceUsd}
                  </span>
                  <span>
                    <i className="bi bi-clock"></i>
                    {p.accessDays} days
                  </span>
                  <span>
                    <i className="bi bi-file-text"></i>
                    {testCount} test{testCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="product-actions">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => startEdit(p)}
                    disabled={busy}
                    title="Edit"
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onToggleVisibility(p.id, p.visibility)}
                    disabled={busy}
                  >
                    {p.visibility === "published" ? "Archive" : "Publish"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onViewTests(p.id)}
                  >
                    View Tests
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("title")}>Title {sortCol === "title" && (sortDir === "asc" ? "↑" : "↓")}</th>
                  <th>Category</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("priceUsd")}>Price {sortCol === "priceUsd" && (sortDir === "asc" ? "↑" : "↓")}</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("accessDays")}>Access {sortCol === "accessDays" && (sortDir === "asc" ? "↑" : "↓")}</th>
                  <th>Tests</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => {
                  const testCount = exams.filter((e) => e.productId === p.id).length;
                  return (
                    <tr key={p.id}>
                      <td className="fw-semibold">{p.title}</td>
                      <td className="small text-muted">{p.category}</td>
                      <td>USD {p.priceUsd}</td>
                      <td>{p.accessDays} days</td>
                      <td>{testCount}</td>
                      <td><StatusBadge status={p.visibility} /></td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEdit(p)}
                            disabled={busy}
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => onToggleVisibility(p.id, p.visibility)}
                            disabled={busy}
                          >
                            {p.visibility === "published" ? "Archive" : "Publish"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => onViewTests(p.id)}
                          >
                            View Tests
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredAndSortedProducts.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="small text-muted">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length}
          </div>
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={9}>9 per page</option>
              <option value={18}>18 per page</option>
              <option value={36}>36 per page</option>
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
