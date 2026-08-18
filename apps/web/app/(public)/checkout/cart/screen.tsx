"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SkeletonCheckout } from "../../../components/Skeleton";
import {
  browserApiFetch,
  getRefCookie,
  type CheckoutResult,
  type PaymentGatewayAvailability,
  type ProductDetail,
  type VoucherApplyResult,
  apiUrl,
} from "../../../../lib/api";
import { useCurrency } from "../../../../lib/currency";

const BUNDLE_DISCOUNT_PERCENT = 10;
type PaymentProvider = "toyyibpay" | "stripe" | "paypal" | "billplz";

export function CartCheckoutScreen() {
  const searchParams = useSearchParams();
  const productSlugs = (searchParams.get("products") ?? "").split(",").filter(Boolean);

  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [gatewayAvailability, setGatewayAvailability] = useState<PaymentGatewayAvailability>({
    toyyibpay: { enabled: false, configured: false },
    stripe: { enabled: false, configured: false },
    paypal: { enabled: false, configured: false },
    billplz: { enabled: false, configured: false },
  });
  const [activeProvider, setActiveProvider] = useState<PaymentProvider | null>(null);

  // Registration fields (guest)
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherResult, setVoucherResult] = useState<VoucherApplyResult | null>(null);
  const [voucherError, setVoucherError] = useState("");

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{ email: string; fullName: string } | null>(null);
  const { formatUsd } = useCurrency();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const loaded: ProductDetail[] = [];
      for (const slug of productSlugs) {
        try {
          const res = await fetch(`${apiUrl}/api/products/${slug}`, { cache: "no-store" });
          if (res.ok) {
            loaded.push((await res.json()) as ProductDetail);
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) setProducts(loaded);

      try {
        const me = await browserApiFetch<{ id: number; email: string; fullName: string }>("/api/auth/me");
        if (!cancelled && me?.email) {
          setIsLoggedIn(true);
          setLoggedInUser(me);
        }
      } catch { /* not logged in */ }

      try {
        const res = await fetch(`${apiUrl}/api/payment-gateways`, { cache: "no-store" });
        if (res.ok && !cancelled) {
          setGatewayAvailability((await res.json()) as PaymentGatewayAvailability);
        }
      } catch { /* ignore */ }

      if (!cancelled) setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = products.reduce((sum, p) => sum + p.priceUsd, 0);
  const hasBundle = products.length > 1;
  const discount = hasBundle ? Math.round(subtotal * BUNDLE_DISCOUNT_PERCENT / 100) : 0;
  const voucherDiscount = voucherResult?.discount ?? 0;
  const total = subtotal - discount - voucherDiscount;

  async function handleApplyVoucher() {
    if (!voucherCode.trim() || !products[0]) return;
    setVoucherError("");
    setBusy(true);
    try {
      const result = await browserApiFetch<VoucherApplyResult>("/api/checkout/apply-voucher", {
        method: "POST",
        body: JSON.stringify({ code: voucherCode.trim(), productSlug: products[0].slug }),
      });
      setVoucherResult(result);
    } catch (err) {
      setVoucherResult(null);
      setVoucherError(err instanceof Error ? err.message : "Invalid voucher code.");
    } finally { setBusy(false); }
  }

  async function handleCheckout(provider: PaymentProvider) {
    setError("");
    setActiveProvider(provider);
    setBusy(true);
    setTotalItems(products.length);
    setSuccessCount(0);

    try {
      const selectedGateway = gatewayAvailability[provider];
      if (!selectedGateway?.enabled || !selectedGateway.configured) {
        setError("Payment is temporarily unavailable. Please contact support.");
        setBusy(false);
        setActiveProvider(null);
        return;
      }

      // For multi-product cart, process each product sequentially.
      // The first one goes through payment; remaining are handled separately.
      // For simplicity, redirect to first product's checkout.
      // If only one product, go directly to its checkout.
      if (products.length === 1) {
        const body: Record<string, unknown> = { productSlug: products[0].slug, provider };
        if (!isLoggedIn) {
          if (!fullName.trim() || !email.trim() || !password.trim()) {
            setError("Please fill in all registration fields."); setBusy(false); return;
          }
          if (password.length < 8) { setError("Password must be at least 8 characters."); setBusy(false); return; }
          if (!privacyAccepted) { setError("Please agree to the Terms of Use and Privacy Notice."); setBusy(false); return; }
          body.fullName = fullName.trim();
          body.age = age ? Number(age) : undefined;
          body.occupation = occupation.trim() || undefined;
          body.gender = gender || undefined;
          body.email = email.trim();
          body.password = password;
          body.privacyAccepted = true;
        }
        if (voucherCode.trim()) body.voucherCode = voucherCode.trim();
        if (!isLoggedIn) {
          const ref = getRefCookie();
          if (ref) body.referralCode = ref;
        }
        const result = await browserApiFetch<CheckoutResult>("/api/checkout/register-and-pay", {
          method: "POST", body: JSON.stringify(body),
        });
        window.location.href = result.paymentUrl;
        return;
      }

      // Multi-product: create orders sequentially, redirect to first payment
      // Guest needs to register first via the first product
      let firstPaymentUrl: string | null = null;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const body: Record<string, unknown> = { productSlug: product.slug, provider };

        if (i === 0 && !isLoggedIn) {
          if (!fullName.trim() || !email.trim() || !password.trim()) {
            setError("Please fill in all registration fields."); setBusy(false); return;
          }
          if (password.length < 8) { setError("Password must be at least 8 characters."); setBusy(false); return; }
          if (!privacyAccepted) { setError("Please agree to the Terms of Use and Privacy Notice."); setBusy(false); return; }
          body.fullName = fullName.trim();
          body.age = age ? Number(age) : undefined;
          body.occupation = occupation.trim() || undefined;
          body.gender = gender || undefined;
          body.email = email.trim();
          body.password = password;
          body.privacyAccepted = true;
          const ref = getRefCookie();
          if (ref) body.referralCode = ref;
        }

        try {
          const result = await browserApiFetch<CheckoutResult>("/api/checkout/register-and-pay", {
            method: "POST", body: JSON.stringify(body),
          });
          setSuccessCount((c) => c + 1);
          if (i === 0) firstPaymentUrl = result.paymentUrl;
        } catch (err) {
          // If the first order fails (e.g., already enrolled), skip it
          if (i === 0 && !firstPaymentUrl) {
            // Continue to next product
          }
          // Log but continue
          console.error(`Order for ${product.slug} failed:`, err);
        }
      }

      if (firstPaymentUrl) {
        window.location.href = firstPaymentUrl;
      } else {
        setError("All products may already be purchased or checkout failed.");
        setBusy(false);
        setActiveProvider(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBusy(false);
      setActiveProvider(null);
    }
  }

  if (loading) {
    return <SkeletonCheckout />;
  }

  if (products.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h2>Your cart is empty</h2>
        <p className="text-muted">No products selected.</p>
        <Link href="/" className="btn btn-primary mt-3">Browse catalog</Link>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="mb-4">
        <Link href="/" className="text-decoration-none">&larr; Back to catalog</Link>
      </div>

      <h1 className="h3 mb-4">Cart Checkout</h1>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              {!isLoggedIn ? (
                <>
                  <h2 className="h5 mb-3">Create your account</h2>
                  <p className="text-muted small mb-3">
                    Already have an account? <Link href={`/login?next=/checkout/cart?products=${productSlugs.join(",")}`}>Login here</Link>
                  </p>
                  <div className="mb-3">
                    <label htmlFor="fullName" className="form-label">Full name</label>
                    <input type="text" className="form-control" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email address</label>
                    <input type="email" className="form-control" id="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
                  </div>
                  <div className="row g-3">
                    <div className="col-sm-4">
                      <label htmlFor="cartAge" className="form-label">Age</label>
                      <input type="number" className="form-control" id="cartAge" min={13} max={120} value={age} onChange={(e) => setAge(e.target.value)} disabled={busy} />
                    </div>
                    <div className="col-sm-8">
                      <label htmlFor="cartOccupation" className="form-label">Occupation</label>
                      <input type="text" className="form-control" id="cartOccupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Project manager" maxLength={120} disabled={busy} />
                    </div>
                  </div>
                  <div className="mb-3 mt-3">
                    <label htmlFor="cartGender" className="form-label">Gender</label>
                    <select className="form-select" id="cartGender" value={gender} onChange={(e) => setGender(e.target.value)} disabled={busy}>
                      <option value="">Prefer not to say</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input type="password" className="form-control" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" disabled={busy} />
                  </div>
                  <div className="form-check mb-3">
                    <input
                      id="cartPrivacyAccepted"
                      className="form-check-input"
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      disabled={busy}
                    />
                    <label className="form-check-label small" htmlFor="cartPrivacyAccepted">
                      I agree to the <Link href="/terms" target="_blank">Terms of Use</Link> and <Link href="/privacy" target="_blank">Privacy Notice</Link>.
                    </label>
                  </div>
                  <hr />
                </>
              ) : (
                <div className="alert alert-light border d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-person-check-fill text-success" />
                  <span className="small">Purchasing as <strong>{loggedInUser?.fullName ?? loggedInUser?.email}</strong></span>
                </div>
              )}

              <h2 className="h5 mb-3">Voucher code</h2>
              <div className="input-group mb-2">
                <input type="text" className="form-control" placeholder="Voucher code (optional)" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} disabled={busy} />
                <button className="btn btn-outline-secondary" onClick={handleApplyVoucher} disabled={busy || !voucherCode.trim()}>Apply</button>
              </div>
              {voucherResult && <p className="text-success small mb-0">Discount {formatUsd(voucherResult.discount)} applied!</p>}
              {voucherError && <p className="text-danger small mb-0">{voucherError}</p>}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Order summary</h2>

              {products.map((p) => (
                <div key={p.slug} className="d-flex justify-content-between mb-2">
                  <span>{p.title}</span>
                  <span>{formatUsd(p.priceUsd)}</span>
                </div>
              ))}

              {hasBundle && (
                <div className="d-flex justify-content-between text-success mb-2">
                  <span>Bundle discount ({BUNDLE_DISCOUNT_PERCENT}%)</span>
                  <span>-{formatUsd(discount)}</span>
                </div>
              )}

              {voucherResult && (
                <div className="d-flex justify-content-between text-success mb-2">
                  <span>Voucher discount</span>
                  <span>-{formatUsd(voucherResult.discount)}</span>
                </div>
              )}

              <hr />
              <div className="d-flex justify-content-between mb-3">
                <strong>Total</strong>
                <strong>{formatUsd(total)}</strong>
              </div>

              <ul className="list-unstyled small text-muted mb-3">
                {products.map((p) => (
                  <li key={p.slug}>&#10003; {p.title} — {p.accessDays} days access</li>
                ))}
              </ul>

              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              {!(gatewayAvailability.toyyibpay.enabled && gatewayAvailability.toyyibpay.configured) &&
              !(gatewayAvailability.stripe.enabled && gatewayAvailability.stripe.configured) &&
              !(gatewayAvailability.paypal.enabled && gatewayAvailability.paypal.configured) &&
              !(gatewayAvailability.billplz.enabled && gatewayAvailability.billplz.configured) ? (
                <div className="alert alert-warning py-2 small">
                  Payment is temporarily unavailable. Please contact support.
                </div>
              ) : null}

              {totalItems > 0 && successCount < totalItems && (
                <div className="mb-2">
                  <small className="text-muted">Processing {successCount}/{totalItems}...</small>
                  <div className="progress" style={{ height: 4 }}>
                    <div className="progress-bar" style={{ width: `${(successCount / totalItems) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="d-grid gap-2">
                {gatewayAvailability.toyyibpay.enabled && gatewayAvailability.toyyibpay.configured && (
                  <button className="btn btn-primary w-100 py-2" onClick={() => void handleCheckout("toyyibpay")} disabled={busy}>
                    {busy && activeProvider === "toyyibpay" ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" />Processing ToyyibPay...</>
                    ) : (
                      `Pay ${formatUsd(total)} with ToyyibPay`
                    )}
                  </button>
                )}
                {gatewayAvailability.stripe.enabled && gatewayAvailability.stripe.configured && (
                  <button className="btn btn-outline-dark w-100 py-2" onClick={() => void handleCheckout("stripe")} disabled={busy}>
                    {busy && activeProvider === "stripe" ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" />Processing Stripe...</>
                    ) : (
                      `Pay ${formatUsd(total)} with Stripe`
                    )}
                  </button>
                )}
                {gatewayAvailability.paypal.enabled && gatewayAvailability.paypal.configured && (
                  <button className="btn btn-outline-primary w-100 py-2" onClick={() => void handleCheckout("paypal")} disabled={busy}>
                    {busy && activeProvider === "paypal" ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" />Processing PayPal...</>
                    ) : (
                      `Pay ${formatUsd(total)} with PayPal`
                    )}
                  </button>
                )}
                {gatewayAvailability.billplz.enabled && gatewayAvailability.billplz.configured && (
                  <button className="btn btn-outline-success w-100 py-2" onClick={() => void handleCheckout("billplz")} disabled={busy}>
                    {busy && activeProvider === "billplz" ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" />Processing Billplz...</>
                    ) : (
                      `Pay ${formatUsd(total)} with Billplz`
                    )}
                  </button>
                )}
              </div>

              <p className="text-muted text-center small mt-2 mb-0">
                {products.length > 1 ? "Each product will be invoiced separately." : "You will be redirected to a secure payment page."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
