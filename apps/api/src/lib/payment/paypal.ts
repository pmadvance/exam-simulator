import type { CreateBillRequest, CreateBillResult, PaymentProvider, VerifyCallbackResult } from "./types.js";
import { assertGatewayReady } from "./settings.js";

const SANDBOX_URL = "https://api-m.sandbox.paypal.com";
const PRODUCTION_URL = "https://api-m.paypal.com";

type PayPalLink = { href: string; rel: string; method?: string };
type PayPalOrder = {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{ custom_id?: string; invoice_id?: string }>;
};

function getBaseUrl(sandbox: boolean) {
  return sandbox ? SANDBOX_URL : PRODUCTION_URL;
}

async function getAccessToken() {
  const settings = await assertGatewayReady("paypal");
  const baseUrl = getBaseUrl(settings.sandbox);
  const credentials = Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal access token failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("PayPal access token response did not include access_token.");
  }

  return { accessToken: data.access_token, baseUrl };
}

async function paypalRequest<T>(path: string, init: RequestInit = {}) {
  const { accessToken, baseUrl } = await getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

function resolveOrderId(order: PayPalOrder, fallbackOrderId = 0) {
  return Number(order.purchase_units?.[0]?.custom_id ?? order.purchase_units?.[0]?.invoice_id ?? fallbackOrderId);
}

function toVerifyResult(order: PayPalOrder, eventPrefix: string, fallbackOrderId = 0): VerifyCallbackResult | null {
  const orderId = resolveOrderId(order, fallbackOrderId);
  if (!orderId || Number.isNaN(orderId)) return null;

  return {
    orderId,
    status: order.status === "COMPLETED" ? "paid" : order.status === "APPROVED" ? "pending" : "failed",
    eventKey: `${eventPrefix}-${order.id}-${order.status}`,
    rawPayload: order as unknown as Record<string, unknown>,
  };
}

export const paypalProvider: PaymentProvider = {
  name: "paypal",

  async createBill(request: CreateBillRequest): Promise<CreateBillResult> {
    const order = await paypalRequest<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: String(request.orderId),
            custom_id: String(request.orderId),
            invoice_id: String(request.orderId),
            description: request.description.slice(0, 127),
            amount: {
              currency_code: "USD",
              value: request.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "PM Advance",
          user_action: "PAY_NOW",
          return_url: request.returnUrl,
          cancel_url: `${request.returnUrl}&status_id=3`,
        },
      }),
    });

    const approveUrl = order.links?.find((link) => link.rel === "approve")?.href;
    if (!order.id || !approveUrl) {
      throw new Error(`PayPal create order returned unexpected response: ${JSON.stringify(order)}`);
    }

    return {
      billCode: order.id,
      paymentUrl: approveUrl,
    };
  },

  verifyCallback(body: Record<string, unknown>): VerifyCallbackResult {
    const event = body as {
      id?: string;
      event_type?: string;
      resource?: PayPalOrder;
    };

    if (!event.resource?.id) {
      throw new Error("Invalid PayPal callback: missing order resource.");
    }

    const result = toVerifyResult(event.resource, `paypal-${event.id ?? event.event_type ?? "event"}`);
    if (!result) {
      throw new Error("Invalid PayPal callback: missing order ID.");
    }

    return result;
  },

  async verifyBill(billCode: string) {
    const order = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(billCode)}`);
    const fallbackOrderId = resolveOrderId(order);

    if (order.status === "APPROVED") {
      const captured = await paypalRequest<PayPalOrder>(
        `/v2/checkout/orders/${encodeURIComponent(billCode)}/capture`,
        { method: "POST", body: JSON.stringify({}) }
      );
      return toVerifyResult(captured, "paypal-capture", fallbackOrderId);
    }

    return toVerifyResult(order, "paypal-verify");
  },
};
