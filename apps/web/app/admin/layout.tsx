import { ReactNode } from "react";
import { AdminLayoutWrapper } from "./AdminLayoutWrapper";
import { AdminGuard } from "./components/AdminGuard";

// Admin screens depend on the current request's secure session cookies and
// live API data. Do not ask the production build to pre-render them.
export const dynamic = "force-dynamic";

export default function AdminLayout({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <AdminGuard>
      <AdminLayoutWrapper>
        {children}
      </AdminLayoutWrapper>
    </AdminGuard>
  );
}
