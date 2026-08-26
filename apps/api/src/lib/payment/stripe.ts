import Stripe from "stripe";

import type { CreateBillRequest, CreateBillResult, PaymentProvider, VerifyCallbackResult } from "./types.js";
import { assertGatewayReady, getPaymentGatewaySettings } from "./settings.js";

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

export class StripeWebhookSignatureError extends Error {
  constructor() {
    super("Invalid Stripe webhook signature");
    this.name = "StripeWebhookSignatureError";
  }
}

function getStripeClient(secretKey: string) {
  if (!secretKey) {
    throw new Error("Stripe is not configured. Configure the active Stripe secret key to enable checkout.");
  }

  if (!stripeClient || stripeClientKey !== secretKey) {
    stripeClient = new Stripe(secretKey);
    stripeClientKey = secretKey;
  }

  return stripeClient;
}

function validateStripeCredentials(settings: { sandbox: boolean; secretKey: string; webhookSecret: string }) {
  const expectedKeyPrefix = settings.sandbox ? "sk_test_" : "sk_live_";
  if (!settings.secretKey.startsWith(expectedKeyPrefix)) {
    throw new Error(`Stripe ${settings.sandbox ? "sandbox" : "live"} mode requires a ${expectedKeyPrefix} secret key.`);
  }
  if (!settings.webhookSecret.startsWith("whsec_")) {
    throw new Error("Stripe webhook secret must start with whsec_.");
  }
}

function appendQuery(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export async function parseStripeWebhookEvent(rawBody: Buffer, signature: string) {
  const settings = await getPaymentGatewaySettings();
  if (!settings.stripe.webhookSecret) {
    throw new Error("Stripe webhook secret is not configured for the active mode.");
  }
  validateStripeCredentials(settings.stripe);

  const stripe = getStripeClient(settings.stripe.secretKey);
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, settings.stripe.webhookSecret);
  } catch {
    throw new StripeWebhookSignatureError();
  }
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createBill(request: CreateBillRequest): Promise<CreateBillResult> {
    const settings = await assertGatewayReady("stripe");
    validateStripeCredentials(settings);
    const stripe = getStripeClient(settings.secretKey);

    const successUrl = appendQuery(request.returnUrl, "stripe_session_id", "{CHECKOUT_SESSION_ID}");
    const cancelUrl = appendQuery(request.returnUrl, "status_id", "3");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: request.customerEmail,
      client_reference_id: String(request.orderId),
      metadata: {
        orderId: String(request.orderId),
        provider: "stripe",
      },
      payment_intent_data: {
        metadata: {
          orderId: String(request.orderId),
          provider: "stripe",
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: request.description.slice(0, 120) || "PM Advance Purchase",
              description: `Order #${request.orderId}`,
            },
            unit_amount: Math.round(request.amount * 100),
          },
        },
      ],
    });

    if (!session.url || !session.id) {
      throw new Error("Stripe checkout session did not return URL or session ID.");
    }

    return {
      billCode: session.id,
      paymentUrl: session.url,
    };
  },

  verifyCallback(body: Record<string, unknown>): VerifyCallbackResult {
    const event = body as {
      id?: string;
      type?: string;
      data?: { object?: Record<string, unknown> };
    };

    const object = event.data?.object ?? {};
    const metadata = (object.metadata as Record<string, unknown> | undefined) ?? {};

    const orderId = Number(metadata.orderId ?? object.client_reference_id ?? 0);
    if (!orderId || Number.isNaN(orderId)) {
      throw new Error("Invalid Stripe callback: missing order ID metadata");
    }

    const eventType = String(event.type ?? "");
    let status: "paid" | "failed" | "pending" = "pending";

    if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
      const paymentStatus = String(object.payment_status ?? "");
      status = paymentStatus === "paid" ? "paid" : "pending";
    } else if (
      eventType === "checkout.session.expired"
      || eventType === "checkout.session.async_payment_failed"
      || eventType === "payment_intent.payment_failed"
    ) {
      status = "failed";
    }

    return {
      orderId,
      status,
      eventKey: `stripe-${event.id ?? `evt-${Date.now()}`}`,
      rawPayload: body,
    };
  },

  async verifyBill(billCode: string) {
    const settings = await assertGatewayReady("stripe");
    validateStripeCredentials(settings);
    const stripe = getStripeClient(settings.secretKey);
    const session = await stripe.checkout.sessions.retrieve(billCode);

    if (!session) return null;

    const orderId = Number(session.metadata?.orderId ?? session.client_reference_id ?? 0);
    if (!orderId || Number.isNaN(orderId)) return null;

    if (session.payment_status !== "paid") {
      return {
        orderId,
        status: "pending" as const,
        eventKey: `stripe-verify-${session.id}`,
        rawPayload: session as unknown as Record<string, unknown>,
      };
    }

    return {
      orderId,
      status: "paid" as const,
      eventKey: `stripe-verify-${session.id}-${Date.now()}`,
      rawPayload: session as unknown as Record<string, unknown>,
    };
  },
};
