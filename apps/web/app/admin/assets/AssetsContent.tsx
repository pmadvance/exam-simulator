"use client";

import { useState, useCallback, useEffect } from "react";
import { browserApiFetch, apiUrl } from "../../../lib/api";
import { AdminModal } from "../components/AdminModal";

interface Asset {
  filename: string;
  url: string;
  size: number;
  modified: string;
  inUse: boolean;
}

interface AssetsContentProps {
  initialAssets: Asset[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssetsContent({ initialAssets }: AssetsContentProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadAssets = useCallback(async () => {
    setBusy(true);
    try {
      const data = await browserApiFetch<Asset[]>("/api/admin/assets");
      setAssets(data);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load assets");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (initialAssets.length === 0) {
      loadAssets();
    }
  }, [initialAssets.length, loadAssets]);

  async function uploadFiles(files: FileList | File[]) {
    if (files.length === 0) return;
    
    const oversized = Array.from(files).filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      setStatusMessage(`Some files are too large (max 5MB): ${oversized.map(f => f.name).join(", ")}`);
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      for (const file of Array.from(files)) {
        fd.append("images", file);
      }
      const res = await fetch(apiUrl + "/api/admin/assets/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = "Upload failed";
        try { const d = JSON.parse(text); msg = d.message || msg; } catch { msg = text || msg; }
        throw new Error(msg);
      }
      const data = await res.json() as { count: number };
      setStatusMessage(`${data.count} image${data.count > 1 ? "s" : ""} uploaded successfully`);
      await loadAssets();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAsset(filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    
    setBusy(true);
    try {
      await browserApiFetch(`/api/admin/assets/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      setStatusMessage("Asset deleted");
      await loadAssets();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
    e.target.value = "";
  }

  function copyToClipboard(filename: string) {
    navigator.clipboard.writeText(filename).then(() => {
      setStatusMessage(`Copied "${filename}" to clipboard`);
    });
  }

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button type="button" className="btn-close" onClick={() => setStatusMessage("")} />
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`card border-0 shadow-sm mb-4 ${dragOver ? "border-primary" : ""}`}
        style={{ border: dragOver ? "2px dashed #0d6efd" : undefined }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="card-body text-center py-5">
          <i className="bi bi-cloud-arrow-up fs-1 text-muted mb-3"></i>
          <h5>Upload Images</h5>
          <p className="text-muted mb-3">
            Drag and drop images here, or click to browse
          </p>
          <p className="small text-muted mb-3">
            Supported: JPEG, PNG, GIF, WebP, SVG (max 5MB each)
          </p>
          <label className="btn btn-primary">
            <i className="bi bi-plus-lg me-2"></i>Choose Files
            <input
              type="file"
              accept="image/*"
              multiple
              className="d-none"
              onChange={handleFileInput}
              disabled={busy}
            />
          </label>
        </div>
      </div>

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-images fs-1 d-block mb-2" style={{ opacity: 0.4 }}></i>
          No images uploaded yet
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="fw-semibold">{assets.length} image{assets.length !== 1 ? "s" : ""}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={loadAssets} disabled={busy}>
              <i className="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>

          <div className="row g-3">
            {assets.map((asset) => (
              <div key={asset.filename} className="col-6 col-md-4 col-lg-3">
                <div className="card h-100 border-0 shadow-sm">
                  <div 
                    className="card-img-top bg-light d-flex align-items-center justify-content-center"
                    style={{ height: 120, cursor: "pointer", overflow: "hidden" }}
                    onClick={() => setPreviewAsset(asset)}
                  >
                    <img
                      src={apiUrl + asset.url}
                      alt={asset.filename}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div className="card-body p-2">
                    <p 
                      className="card-title small fw-semibold mb-1 text-truncate" 
                      title={asset.filename}
                      style={{ cursor: "pointer" }}
                      onClick={() => copyToClipboard(asset.filename)}
                    >
                      {asset.filename}
                    </p>
                    <p className="card-text small text-muted mb-1">
                      {formatBytes(asset.size)}
                    </p>
                    <p className="card-text small text-muted">
                      {formatDate(asset.modified)}
                    </p>
                    {asset.inUse && (
                      <span className="badge bg-success-soft text-success">In Use</span>
                    )}
                  </div>
                  <div className="card-footer bg-white border-0 p-2 pt-0">
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary flex-grow-1"
                        onClick={() => copyToClipboard(asset.filename)}
                        title="Copy filename"
                      >
                        <i className="bi bi-clipboard"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteAsset(asset.filename)}
                        disabled={busy || asset.inUse}
                        title={asset.inUse ? "Cannot delete: image is in use" : "Delete"}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Preview Modal */}
      <AdminModal
        open={!!previewAsset}
        title={previewAsset?.filename || "Image Preview"}
        onClose={() => setPreviewAsset(null)}
        size="lg"
        footer={
          <>
            <button className="btn btn-light" onClick={() => setPreviewAsset(null)}>Close</button>
            {previewAsset && (
              <button 
                className="btn btn-primary" 
                onClick={() => copyToClipboard(previewAsset.filename)}
              >
                <i className="bi bi-clipboard me-1"></i>Copy Filename
              </button>
            )}
          </>
        }
      >
        {previewAsset && (
          <div className="text-center">
            <img
              src={apiUrl + previewAsset.url}
              alt={previewAsset.filename}
              style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 4 }}
            />
            <div className="mt-3 d-flex justify-content-center gap-4 small text-muted">
              <span><strong>Size:</strong> {formatBytes(previewAsset.size)}</span>
              <span><strong>Modified:</strong> {formatDate(previewAsset.modified)}</span>
              {previewAsset.inUse && <span className="text-success"><strong>✓ In use by questions</strong></span>}
            </div>
            <div className="mt-2">
              <code className="bg-light px-2 py-1 rounded">{previewAsset.filename}</code>
            </div>
          </div>
        )}
      </AdminModal>
    </>
  );
}
