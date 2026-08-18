import crypto from "crypto";

import { assertGatewayReady, getPaymentGatewaySettings } from "./settings.js";
import type { CreateBillRequest, CreateBillResult, PaymentProvider, VerifyCallbackResult } from "./types.js";
import { convertUsdToMyr } from "./currency.js";

const SANDBOX_URL = "https://www.billplz-sandbox.com";
const PRODUCTION_URL = "https://www.billplz.com";

type BillplzBill = {
  id: string;
  paid?: boolean;
  state?: string;
  url?: string;
  reference_1?: string | null;
  metadata?: { id?: string | number; orderId?: string | number } | null;
};

function getBaseUrl(sandbox: boolean) {
  return sandbox ? SANDBOX_URL : PRODUCTION_URL;
}

function appendQuery(url: string, key: string, value: string) {
  const parsed = new URL(url);
  parsed.searchParams.set(key, value);
  return parsed.toString();
}

function authHeader(apiKey: string) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value);
}

function isPaid(value: unknown) {
  return value === true || String(value).toLowerCase() === "true";
}

function getOrderId(body: Record<string, unknown>) {
  return Number(
    body.order_id ??
      body.pm_order_id ??
      body.orderId ??
      body["metadata[id]"] ??
      body["metadata[orderId]"] ??
      (typeof body.metadata === "object" && body.metadata !== null
        ? (body.metadata as { id?: unknown; orderId?: unknown }).orderId ?? (body.metadata as { id?: unknown }).id
        : undefined) ??
      body.reference_1 ??
      0
  );
}

function signatureSource(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([key]) => key !== "x_signature" && key !== "pm_order_id")
    .map(([key, value]) => `${key}${stringValue(value)}`)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }))
    .join("|");
}

async function verifySignatureIfConfigured(payload: Record<string, unknown>) {
  const settings = (await getPaymentGatewaySettings()).billplz;
  const received = stringValue(payload.x_signature);

  if (!settings.xSignatureKey || !received) return;

  const expected = crypto.createHmac("sha256", settings.xSignatureKey).update(signatureSource(payload)).digest("hex");
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    throw new Error("Invalid Billplz callback signature.");
  }
}

function toVerifyResult(payload: Record<string, unknown>, eventPrefix: string): VerifyCallbackResult {
  const orderId = getOrderId(payload);
  const billCode = stringValue(payload.id);
  const transactionId = stringValue(payload.transaction_id);
  const state = stringValue(payload.state).toLowerCase();
  const transactionStatus = stringValue(payload.transaction_status).toLowerCase();

  const status = isPaid(payload.paid) || state === "paid" || transactionStatus === "completed"
    ? "paid"
    : state === "deleted" || transactionStatus === "failed"
      ? "failed"
      : "pending";

  return {
    orderId,
    status,
    eventKey: `${eventPrefix}-${transactionId || billCode}-${status}`,
    rawPayload: payload,
  };
}

export const billplzProvider: PaymentProvider = {
  name: "billplz",

  async createBill(request: CreateBillRequest): Promise<CreateBillResult> {
    const settings = await assertGatewayReady("billplz");
    const baseUrl = getBaseUrl(settings.sandbox);
    const amountMyr = await convertUsdToMyr(request.amount);

    const form = new URLSearchParams();
    form.append("collection_id", settings.collectionId);
    form.append("description", request.description.slice(0, 200));
    form.append("email", request.customerEmail);
    form.append("name", request.customerName);
    form.append("amount", String(Math.round(amountMyr * 100)));
    form.append("callback_url", appendQuery(request.callbackUrl, "pm_order_id", String(request.orderId)));
    form.append("redirect_url", request.returnUrl);
    form.append("reference_1_label", "Order ID");
    form.append("reference_1", String(request.orderId));

    if (request.customerPhone) {
      form.append("mobile", request.customerPhone);
    }

    const response = await fetch(`${baseUrl}/api/v3/bills`, {
      method: "POST",
      headers: {
        Authorization: authHeader(settings.apiKey),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Billplz create bill failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as BillplzBill;
    if (!data.id || !data.url) {
      throw new Error(`Billplz create bill returned unexpected response: ${JSON.stringify(data)}`);
    }

    return {
      billCode: data.id,
      paymentUrl: data.url,
    };
  },

  async verifyCallback(body: Record<string, unknown>): Promise<VerifyCallbackResult> {
    await verifySignatureIfConfigured(body);
    const result = toVerifyResult(body, "billplz-callback");
    if (!result.orderId) {
      throw new Error("Invalid Billplz callback: missing order ID.");
    }
    return result;
  },

  async verifyBill(billCode: string) {
    const settings = await assertGatewayReady("billplz");
    const baseUrl = getBaseUrl(settings.sandbox);
    const response = await fetch(`${baseUrl}/api/v3/bills/${encodeURIComponent(billCode)}`, {
      headers: {
        Authorization: authHeader(settings.apiKey),
      },
    });

    if (!response.ok) return null;

    const bill = (await response.json()) as BillplzBill;
    return toVerifyResult(bill as unknown as Record<string, unknown>, "billplz-verify");
  },
};
