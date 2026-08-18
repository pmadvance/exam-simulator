"use client";

import { ReactNode, useEffect } from "react";

export type AdminModalProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  hideHeader?: boolean;
};

const sizeMap: Record<NonNullable<AdminModalProps["size"]>, string> = {
  sm: "modal-sm",
  md: "",
  lg: "modal-lg",
  xl: "modal-xl",
};

export function AdminModal({
  open,
  title,
  onClose,
  children,
  size = "md",
  footer,
  closeOnBackdrop = true,
  hideHeader = false,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div
        className="modal fade show d-block"
        style={{ zIndex: 1055 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && closeOnBackdrop) onClose();
        }}
      >
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${sizeMap[size]}`}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
            {!hideHeader && (
              <div className="modal-header border-0 pb-2">
                <h5 className="modal-title fw-bold" id="admin-modal-title" style={{ fontSize: 18 }}>
                  {title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                />
              </div>
            )}
            <div className="modal-body pt-2">{children}</div>
            {footer && <div className="modal-footer border-0 pt-0">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

export type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger" | "warning";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
};

export function ConfirmModal({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmModalProps) {
  const btnClass =
    variant === "danger"
      ? "btn btn-danger"
      : variant === "warning"
      ? "btn btn-warning"
      : "btn btn-primary";
  return (
    <AdminModal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-light" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{message}</div>
    </AdminModal>
  );
}

export type PromptModalProps = {
  open: boolean;
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
};

import { useState } from "react";

export function PromptModal({
  open,
  title,
  label,
  placeholder,
  defaultValue = "",
  multiline = false,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  busy = false,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  return (
    <AdminModal
      open={open}
      title={title}
      onClose={onCancel}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-light" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onSubmit(value)}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {label && <label className="form-label small fw-semibold">{label}</label>}
      {multiline ? (
        <textarea
          className="form-control"
          rows={4}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      ) : (
        <input
          type="text"
          className="form-control"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) void onSubmit(value);
          }}
        />
      )}
    </AdminModal>
  );
}
