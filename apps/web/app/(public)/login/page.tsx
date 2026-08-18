import { Suspense } from "react";

import { LoginScreen } from "./screen";
import { Skeleton } from "../../components/Skeleton";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="d-flex align-items-center justify-content-center min-vh-100 animate-fade">
        <div style={{ width: 400, maxWidth: "90vw" }}>
          <Skeleton height={36} width={180} style={{ margin: "0 auto 24px", display: "block" }} />
          <div className="skeleton-card"><Skeleton height={40} style={{ marginBottom: 12 }} /><Skeleton height={40} style={{ marginBottom: 16 }} /><Skeleton height={42} borderRadius={8} /></div>
        </div>
      </div>
    }>
      <LoginScreen />
    </Suspense>
  );
}