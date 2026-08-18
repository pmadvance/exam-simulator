"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { SkeletonCheckout } from "../../components/Skeleton";

import {
  browserApiFetch,
  getRefCookie,
  type CheckoutResult,
  type PaymentGatewayAvailability,
  type ProductDetail,
  type ProductCard,
  type VoucherApplyResult,
  apiUrl,
} from "../../../lib/api";
import { useCurrency } from "../../../lib/currency";

type PaymentProvider = "toyyibpay" | "stripe" | "paypal" | "billplz";

/* ── lightweight cart helpers (localStorage) ── */
const CART_KEY = "pm_cart";

function getCart(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function saveCart(slugs: string[]) {
  localStorage.setItem(CART_KEY, JSON.stringify([...new Set(slugs)]));
}

function addToCart(slug: string) {
  const cart = getCart();
  if (!cart.includes(slug)) { cart.push(slug); saveCart(cart); }
}

function removeFromCart(slug: string) {
  saveCart(getCart().filter((s) => s !== slug));
}

export function CheckoutScreen() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product") ?? "capm-foundation-pack";

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeProvider, setActiveProvider] = useState<PaymentProvider | null>(null);
  const [gatewayAvailability, setGatewayAvailability] = useState<PaymentGatewayAvailability>({
    toyyibpay: { enabled: false, configured: false },
    stripe: { enabled: false, configured: false },
    paypal: { enabled: false, configured: false },
    billplz: { enabled: false, configured: false },
  });

  // Registration fields (guest)
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [codeStatus, setCodeStatus] = useState("");

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherResult, setVoucherResult] = useState<VoucherApplyResult | null>(null);
  const [voucherError, setVoucherError] = useState("");

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{ email: string; fullName: string } | null>(null);

  // Countdown timer for code cooldown
  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = setTimeout(() => setCodeCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCooldown]);

  const sendVerificationCode = useCallback(async () => {
    if (!email) { setCodeStatus("Enter your email first."); return; }
    setBusy(true);
    try {
      const res = await browserApiFetch<{ message: string; code?: string }>("/api/auth/send-verification-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setCodeSent(true);
      setCodeCooldown(60);
      setCodeStatus(res.code ? `${res.message} (Dev code: ${res.code})` : res.message);
    } catch (err) {
      setCodeStatus(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setBusy(false);
    }
  }, [email]);

  // Cart state
  const [cartSlugs, setCartSlugs] = useState<string[]>([]);
  const [cartProducts, setCartProducts] = useState<ProductCard[]>([]);
  const [allProducts, setAllProducts] = useState<ProductCard[]>([]);
  const [ownedSlugs, setOwnedSlugs] = useState<Set<string>>(new Set());
  const { formatUsd } = useCurrency();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${apiUrl}/api/products/${productSlug}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as ProductDetail;
          if (!cancelled) setProduct(data);
        }
      } catch {
        // ignore
      }

      try {
        const me = await browserApiFetch<{ id: number; email: string; fullName: string }>("/api/auth/me");
        if (!cancelled && me?.email) {
          setIsLoggedIn(true);
          setLoggedInUser(me);

          // Fetch user's active enrollments to filter owned products
          try {
            const enrollments = await browserApiFetch<Array<{ productSlug: string; status: string; expiresAt: string }>>(
              "/api/enrollments"
            );
            if (!cancelled) {
              const owned = new Set(
                enrollments
                  .filter((e) => e.status === "active" && new Date(e.expiresAt) > new Date())
                  .map((e) => e.productSlug)
              );
              setOwnedSlugs(owned);
            }
          } catch { /* ignore */ }
        }
      } catch {
        // not logged in
      }

      // Fetch all products for "Add more items" section
      try {
        const res = await fetch(`${apiUrl}/api/products`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as ProductCard[];
          if (!cancelled) setAllProducts(data);
        }
      } catch { /* ignore */ }

      try {
        const res = await fetch(`${apiUrl}/api/payment-gateways`, { cache: "no-store" });
        if (res.ok && !cancelled) {
          setGatewayAvailability((await res.json()) as PaymentGatewayAvailability);
        }
      } catch { /* ignore */ }

      // Load cart from localStorage
      if (!cancelled) {
        const cart = getCart();
        // Auto-add current product to cart
        if (!cart.includes(productSlug)) {
          addToCart(productSlug);
          setCartSlugs([...cart, productSlug]);
        } else {
          setCartSlugs(cart);
        }
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [productSlug]);

  // Remove owned items from cart when ownedSlugs becomes known
  useEffect(() => {
    if (ownedSlugs.size === 0) return;
    const cart = getCart();
    const filtered = cart.filter((s) => !ownedSlugs.has(s));
    if (filtered.length !== cart.length) {
      saveCart(filtered);
      setCartSlugs(filtered);
    }
  }, [ownedSlugs]);

  // Resolve cart products from allProducts
  useEffect(() => {
    if (allProducts.length === 0) return;
    const others = cartSlugs
      .filter((s) => s !== productSlug)
      .map((s) => allProducts.find((p) => p.slug === s))
      .filter(Boolean) as ProductCard[];
    setCartProducts(others);
  }, [cartSlugs, allProducts, productSlug]);

  const handleAddToCart = useCallback((slug: string) => {
    addToCart(slug);
    setCartSlugs(getCart());
  }, []);

  const handleRemoveFromCart = useCallback((slug: string) => {
    removeFromCart(slug);
    setCartSlugs(getCart());
  }, []);

  const cartTotal = (product?.priceUsd ?? 0) + cartProducts.reduce((sum, p) => sum + p.priceUsd, 0);
  const otherProducts = allProducts.filter((p) => !cartSlugs.includes(p.slug) && !ownedSlugs.has(p.slug));

  async function handleApplyVoucher() {
    if (!voucherCode.trim()) return;
    setVoucherError("");
    setBusy(true);
    try {
      const result = await browserApiFetch<VoucherApplyResult>("/api/checkout/apply-voucher", {
        method: "POST",
        body: JSON.stringify({ code: voucherCode.trim(), productSlug }),
      });
      setVoucherResult(result);
    } catch (err) {
      setVoucherResult(null);
      setVoucherError(err instanceof Error ? err.message : "Invalid voucher code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout(provider: PaymentProvider) {
    setError("");
    setActiveProvider(provider);
    setBusy(true);

    try {
      const selectedGateway = gatewayAvailability[provider];
      if (!selectedGateway.enabled || !selectedGateway.configured) {
        setError("This payment option is currently unavailable.");
        setBusy(false);
        setActiveProvider(null);
        return;
      }

      // Collect all product slugs (current + cart)
      const allSlugs = [productSlug, ...cartProducts.map((p) => p.slug)];

      const body: Record<string, unknown> = {
        productSlug,
        productSlugs: allSlugs,
        provider,
      };

      if (!isLoggedIn) {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          setError("Please fill in all registration fields.");
          setBusy(false);
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          setBusy(false);
          return;
        }
        if (!verificationCode.trim()) {
          setError("Please enter the email verification code.");
          setBusy(false);
          return;
        }
        if (!privacyAccepted) {
          setError("Please agree to the Terms of Use and Privacy Notice.");
          setBusy(false);
          return;
        }
        body.fullName = fullName.trim();
        body.age = age ? Number(age) : undefined;
        body.occupation = occupation.trim() || undefined;
        body.gender = gender || undefined;
        body.email = email.trim();
        body.password = password;
        body.verificationCode = verificationCode.trim();
        body.privacyAccepted = true;
      }

      if (voucherCode.trim()) {
        body.voucherCode = voucherCode.trim();
      }

      if (!isLoggedIn) {
        const ref = getRefCookie();
        if (ref) body.referralCode = ref;
      }

      const result = await browserApiFetch<CheckoutResult>(
        "/api/checkout/register-and-pay",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      // Clear cart after successful checkout
      saveCart([]);

      window.location.href = result.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setBusy(false);
      setActiveProvider(null);
    }
  }

  const displayPrice = product?.priceUsd ?? 0;
  const voucherDiscount = voucherResult?.discount ?? 0;
  const cartSubtotal = displayPrice + cartProducts.reduce((sum, p) => sum + p.priceUsd, 0);
  const finalTotal = Math.max(0, cartSubtotal - voucherDiscount);
  const toyyibpayReady = gatewayAvailability.toyyibpay.enabled && gatewayAvailability.toyyibpay.configured;
  const stripeReady = gatewayAvailability.stripe.enabled && gatewayAvailability.stripe.configured;
  const paypalReady = gatewayAvailability.paypal.enabled && gatewayAvailability.paypal.configured;
  const billplzReady = gatewayAvailability.billplz.enabled && gatewayAvailability.billplz.configured;
  const hasPaymentOption = toyyibpayReady || stripeReady || paypalReady || billplzReady;

  if (loading) {
    return <SkeletonCheckout />;
  }

  if (!product) {
    return (
      <div className="container py-5 text-center">
        <h2>Product not found</h2>
        <p className="text-muted">The exam you are looking for does not exist.</p>
        <Link href="/" className="btn btn-primary mt-3">Back to home</Link>
      </div>
    );
  }

  if (ownedSlugs.has(productSlug)) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm mx-auto" style={{ maxWidth: 500, border: "1px solid #E5E7EB" }}>
          <div className="card-body py-5">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: 48 }}></i>
            <h3 className="mt-3">You already own this product</h3>
            <p className="text-muted">You have active access to <strong>{product.title}</strong>.</p>
            <div className="d-flex gap-2 justify-content-center mt-3">
              <Link href="/me/exams" className="btn btn-primary">Go to My Exams</Link>
              <Link href="/" className="btn btn-outline-secondary">Browse Catalog</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 920 }}>
      <div className="mb-4">
        <Link href={`/products/${product.slug}`} className="text-decoration-none d-inline-flex align-items-center gap-1 small fw-medium" style={{ color: "#2B7A87" }}>
          <i className="bi bi-arrow-left" /> Back to exam
        </Link>
      </div>

      <h1 className="h3 fw-bold mb-4" style={{ color: "#1A1D23", letterSpacing: "-0.02em" }}>Checkout</h1>

      <div className="row g-4">
        {/* Left column — form */}
        <div className="col-lg-7">
          <div className="card">
            <div className="card-body p-4">
              {!isLoggedIn ? (
                <>
                  <h2 className="h5 fw-bold mb-3" style={{ color: "#1A1D23" }}>Create your account</h2>
                  <p className="small mb-3" style={{ color: "#6B7280" }}>
                    Already have an account?{" "}
                    <Link href={`/login?next=/checkout?product=${productSlug}`} style={{ color: "#2B7A87" }}>Login here</Link>
                  </p>

                  <div className="mb-3">
                    <label htmlFor="fullName" className="form-label">Full name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      disabled={busy}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email address</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={busy}
                    />
                  </div>

                  <div className="row g-3">
                    <div className="col-sm-4">
                      <label htmlFor="age" className="form-label">Age</label>
                      <input
                        type="number"
                        className="form-control"
                        id="age"
                        min={13}
                        max={120}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Age"
                        disabled={busy}
                      />
                    </div>
                    <div className="col-sm-8">
                      <label htmlFor="occupation" className="form-label">Occupation</label>
                      <input
                        type="text"
                        className="form-control"
                        id="occupation"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="e.g. Project manager"
                        maxLength={120}
                        disabled={busy}
                      />
                    </div>
                  </div>

                  <div className="mb-3 mt-3">
                    <label htmlFor="gender" className="form-label">Gender</label>
                    <select
                      className="form-select"
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      disabled={busy}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="verificationCode" className="form-label">Verification Code</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        id="verificationCode"
                        placeholder="6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        inputMode="numeric"
                        disabled={busy}
                      />
                      <button
                        className="btn btn-outline-primary"
                        type="button"
                        onClick={sendVerificationCode}
                        disabled={busy || codeCooldown > 0 || !email}
                      >
                        {codeCooldown > 0 ? `Resend (${codeCooldown}s)` : codeSent ? "Resend Code" : "Get Code"}
                      </button>
                    </div>
                    {codeStatus ? (
                      <div className="form-text">{codeStatus}</div>
                    ) : (
                      <div className="form-text">Enter your email first, then click &quot;Get Code&quot; — or use code <strong>111111</strong> for UAT testing</div>
                    )}
                  </div>

                  <div className="form-check mb-3">
                    <input
                      id="privacyAccepted"
                      className="form-check-input"
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      disabled={busy}
                    />
                    <label className="form-check-label small" htmlFor="privacyAccepted">
                      I agree to the <Link href="/terms" target="_blank">Terms of Use</Link> and <Link href="/privacy" target="_blank">Privacy Notice</Link>.
                    </label>
                  </div>

                  <hr />
                </>
              ) : (
                <div className="alert d-flex align-items-center gap-2 mb-3" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10 }}>
                  <i className="bi bi-person-check-fill" style={{ color: "#059669" }} />
                  <span className="small" style={{ color: "#065F46" }}>
                    Purchasing as <strong>{loggedInUser?.fullName ?? loggedInUser?.email}</strong>
                  </span>
                </div>
              )}

              <h2 className="h5 fw-bold mb-3" style={{ color: "#1A1D23" }}>Voucher code</h2>
              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter voucher code (optional)"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  disabled={busy}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={busy || !voucherCode.trim()}
                >
                  Apply
                </button>
              </div>
              {voucherResult && (
                <p className="text-success small mb-0">
                  Discount {formatUsd(voucherResult.discount)} applied!
                </p>
              )}
              {voucherError && <p className="text-danger small mb-0">{voucherError}</p>}
            </div>
          </div>
        </div>

        {/* Right column — order summary */}
        <div className="col-lg-5">
          <div className="card">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3" style={{ color: "#1A1D23" }}>Order summary</h2>

              {/* Current product */}
              <div className="d-flex justify-content-between mb-2">
                <span>{product.title}</span>
                <span className="text-nowrap ms-2">{formatUsd(displayPrice)}</span>
              </div>

              {/* Other cart items */}
              {cartProducts.map((cp) => (
                <div key={cp.slug} className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small flex-grow-1 me-1">{cp.title}</span>
                  <span className="text-nowrap small me-2">{formatUsd(cp.priceUsd)}</span>
                  <button
                    type="button"
                    className="btn btn-sm p-0 text-danger border-0 flex-shrink-0"
                    title="Remove"
                    onClick={() => handleRemoveFromCart(cp.slug)}
                    style={{ lineHeight: 1 }}
                  >
                    <i className="bi bi-x-circle" style={{ fontSize: 14 }}></i>
                  </button>
                </div>
              ))}

              {voucherResult && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Voucher discount</span>
                  <span>-{formatUsd(voucherResult.discount)}</span>
                </div>
              )}

              <hr />

              <div className="d-flex justify-content-between mb-3">
                <strong>Total ({1 + cartProducts.length} item{cartProducts.length > 0 ? "s" : ""})</strong>
                <strong>{formatUsd(finalTotal)}</strong>
              </div>

              <ul className="list-unstyled small text-muted mb-3">
                <li>&#10003; Immediate access on payment</li>
                <li>&#10003; All items activated at once</li>
              </ul>

              {error && (
                <div className="alert alert-danger py-2 small">{error}</div>
              )}

              {!hasPaymentOption && (
                <div className="alert alert-warning py-2 small">
                  Payment is temporarily unavailable. Please contact support.
                </div>
              )}

              <div className="d-grid gap-2">
                {toyyibpayReady && (
                  <button
                    className="btn btn-primary w-100 py-2 fw-semibold"
                    onClick={() => void handleCheckout("toyyibpay")}
                    disabled={busy}
                    style={{ borderRadius: 10 }}
                  >
                    {busy && activeProvider === "toyyibpay" ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Processing ToyyibPay...
                      </>
                    ) : (
                      `Pay ${formatUsd(finalTotal)} with ToyyibPay`
                    )}
                  </button>
                )}

                {stripeReady && (
                  <button
                    className="btn btn-outline-dark w-100 py-2 fw-semibold"
                    onClick={() => void handleCheckout("stripe")}
                    disabled={busy}
                    style={{ borderRadius: 10 }}
                  >
                    {busy && activeProvider === "stripe" ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Processing Stripe...
                      </>
                    ) : (
                      `Pay ${formatUsd(finalTotal)} with Stripe`
                    )}
                  </button>
                )}

                {paypalReady && (
                  <button
                    className="btn btn-outline-primary w-100 py-2 fw-semibold"
                    onClick={() => void handleCheckout("paypal")}
                    disabled={busy}
                    style={{ borderRadius: 10 }}
                  >
                    {busy && activeProvider === "paypal" ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Processing PayPal...
                      </>
                    ) : (
                      `Pay ${formatUsd(finalTotal)} with PayPal`
                    )}
                  </button>
                )}

                {billplzReady && (
                  <button
                    className="btn btn-outline-success w-100 py-2 fw-semibold"
                    onClick={() => void handleCheckout("billplz")}
                    disabled={busy}
                    style={{ borderRadius: 10 }}
                  >
                    {busy && activeProvider === "billplz" ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Processing Billplz...
                      </>
                    ) : (
                      `Pay ${formatUsd(finalTotal)} with Billplz`
                    )}
                  </button>
                )}
              </div>

              <p className="text-muted text-center small mt-2 mb-0">
                You will be redirected to a secure payment page.
              </p>
            </div>
          </div>

          {/* Add more items section */}
          {otherProducts.length > 0 && (
            <div className="card mt-3">
              <div className="card-body p-4">
                <h3 className="h6 mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-plus-circle"></i>
                  Add more items
                </h3>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {otherProducts.slice(0, 6).map((op) => (
                    <div key={op.slug} className="d-flex align-items-center gap-2 p-2 rounded border">
                      <div className="flex-grow-1">
                        <div className="small fw-medium lh-sm">{op.title}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{formatUsd(op.priceUsd)}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary flex-shrink-0"
                        onClick={() => handleAddToCart(op.slug)}
                      >
                        <i className="bi bi-cart-plus me-1"></i>Add
                      </button>
                    </div>
                  ))}
                </div>
                {otherProducts.length > 6 && (
                  <Link href="/#catalog" className="btn btn-link btn-sm mt-2 p-0">
                    Browse all exams &rarr;
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
