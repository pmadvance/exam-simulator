import { Suspense } from "react";

import { ResetPasswordScreen } from "./screen";
import { Skeleton } from "../../components/Skeleton";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="d-flex align-items-center justify-content-center min-vh-100 animate-fade">
        <div style={{ width: 400, maxWidth: "90vw" }}>
          <div className="skeleton-card"><Skeleton height={40} style={{ marginBottom: 12 }} /><Skeleton height={42} borderRadius={8} /></div>
        </div>
      </div>
    }>
      <ResetPasswordScreen />
    </Suspense>
  );
}
