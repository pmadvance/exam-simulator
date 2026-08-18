"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { browserApiFetch } from "../../../lib/api";

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

const ADMIN_ROLES = ["admin", "super_admin", "content_admin", "support_admin"];

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === "/admin/login") {
      setIsChecking(false);
      setIsAuthorized(true);
      return;
    }

    async function checkAuth() {
      try {
        const user = await browserApiFetch<User>("/api/auth/me");
        
        if (!user || !user.role) {
          // Not logged in
          router.replace("/admin/login");
          return;
        }

        if (!ADMIN_ROLES.includes(user.role)) {
          // Logged in but not an admin - redirect to student area
          router.replace("/me/dashboard");
          return;
        }

        // User is an admin
        setIsAuthorized(true);
      } catch {
        // Error fetching user - redirect to login
        router.replace("/admin/login");
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [router, pathname]);

  if (isChecking) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: "#f8f9fa" }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
