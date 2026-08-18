/** Shared types for the pluggable payment-gateway layer. */

export interface CreateBillRequest {
  orderId: number;
  amount: number; // USD, in full units (e.g. 179.00)
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  /** Absolute URL the gateway should POST the server callback to. */
  callbackUrl: string;
  /** Absolute URL the gateway should redirect the user to after payment. */
  returnUrl: string;
}

export interface CreateBillResult {
  /** Provider-specific bill / transaction identifier. */
  billCode: string;
  /** Full URL to redirect the user's browser to for payment. */
  paymentUrl: string;
}

export type PaymentStatus = "paid" | "failed" | "pending";

export interface VerifyCallbackResult {
  /** Our order ID (round-tripped through the gateway). */
  orderId: number;
  status: PaymentStatus;
  /** Provider-specific unique event key for idempotency. */
  eventKey: string;
  /** Raw payload for audit logging. */
  rawPayload: Record<string, unknown>;
}

/**
 * Every payment provider must implement this interface.
 * Add new providers by creating a file that exports a PaymentProvider
 * and registering it in the registry.
 */
export interface PaymentProvider {
  /** Short identifier used in database columns and URLs, e.g. "toyyibpay". */
  readonly name: string;

  /** Create a bill / payment intent and return a redirect URL. */
  createBill(request: CreateBillRequest): Promise<CreateBillResult>;

  /**
   * Parse + verify the server-to-server callback from the gateway.
   * `body` is the raw request body (parsed form data or JSON).
   */
  verifyCallback(body: Record<string, unknown>): VerifyCallbackResult | Promise<VerifyCallbackResult>;

  /**
   * Verify a bill's payment status directly with the gateway API.
   * Returns the payment status for the given bill code.
   * Optional — not all providers may support this.
   */
  verifyBill?(billCode: string): Promise<VerifyCallbackResult | null>;
}
