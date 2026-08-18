"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PRIMARY = "#E8792B";

interface SidebarItem {
  key: string;
  label: string;
  icon: string;
  href: string;
}

interface SidebarSection {
  id: string;
  label: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { key: "overview", label: "Dashboard", icon: "bi-speedometer2", href: "/admin" },
      { key: "reports", label: "Reports", icon: "bi-graph-up", href: "/admin/reports" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { key: "products", label: "Exams", icon: "bi-box-seam", href: "/admin/products" },
      { key: "exams", label: "Tests", icon: "bi-journal-text", href: "/admin/exams" },
      { key: "questions", label: "Questions", icon: "bi-question-circle", href: "/admin/questions" },
      { key: "assets", label: "Assets", icon: "bi-images", href: "/admin/assets" },
      { key: "eco-domains", label: "ECO Domains", icon: "bi-diagram-3", href: "/admin/eco-domains" },
      { key: "perf-domains", label: "Performance Domains", icon: "bi-bullseye", href: "/admin/perf-domains" },
    ],
  },
  {
    id: "users-sales",
    label: "Users & Sales",
    items: [
      { key: "users", label: "Users", icon: "bi-people", href: "/admin/users" },
      { key: "orders", label: "Orders", icon: "bi-receipt", href: "/admin/orders" },
      { key: "vouchers", label: "Vouchers", icon: "bi-ticket-perforated", href: "/admin/vouchers" },
      { key: "referrals", label: "Referrals", icon: "bi-share", href: "/admin/referrals" },
      { key: "organizations", label: "Organizations", icon: "bi-building", href: "/admin/organizations" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { key: "sessions", label: "Sessions", icon: "bi-wifi", href: "/admin/sessions" },
      { key: "settings", label: "Settings", icon: "bi-sliders", href: "/admin/settings" },
      { key: "audit", label: "Audit Log", icon: "bi-list-check", href: "/admin/audit" },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      { key: "guide", label: "User Guide", icon: "bi-book", href: "/admin/guide" },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-sections");
    if (saved) {
      try {
        setCollapsedSections(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem("admin-sidebar-sections", JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.replace("/admin/login");
    } catch {
      // ignore
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin" || pathname === "/admin/overview";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Navigation */}
      <nav className="flex-grow-1 overflow-auto">
        {sidebarSections.map((section) => {
          const isCollapsed = collapsedSections[section.id];
          return (
            <div key={section.id} className="nav-section">
              <button
                className="nav-header"
                onClick={() => toggleSection(section.id)}
              >
                <span>{section.label}</span>
                <i
                  className={`bi bi-chevron-${isCollapsed ? "left" : "down"} small`}
                  style={{ fontSize: 10, transition: "transform 0.2s" }}
                ></i>
              </button>
              {!isCollapsed && (
                <div>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`nav-item-link ${active ? "active" : ""}`}
                        onClick={onNavigate}
                      >
                        <i className={`bi ${item.icon}`} style={{ width: 20, textAlign: "center", fontSize: 16 }}></i>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-top" style={{ borderColor: "var(--line-soft)" }}>
        <button
          className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={handleSignOut}
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
