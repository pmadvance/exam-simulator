"use client";

import React, { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { AdminOrder } from "../../../lib/admin-api";

interface OrderManagerProps {
  orders: AdminOrder[];
  busy: boolean;
  onReconcile: (orderId: number) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function OrderManager({
  orders,
  busy,
  onReconcile,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: OrderManagerProps) {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedOrders = orders.slice(startIndex, startIndex + pageSize);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setPage(p);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom-0">
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <select
            className="form-select form-select-sm"
            style={{ width: "auto", minWidth: 140 }}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Voucher</th>
              <th>Status</th>
              <th>Date</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.userEmail}</td>
                <td>{o.productTitle}</td>
                <td>USD {o.totalAmount}</td>
                <td className="text-muted">—</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="text-muted small">
                  {o.createdAt
                    ? new Date(o.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="text-end">
                  {o.status === "pending" && (
                    <button
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => onReconcile(o.id)}
                      disabled={busy}
                    >
                      Reconcile
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {orders.length > 0 && (
        <div className="card-footer bg-white border-top-0 d-flex justify-content-center">
          <nav aria-label="Order pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item${page === 1 ? " disabled" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <li
                  key={p}
                  className={`page-item${p === page ? " active" : ""}`}
                >
                  <button className="page-link" onClick={() => goToPage(p)}>
                    {p}
                  </button>
                </li>
              ))}
              <li
                className={`page-item${page === totalPages ? " disabled" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
