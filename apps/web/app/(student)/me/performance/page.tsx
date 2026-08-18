import { Suspense } from "react";
import { PerformanceScreen } from "./screen";
import { SkeletonPerformance } from "../../../../app/components/Skeleton";

export const dynamic = "force-dynamic";

export default function PerformancePage() {
  return (
    <Suspense fallback={<SkeletonPerformance />}>
      <PerformanceScreen />
    </Suspense>
  );
}
