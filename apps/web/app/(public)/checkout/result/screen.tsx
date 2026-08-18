"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiUrl, type OrderStatus } from "../../../../lib/api";
import { useCurrency } from "../../../../lib/currency";
import { SkeletonCard } from "../../../components/Skeleton";

export function CheckoutResultScreen() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const statusId = searchParams.get("status_id"); // ToyyibPay: 1=success, 2=pending, 3=fail

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const { formatUsd } = useCurrency();

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function checkStatus() {
      try {
        const res = await fetch(`${apiUrl}/api/checkout/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as OrderStatus;
          if (!cancelled) {
            setOrder(data);
            // If still pending, try to verify with the gateway directly
            if (data.status === "pending" && pollCount < 12) {
              // Trigger server-side verification
              try {
                const verifyRes = await fetch(`${apiUrl}/api/checkout/orders/${orderId}/verify`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                });
                if (verifyRes.ok) {
                  const verifyData = (await verifyRes.json()) as { status: string };
                  if (verifyData.status === "paid") {
                    setOrder({ ...data, status: "paid" });
                    setLoading(false);
                    return; // Stop polling — payment confirmed
                  }
                }
              } catch { /* ignore verify error, keep polling */ }

              timer = setTimeout(() => {
                if (!cancelled) setPollCount((c) => c + 1);
              }, 3000);
            }
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    }

    void checkStatus();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, pollCount]);

  // Determine display state from ToyyibPay status_id param or the order status
  const isPaid = order?.status === "paid" || statusId === "1";
  const isFailed = order?.status === "failed" || statusId === "3";
  const isPending = !isPaid && !isFailed;

  // Show spinner only when we have no indication of the payment outcome yet
  if (loading && !isPaid && !isFailed) {
    return (
      <div className="container py-5 animate-fade" style={{ maxWidth: 600, margin: "0 auto" }}>
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="container py-5 text-center">
        <h2>Invalid request</h2>
        <p className="text-muted">No order ID provided.</p>
        <Link href="/" className="btn btn-primary mt-3">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      <div className="card shadow-sm text-center">
        <div className="card-body py-5">
          {isPaid && (
            <>
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success text-white mb-3"
                style={{ width: 64, height: 64, fontSize: 28 }}
              >
                &#10003;
              </div>
              <h1 className="h3 mb-2">Payment Successful!</h1>
              <p className="text-muted mb-1">
                Your access to <strong>{order?.productTitle ?? "the product"}</strong> is now active.
              </p>
              {order && (
                <p className="text-muted small">
                  Order #{order.id} &middot; {formatUsd(Number(order.totalAmount))}
                </p>
              )}
              <div className="d-flex flex-column gap-2 mt-4" style={{ maxWidth: 280, margin: "0 auto" }}>
                <a href="/me/exams" className="btn btn-primary">
                  Go to My Exams
                </a>
                <a href="/" className="btn btn-outline-secondary">
                  Back to home
                </a>
              </div>
            </>
          )}

          {isFailed && (
            <>
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger text-white mb-3"
                style={{ width: 64, height: 64, fontSize: 28 }}
              >
                &#10007;
              </div>
              <h1 className="h3 mb-2">Payment Failed</h1>
              <p className="text-muted mb-1">
                Your payment for <strong>{order?.productTitle ?? "the product"}</strong> was not completed.
              </p>
              <p className="text-muted small">
                Your account has been created. You can login and try again from your dashboard.
              </p>
              <div className="d-flex flex-column gap-2 mt-4" style={{ maxWidth: 280, margin: "0 auto" }}>
                <a href="/me/exams" className="btn btn-primary">
                  Go to My Exams
                </a>
                {order?.productSlug && (
                  <Link href={`/checkout?product=${order.productSlug}`} className="btn btn-outline-secondary">
                    Try again
                  </Link>
                )}
              </div>
            </>
          )}

          {isPending && (
            <>
              <div className="spinner-border text-warning mb-3" role="status">
                <span className="visually-hidden">Processing...</span>
              </div>
              <h1 className="h3 mb-2">Processing Payment</h1>
              <p className="text-muted mb-1">
                We&apos;re waiting for payment confirmation. This usually takes a few seconds.
              </p>
              <p className="text-muted small">
                Order #{orderId}
              </p>
              {pollCount >= 12 && (
                <div className="alert alert-warning mt-3 small">
                  Payment confirmation is taking longer than expected. You can login to check your order status,
                  or contact support if the issue persists.
                </div>
              )}
              <div className="d-flex flex-column gap-2 mt-4" style={{ maxWidth: 280, margin: "0 auto" }}>
                <a href="/me/exams" className="btn btn-primary">
                  Go to My Exams
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
