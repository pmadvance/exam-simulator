"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/me/dashboard", label: "Dashboard", icon: "bi-speedometer2" },
  { href: "/me/exams", label: "Exams", icon: "bi-journal-text" },
  { href: "/me/performance", label: "Stats", icon: "bi-graph-up" },
  { href: "/me/account", label: "Account", icon: "bi-person-circle" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav d-md-none" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item${active ? " active" : ""}`}
          >
            <i className={`bi ${item.icon}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
