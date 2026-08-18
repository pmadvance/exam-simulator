import type { CreateBillRequest, CreateBillResult, PaymentProvider, VerifyCallbackResult } from "./types.js";
import { assertGatewayReady } from "./settings.js";
import { convertUsdToMyr } from "./currency.js";

const SANDBOX_URL = "https://dev.toyyibpay.com";
const PRODUCTION_URL = "https://toyyibpay.com";

function getBaseUrl(sandbox: boolean) {
  return sandbox ? SANDBOX_URL : PRODUCTION_URL;
}

export const toyyibpayProvider: PaymentProvider = {
  name: "toyyibpay",

  async createBill(request: CreateBillRequest): Promise<CreateBillResult> {
    const settings = await assertGatewayReady("toyyibpay");
    const baseUrl = getBaseUrl(settings.sandbox);
    const amountMyr = await convertUsdToMyr(request.amount);

    const form = new URLSearchParams();
    form.append("userSecretKey", settings.secretKey);
    form.append("categoryCode", settings.categoryCode);
    form.append("billName", request.description.replace(/[^\x20-\x7E]/g, "").slice(0, 30).trim());
    form.append("billDescription", request.description.slice(0, 200));
    form.append("billPriceSetting", "1"); // fixed price
    form.append("billPayorInfo", "1"); // require payer info
    form.append("billAmount", String(Math.round(amountMyr * 100))); // MYR cents
    form.append("billReturnUrl", request.returnUrl);
    form.append("billCallbackUrl", request.callbackUrl);
    form.append("billExternalReferenceNo", String(request.orderId));
    form.append("billTo", request.customerName);
    form.append("billEmail", request.customerEmail);
    form.append("billPhone", request.customerPhone || "0000000000");
    form.append("billContentEmail", "Thank you for your purchase!");
    form.append("billPaymentChannel", "0"); // FPX only = 0, all = 2
    form.append("billChargeToCustomer", "2"); // charge customer for both FPX + card fees — set 0 for no extra charge

    const response = await fetch(`${baseUrl}/index.php/api/createBill`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ToyyibPay createBill failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as Array<{ BillCode: string }>;

    if (!Array.isArray(data) || !data[0]?.BillCode) {
      throw new Error(`ToyyibPay createBill returned unexpected response: ${JSON.stringify(data)}`);
    }

    const billCode = data[0].BillCode;

    return {
      billCode,
      paymentUrl: `${baseUrl}/${billCode}`,
    };
  },

  verifyCallback(body: Record<string, unknown>): VerifyCallbackResult {
    // ToyyibPay sends a POST with form-encoded body:
    //   refno        – the billCode
    //   status       – "1" = success, "2" = pending, "3" = fail
    //   reason       – human-readable reason
    //   billcode     – same as refno
    //   order_id     – our billExternalReferenceNo (the orderId)
    //   amount       – paid amount
    //   transaction_id – their unique tx id

    const statusCode = String(body.status ?? body.status_id ?? "");
    const orderId = Number(body.order_id ?? body.billExternalReferenceNo ?? 0);
    const billCode = String(body.billcode ?? body.refno ?? "");
    const transactionId = String(body.transaction_id ?? billCode);

    let status: "paid" | "failed" | "pending";
    if (statusCode === "1") {
      status = "paid";
    } else if (statusCode === "2") {
      status = "pending";
    } else {
      status = "failed";
    }

    return {
      orderId,
      status,
      eventKey: `toyyibpay-${transactionId}-${billCode}`,
      rawPayload: body,
    };
  },

  async verifyBill(billCode: string) {
    const settings = await assertGatewayReady("toyyibpay");
    const baseUrl = getBaseUrl(settings.sandbox);
    const form = new URLSearchParams();
    form.append("billCode", billCode);
    form.append("billpaymentStatus", "1"); // 1 = successful transactions

    const res = await fetch(`${baseUrl}/index.php/api/getBillTransactions`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      billpaymentStatus: string;
      billExternalReferenceNo: string;
      transactionId: string;
      billpaymentAmount: string;
    }>;

    if (!Array.isArray(data) || data.length === 0) return null;

    // Find the first successful transaction
    const tx = data.find((t) => t.billpaymentStatus === "1");
    if (!tx) return null;

    const orderId = Number(tx.billExternalReferenceNo);
    return {
      orderId,
      status: "paid" as const,
      eventKey: `toyyibpay-${tx.transactionId}-${billCode}`,
      rawPayload: tx as unknown as Record<string, unknown>,
    };
  },
};
