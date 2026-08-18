import { ReactNode } from "react";
import { AdminLayoutWrapper } from "./AdminLayoutWrapper";
import { AdminGuard } from "./components/AdminGuard";

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
