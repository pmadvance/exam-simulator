"use client";

import React, { useState, useCallback, useMemo } from "react";
import { OrderManager } from "../../components/admin/OrderManager";
import { browserApiFetch } from "../../../lib/api";
import type { AdminOrder } from "../../../lib/admin-api";

interface OrdersContentProps {
  initialOrders: AdminOrder[];
}

export function OrdersContent({ initialOrders }: OrdersContentProps) {
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const matchesSearch =
        query === "" ||
        String(o.id).includes(query) ||
        o.userEmail.toLowerCase().includes(query) ||
        o.productTitle.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleReconcile = useCallback(async (orderId: number) => {
    const status = prompt("New status (paid/failed/refunded):") ?? "paid";
    const reason = prompt("Reason:") ?? "Manual reconciliation";

    try {
      setBusy(true);
      await browserApiFetch(`/api/admin/orders/${orderId}/reconcile`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason }),
      });
      setOrders((o) => o.map((x) => (x.id === orderId ? { ...x, status } : x)));
      alert(`Order #${orderId} reconciled to ${status}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to reconcile order.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <OrderManager
      orders={filteredOrders}
      busy={busy}
      onReconcile={handleReconcile}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
    />
  );
}
