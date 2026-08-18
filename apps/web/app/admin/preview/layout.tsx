import { ReactNode } from "react";

// This layout overrides the parent admin layout
// Preview page renders without sidebar/navbar for modal-like experience
export default function PreviewLayout({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <div style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
