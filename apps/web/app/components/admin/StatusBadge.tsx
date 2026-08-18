"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase().trim();

  const map: Record<string, { className: string; label: string }> = {
    published: { className: "badge-success-soft", label: "Published" },
    active: { className: "badge-success-soft", label: "Active" },
    paid: { className: "badge-success-soft", label: "Paid" },
    added: { className: "badge-success-soft", label: "Added" },
    rewarded: { className: "badge-success-soft", label: "Rewarded" },
    draft: { className: "badge-warning-soft", label: "Draft" },
    pending: { className: "badge-warning-soft", label: "Pending" },
    expiring: { className: "badge-warning-soft", label: "Expiring" },
    changed: { className: "badge-accent-soft", label: "Modified" },
    archived: { className: "badge-neutral-soft", label: "Archived" },
    suspended: { className: "badge-danger-soft", label: "Suspended" },
    failed: { className: "badge-danger-soft", label: "Failed" },
    expired: { className: "badge-danger-soft", label: "Expired" },
    removed: { className: "badge-danger-soft", label: "Removed" },
    unchanged: { className: "badge-neutral-soft", label: "Unchanged" },
    easy: { className: "badge-success-soft", label: "Easy" },
    medium: { className: "badge-warning-soft", label: "Medium" },
    hard: { className: "badge-danger-soft", label: "Hard" },
    student: { className: "badge-neutral-soft", label: "Student" },
    admin: { className: "badge-primary-soft", label: "Admin" },
    "super admin": { className: "badge-warning-soft", label: "Super Admin" },
    "content_admin": { className: "badge-primary-soft", label: "Content Admin" },
    "support_admin": { className: "badge-primary-soft", label: "Support Admin" },
    "org member": { className: "badge-accent-soft", label: "Org Member" },
  };

  const style = map[normalized] ?? {
    className: "badge-neutral-soft",
    label: status,
  };

  return (
    <span
      className={`badge ${style.className}`}
      style={{ textTransform: "capitalize" }}
    >
      {style.label}
    </span>
  );
}
