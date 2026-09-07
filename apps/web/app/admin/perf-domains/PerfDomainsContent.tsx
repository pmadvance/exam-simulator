"use client";

import { useState, useCallback } from "react";
import { browserApiFetch } from "../../../lib/api";
import { DomainManagementTab } from "../../components/admin/DomainManagementTab";
import type { AdminDomain, AdminProduct } from "../../../lib/admin-api";

interface PerfDomainsContentProps {
  initialDomains: AdminDomain[];
  products: AdminProduct[];
}

export function PerfDomainsContent({ initialDomains, products }: PerfDomainsContentProps) {
  const [domains, setDomains] = useState<AdminDomain[]>(initialDomains);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleRefresh = useCallback(async () => {
    const data = await browserApiFetch<AdminDomain[]>("/api/admin/performance-domains");
    setDomains(data);
  }, []);

  const handleCreate = useCallback(async (productId: number, name: string, description: string) => {
    setBusy(true);
    try {
      const created = await browserApiFetch<AdminDomain>("/api/admin/performance-domains", {
        method: "POST",
        body: JSON.stringify({ productId, name, description: description || null }),
      });
      setDomains((d) => [...d, created]);
      setStatusMessage(`Delivery Approach "${created.name}" created.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create Delivery Approach.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleUpdate = useCallback(async (id: number, name: string, description: string) => {
    setBusy(true);
    try {
      await browserApiFetch<AdminDomain>("/api/admin/performance-domains/" + id, {
        method: "PATCH",
        body: JSON.stringify({ name, description: description || null }),
      });
      setDomains((d) => d.map((x) => x.id === id ? { ...x, name, description: description || null } : x));
      setStatusMessage(`Delivery Approach updated.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update Delivery Approach.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    setBusy(true);
    try {
      await browserApiFetch<void>("/api/admin/performance-domains/" + id, { method: "DELETE" });
      setDomains((d) => d.filter((x) => x.id !== id));
      setStatusMessage("Delivery Approach deleted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete Delivery Approach.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button type="button" className="btn-close" onClick={() => setStatusMessage("")} />
        </div>
      )}
      <DomainManagementTab
        title="Delivery Approaches"
        icon="bi-bullseye"
        description="Knowledge/process area domains. Each product can have different Performance domains."
        domains={domains}
        products={products}
        busy={busy}
        variant="performance"
        onRefresh={handleRefresh}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
