"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProductManager } from "../../components/admin/ProductManager";
import { browserApiFetch } from "../../../lib/api";
import type { AdminProduct, AdminExam } from "../../../lib/admin-api";

interface ProductsContentProps {
  initialProducts: AdminProduct[];
  exams: AdminExam[];
}

export function ProductsContent({ initialProducts, exams }: ProductsContentProps) {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [busy, setBusy] = useState(false);

  const handleCreate = useCallback(async (product: Omit<AdminProduct, "id" | "slug">) => {
    const created = await browserApiFetch<AdminProduct>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(product),
    });
    setProducts((prev) => [created, ...prev]);
  }, []);

  const handleUpdate = useCallback(async (id: number, product: Partial<AdminProduct>) => {
    const updated = await browserApiFetch<AdminProduct>(`/api/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(product),
    });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  }, []);

  const handleToggleVisibility = useCallback(async (id: number, currentVisibility: string) => {
    const next = currentVisibility === "published" ? "archived" : "published";
    setBusy(true);
    try {
      await browserApiFetch<{ id: number; visibility: string }>(`/api/admin/products/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ visibility: next }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, visibility: next as AdminProduct["visibility"] } : p))
      );
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <ProductManager
      products={products}
      exams={exams}
      busy={busy}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onToggleVisibility={handleToggleVisibility}
      onViewTests={(productId) => router.push(`/admin/exams?productId=${productId}`)}
    />
  );
}
