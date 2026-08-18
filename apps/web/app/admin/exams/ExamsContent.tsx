"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { browserApiFetch } from "../../../lib/api";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { PreviewModal } from "../../components/admin/PreviewModal";
import type { AdminExam, AdminProduct } from "../../../lib/admin-api";

interface ExamsContentProps {
  initialExams: AdminExam[];
  products: AdminProduct[];
}

export function ExamsContent({ initialExams, products }: ExamsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exams, setExams] = useState<AdminExam[]>(initialExams);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<AdminExam | null>(null);
  const [examForm, setExamForm] = useState<{ slug: string; title: string; productId: string; timeLimitMinutes: string; passThreshold: string; status: "draft" | "published" }>({ slug: "", title: "", productId: products[0]?.id?.toString() ?? "1", timeLimitMinutes: "180", passThreshold: "70", status: "draft" });
  const [examFilterProductId, setExamFilterProductId] = useState<number | "all">("all");
  const [examFilterStatus, setExamFilterStatus] = useState<"all" | "draft" | "published">("all");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [previewExamId, setPreviewExamId] = useState<number | null>(null);
  const [previewExamTitle, setPreviewExamTitle] = useState("");
  const [selectedExams, setSelectedExams] = useState<Set<number>>(new Set());

  const filteredExams = exams.filter((e) =>
    (examFilterProductId === "all" || e.productId === examFilterProductId) &&
    (examFilterStatus === "all" || e.status === examFilterStatus)
  );

  const toggleSelectExam = (id: number) => {
    setSelectedExams(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedExams.size === filteredExams.length) {
      setSelectedExams(new Set());
    } else {
      setSelectedExams(new Set(filteredExams.map(e => e.id)));
    }
  };

  const bulkPublish = async () => {
    setBusy(true);
    let updated = 0;
    const errors: string[] = [];
    for (const id of selectedExams) {
      try {
        await browserApiFetch(`/api/admin/exams/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "published" }),
        });
        updated++;
      } catch (err) {
        errors.push(String(id));
      }
    }
    setExams(e => e.map(x => selectedExams.has(x.id) ? { ...x, status: "published" } : x));
    setSelectedExams(new Set());
    setStatusMessage(`Published ${updated} test(s). ${errors.length > 0 ? `${errors.length} failed.` : ""}`);
    setBusy(false);
  };

  const bulkUnpublish = async () => {
    setBusy(true);
    let updated = 0;
    const errors: string[] = [];
    for (const id of selectedExams) {
      try {
        await browserApiFetch(`/api/admin/exams/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "draft" }),
        });
        updated++;
      } catch (err) {
        errors.push(String(id));
      }
    }
    setExams(e => e.map(x => selectedExams.has(x.id) ? { ...x, status: "draft" } : x));
    setSelectedExams(new Set());
    setStatusMessage(`Unpublished ${updated} test(s). ${errors.length > 0 ? `${errors.length} failed.` : ""}`);
    setBusy(false);
  };

  // Read productId from URL query params on mount
  useEffect(() => {
    const productIdParam = searchParams.get("productId");
    if (productIdParam) {
      const productId = Number(productIdParam);
      if (!isNaN(productId)) {
        setExamFilterProductId(productId);
      }
    }
  }, [searchParams]);

  async function createExam() {
    setBusy(true);
    try {
      if (editingExam) {
        const updated = await browserApiFetch<AdminExam>(
          "/api/admin/exams/" + editingExam.id,
          { method: "PATCH", body: JSON.stringify({ title: examForm.title, timeLimitMinutes: Number(examForm.timeLimitMinutes), passThreshold: Number(examForm.passThreshold), status: examForm.status }) },
        );
        setExams((e) => e.map((x) => x.id === editingExam.id ? { ...x, ...updated } : x));
        setStatusMessage('Test "' + updated.title + '" updated.');
      } else {
        const payload = {
          title: examForm.title,
          productId: Number(examForm.productId),
          timeLimitMinutes: Number(examForm.timeLimitMinutes),
          passThreshold: Number(examForm.passThreshold),
          status: examForm.status,
        };
        const created = await browserApiFetch<AdminExam>("/api/admin/exams", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setExams((e) => [created, ...e]);
        setStatusMessage('Test "' + created.title + '" created.');
      }
      setShowExamForm(false);
      setEditingExam(null);
      setExamForm({ slug: "", title: "", productId: products[0]?.id?.toString() ?? "1", timeLimitMinutes: "180", passThreshold: "70", status: "draft" });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save test.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleExamStatus(id: number, current: string) {
    const next = current === "published" ? "draft" : "published";
    setBusy(true);
    try {
      await browserApiFetch<{ id: number; status: string }>(
        "/api/admin/exams/" + id + "/status",
        { method: "PATCH", body: JSON.stringify({ status: next }) },
      );
      setExams((e) =>
        e.map((x) =>
          x.id === id ? { ...x, status: next as AdminExam["status"] } : x,
        ),
      );
      setStatusMessage("Exam " + id + " is now " + next + ".");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update exam status.");
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

      {showExamForm && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-bold">
            <i className="bi bi-pencil-square me-2"></i>{editingExam ? "Edit Test" : "New Test"}
          </div>
          <div className="card-body">
            <form onSubmit={(e) => { e.preventDefault(); createExam(); }}>
              <div className="row g-3">
                {editingExam && (
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Slug <span className="text-muted fw-normal">(auto-generated)</span></label>
                    <input className="form-control form-control-sm bg-light" value={examForm.slug} disabled />
                  </div>
                )}
                <div className={editingExam ? "col-md-4" : "col-md-6"}>
                  <label className="form-label small fw-semibold">Title</label>
                  <input className="form-control form-control-sm" placeholder="Test title" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} required />
                </div>
                <div className={editingExam ? "col-md-4" : "col-md-6"}>
                  <label className="form-label small fw-semibold">Exam (Product)</label>
                  <select className="form-select form-select-sm" value={examForm.productId} onChange={(e) => setExamForm({ ...examForm, productId: e.target.value })} disabled={!!editingExam}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Time Limit (min)</label>
                  <input type="number" className="form-control form-control-sm" value={examForm.timeLimitMinutes} onChange={(e) => setExamForm({ ...examForm, timeLimitMinutes: e.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Pass Threshold (%)</label>
                  <input type="number" className="form-control form-control-sm" min="0" max="100" value={examForm.passThreshold} onChange={(e) => setExamForm({ ...examForm, passThreshold: e.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Status</label>
                  <select className="form-select form-select-sm" value={examForm.status} onChange={(e) => setExamForm({ ...examForm, status: e.target.value as "draft" | "published" })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
                  {busy ? "Saving..." : editingExam ? "Update Test" : "Create Test"}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowExamForm(false); setEditingExam(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedExams.size > 0 && (
        <div className="alert alert-info py-2 mb-3 d-flex justify-content-between align-items-center">
          <span className="small fw-semibold">{selectedExams.size} test(s) selected</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" onClick={bulkPublish} disabled={busy}>
              <i className="bi bi-check-circle me-1"></i>Publish
            </button>
            <button className="btn btn-sm btn-secondary" onClick={bulkUnpublish} disabled={busy}>
              <i className="bi bi-eye-slash me-1"></i>Unpublish
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedExams(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={examFilterProductId === "all" ? "all" : String(examFilterProductId)} onChange={(e) => setExamFilterProductId(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">All Products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select className="form-select form-select-sm" style={{ width: "auto" }} value={examFilterStatus} onChange={(e) => setExamFilterStatus(e.target.value as "all" | "draft" | "published")}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="btn-group btn-group-sm" role="group" aria-label="View mode">
            <button
              type="button"
              className={`btn ${viewMode === "list" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <i className="bi bi-table"></i>
            </button>
            <button
              type="button"
              className={`btn ${viewMode === "cards" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setViewMode("cards")}
              title="Cards view"
            >
              <i className="bi bi-grid"></i>
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingExam(null); setExamForm({ slug: "", title: "", productId: products[0]?.id?.toString() ?? "1", timeLimitMinutes: "180", passThreshold: "70", status: "draft" }); setShowExamForm(true); }} disabled={busy}>
            <i className="bi bi-plus-lg me-1"></i>Create Test
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={selectedExams.size > 0 && selectedExams.size === filteredExams.length}
                      onChange={toggleSelectAll}
                      disabled={filteredExams.length === 0}
                    />
                  </th>
                  <th>Exam Name</th>
                  <th>Product</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((e) => (
                  <tr key={e.id} className={selectedExams.has(e.id) ? "table-primary" : ""}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        checked={selectedExams.has(e.id)}
                        onChange={() => toggleSelectExam(e.id)}
                        disabled={busy}
                      />
                    </td>
                    <td className="fw-semibold">{e.title}</td>
                    <td className="small text-muted">{products.find((p) => p.id === e.productId)?.title ?? e.productId}</td>
                    <td>{e.questionCount}</td>
                    <td>{e.timeLimitMinutes} min</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button className="btn btn-outline-info btn-sm" title="View Questions" onClick={() => router.push(`/admin/questions?examId=${e.id}`)} disabled={busy}>
                          <i className="bi bi-list-check"></i>
                        </button>
                        <button className="btn btn-outline-primary btn-sm" title="Add Question" onClick={() => router.push(`/admin/questions?examId=${e.id}&action=add`)} disabled={busy}>
                          <i className="bi bi-plus-lg"></i>
                        </button>
                        <button 
                          className="btn btn-outline-success btn-sm" 
                          title="Preview ALL questions"
                          onClick={() => { setPreviewExamId(e.id); setPreviewExamTitle(e.title); }}
                        >
                          <i className="bi bi-play-fill"></i>
                        </button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => { setEditingExam(e); setExamForm({ slug: e.slug, title: e.title, productId: String(e.productId), timeLimitMinutes: String(e.timeLimitMinutes), passThreshold: String(e.passThreshold), status: e.status }); setShowExamForm(true); }} disabled={busy}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => toggleExamStatus(e.id, e.status)} disabled={busy}>
                          {e.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExams.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-4">No exams found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {filteredExams.length === 0 ? (
            <div className="text-center text-muted py-4">No exams found</div>
          ) : (
            <div className="product-grid">
              {filteredExams.map((e) => (
                <div key={e.id} className={`product-card ${e.status}`}>
                  <div className="product-header">
                    <div className="product-title">{e.title}</div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="product-meta">
                    <span>
                      <i className="bi bi-box"></i>
                      {products.find((p) => p.id === e.productId)?.title ?? e.productId}
                    </span>
                    <span>
                      <i className="bi bi-question-circle"></i>
                      {e.questionCount} questions
                    </span>
                    <span>
                      <i className="bi bi-clock"></i>
                      {e.timeLimitMinutes} min
                    </span>
                    <span>
                      <i className="bi bi-check-circle"></i>
                      {e.passThreshold}% pass
                    </span>
                  </div>
                  <div className="product-actions">
                    <button 
                      className="btn btn-sm btn-outline-success" 
                      title="Preview"
                      onClick={() => { setPreviewExamId(e.id); setPreviewExamTitle(e.title); }}
                    >
                      <i className="bi bi-play-fill me-1"></i>Preview
                    </button>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditingExam(e); setExamForm({ slug: e.slug, title: e.title, productId: String(e.productId), timeLimitMinutes: String(e.timeLimitMinutes), passThreshold: String(e.passThreshold), status: e.status }); setShowExamForm(true); }} disabled={busy}>
                      <i className="bi bi-pencil me-1"></i>Edit
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleExamStatus(e.id, e.status)} disabled={busy}>
                      {e.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PreviewModal
        examId={previewExamId}
        examTitle={previewExamTitle}
        open={previewExamId !== null}
        onClose={() => setPreviewExamId(null)}
      />
    </>
  );
}
