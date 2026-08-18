"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { BrandLogo } from "../components/BrandLogo";
import { Sidebar } from "../components/admin/Sidebar";

export function AdminLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't show sidebar on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <>
      {/* Fixed Header */}
      <header className="admin-header">
        <div className="d-flex align-items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="btn btn-sm btn-link text-muted d-lg-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding: 4 }}
          >
            <i className="bi bi-list fs-5"></i>
          </button>
          <a href="/admin" className="admin-logo">
            <BrandLogo size="compact" />
          </a>
        </div>
        <div className="admin-user-menu">
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Super Admin</span>
          <div className="admin-user-avatar">SA</div>
        </div>
      </header>

      {/* Sidebar + Main */}
      <div className="admin-layout">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="d-lg-none"
            style={{
              position: "fixed",
              top: 64,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 89,
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </aside>
        <main className="admin-main">
          {children}
        </main>
      </div>
    </>
  );
}
