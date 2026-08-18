/* Skeleton building blocks — pure CSS, no JS needed */

type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
};

export function Skeleton({ className = "", width, height, borderRadius, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

/* Common skeleton layouts */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-card">
      <div className="d-flex align-items-center gap-3 mb-3">
        <Skeleton className="skeleton-avatar" />
        <div style={{ flex: 1 }}>
          <Skeleton className="skeleton-text" width="60%" />
          <Skeleton className="skeleton-text-sm" width="40%" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="skeleton-text" width={i === lines - 1 ? "70%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, i) => (
        <div className="col-6 col-md-3" key={i}>
          <div className="skeleton-card">
            <div className="d-flex align-items-start gap-3">
              <Skeleton width={42} height={42} borderRadius={8} />
              <div style={{ flex: 1 }}>
                <Skeleton height={24} width="50%" style={{ marginBottom: 6 }} />
                <Skeleton className="skeleton-text-sm" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="d-flex gap-4 p-3" style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={11} width={`${60 + Math.random() * 40}px`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="d-flex gap-4 p-3" style={{ borderBottom: r < rows - 1 ? "1px solid #F3F4F6" : "none" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={`${50 + Math.random() * 60}px`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="container py-4 animate-fade">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <Skeleton height={12} width={90} style={{ marginBottom: 10 }} />
          <Skeleton height={28} width={220} />
        </div>
        <Skeleton className="skeleton-btn" />
      </div>
      <SkeletonStatCards />
      <div className="row g-3 mt-1">
        <div className="col-lg-8">
          <div className="skeleton-card">
            <Skeleton className="skeleton-heading" width="30%" />
            <Skeleton className="skeleton-chart" />
          </div>
        </div>
        <div className="col-lg-4">
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCheckout() {
  return (
    <div className="container py-5 animate-fade" style={{ maxWidth: 960 }}>
      <Skeleton className="skeleton-heading" width="35%" />
      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <SkeletonCard lines={5} />
        </div>
        <div className="col-lg-5">
          <div className="skeleton-card">
            <Skeleton className="skeleton-text" width="50%" />
            <Skeleton height={40} width="100%" style={{ marginTop: 12, borderRadius: 8 }} />
            <Skeleton height={40} width="100%" style={{ marginTop: 8, borderRadius: 8 }} />
            <Skeleton className="skeleton-btn" style={{ marginTop: 16, width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonPerformance() {
  return (
    <div className="container py-4 animate-fade">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <Skeleton height={28} width={240} />
        </div>
        <Skeleton className="skeleton-btn" />
      </div>
      <SkeletonStatCards />
      <div className="mt-4">
        <div className="d-flex gap-2 mb-3">
          {[80, 100, 90].map((w, i) => (
            <Skeleton key={i} height={34} width={w} borderRadius={8} />
          ))}
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    </div>
  );
}
