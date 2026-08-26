import type { RowDataPacket } from "mysql2";

import { env } from "../../config.js";
import { getPool } from "../../db.js";

export type GatewayName = "toyyibpay" | "stripe" | "paypal" | "billplz";

export type PaymentGatewaySettings = {
  toyyibpay: {
    enabled: boolean;
    secretKey: string;
    categoryCode: string;
    sandbox: boolean;
  };
  stripe: {
    enabled: boolean;
    sandbox: boolean;
    secretKey: string;
    webhookSecret: string;
    testSecretKey: string;
    testWebhookSecret: string;
    liveSecretKey: string;
    liveWebhookSecret: string;
  };
  paypal: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    sandbox: boolean;
  };
  billplz: {
    enabled: boolean;
    apiKey: string;
    collectionId: string;
    xSignatureKey: string;
    sandbox: boolean;
  };
};

export type PublicGatewaySettings = Record<GatewayName, { enabled: boolean; configured: boolean }>;

const PAYMENT_SETTING_KEYS = [
  "payment.toyyibpay.enabled",
  "payment.toyyibpay.secretKey",
  "payment.toyyibpay.categoryCode",
  "payment.toyyibpay.sandbox",
  "payment.stripe.enabled",
  "payment.stripe.sandbox",
  "payment.stripe.secretKey",
  "payment.stripe.webhookSecret",
  "payment.stripe.testSecretKey",
  "payment.stripe.testWebhookSecret",
  "payment.stripe.liveSecretKey",
  "payment.stripe.liveWebhookSecret",
  "payment.paypal.enabled",
  "payment.paypal.clientId",
  "payment.paypal.clientSecret",
  "payment.paypal.sandbox",
  "payment.billplz.enabled",
  "payment.billplz.apiKey",
  "payment.billplz.collectionId",
  "payment.billplz.xSignatureKey",
  "payment.billplz.sandbox",
] as const;

function boolFromSetting(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true";
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => Boolean(value)) ?? "";
}

async function readPaymentSettingMap() {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT setting_key AS settingKey, setting_value AS settingValue
       FROM app_settings
       WHERE setting_key IN (${PAYMENT_SETTING_KEYS.map(() => "?").join(", ")})`,
      [...PAYMENT_SETTING_KEYS]
    );

    return new Map(rows.map((row) => [String(row.settingKey), String(row.settingValue)]));
  } catch {
    return new Map<string, string>();
  }
}

export async function getPaymentGatewaySettings(): Promise<PaymentGatewaySettings> {
  const map = await readPaymentSettingMap();

  const toyyibpaySecretKey = map.get("payment.toyyibpay.secretKey") ?? env.TOYYIBPAY_SECRET_KEY;
  const toyyibpayCategoryCode = map.get("payment.toyyibpay.categoryCode") ?? env.TOYYIBPAY_CATEGORY_CODE;
  const legacyStripeSecretKey = map.get("payment.stripe.secretKey") ?? env.STRIPE_SECRET_KEY;
  const legacyStripeWebhookSecret = map.get("payment.stripe.webhookSecret") ?? env.STRIPE_WEBHOOK_SECRET;
  const stripeSandbox = boolFromSetting(
    map.get("payment.stripe.sandbox"),
    env.STRIPE_SANDBOX ?? !legacyStripeSecretKey.startsWith("sk_live_")
  );
  const stripeTestSecretKey = firstNonEmpty(
    map.get("payment.stripe.testSecretKey"),
    env.STRIPE_TEST_SECRET_KEY,
    legacyStripeSecretKey.startsWith("sk_test_") ? legacyStripeSecretKey : ""
  );
  const stripeTestWebhookSecret = firstNonEmpty(
    map.get("payment.stripe.testWebhookSecret"),
    env.STRIPE_TEST_WEBHOOK_SECRET,
    legacyStripeSecretKey.startsWith("sk_test_") ? legacyStripeWebhookSecret : ""
  );
  const stripeLiveSecretKey = firstNonEmpty(
    map.get("payment.stripe.liveSecretKey"),
    env.STRIPE_LIVE_SECRET_KEY,
    legacyStripeSecretKey.startsWith("sk_live_") ? legacyStripeSecretKey : ""
  );
  const stripeLiveWebhookSecret = firstNonEmpty(
    map.get("payment.stripe.liveWebhookSecret"),
    env.STRIPE_LIVE_WEBHOOK_SECRET,
    legacyStripeSecretKey.startsWith("sk_live_") ? legacyStripeWebhookSecret : ""
  );
  const stripeSecretKey = stripeSandbox ? stripeTestSecretKey : stripeLiveSecretKey;
  const stripeWebhookSecret = stripeSandbox ? stripeTestWebhookSecret : stripeLiveWebhookSecret;
  const paypalClientId = map.get("payment.paypal.clientId") ?? env.PAYPAL_CLIENT_ID;
  const paypalClientSecret = map.get("payment.paypal.clientSecret") ?? env.PAYPAL_CLIENT_SECRET;
  const billplzApiKey = map.get("payment.billplz.apiKey") ?? env.BILLPLZ_API_KEY;
  const billplzCollectionId = map.get("payment.billplz.collectionId") ?? env.BILLPLZ_COLLECTION_ID;
  const billplzXSignatureKey = map.get("payment.billplz.xSignatureKey") ?? env.BILLPLZ_X_SIGNATURE_KEY;

  return {
    toyyibpay: {
      enabled: boolFromSetting(map.get("payment.toyyibpay.enabled"), Boolean(toyyibpaySecretKey && toyyibpayCategoryCode)),
      secretKey: toyyibpaySecretKey,
      categoryCode: toyyibpayCategoryCode,
      sandbox: boolFromSetting(map.get("payment.toyyibpay.sandbox"), env.TOYYIBPAY_SANDBOX),
    },
    stripe: {
      enabled: boolFromSetting(map.get("payment.stripe.enabled"), Boolean(stripeSecretKey)),
      sandbox: stripeSandbox,
      secretKey: stripeSecretKey,
      webhookSecret: stripeWebhookSecret,
      testSecretKey: stripeTestSecretKey,
      testWebhookSecret: stripeTestWebhookSecret,
      liveSecretKey: stripeLiveSecretKey,
      liveWebhookSecret: stripeLiveWebhookSecret,
    },
    paypal: {
      enabled: boolFromSetting(map.get("payment.paypal.enabled"), Boolean(paypalClientId && paypalClientSecret)),
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
      sandbox: boolFromSetting(map.get("payment.paypal.sandbox"), env.PAYPAL_SANDBOX),
    },
    billplz: {
      enabled: boolFromSetting(map.get("payment.billplz.enabled"), Boolean(billplzApiKey && billplzCollectionId)),
      apiKey: billplzApiKey,
      collectionId: billplzCollectionId,
      xSignatureKey: billplzXSignatureKey,
      sandbox: boolFromSetting(map.get("payment.billplz.sandbox"), env.BILLPLZ_SANDBOX),
    },
  };
}

export function getPublicGatewaySettings(settings: PaymentGatewaySettings): PublicGatewaySettings {
  return {
    toyyibpay: {
      enabled: env.UAT_TEST_MODE || settings.toyyibpay.enabled,
      configured: env.UAT_TEST_MODE || Boolean(settings.toyyibpay.secretKey && settings.toyyibpay.categoryCode),
    },
    stripe: {
      enabled: settings.stripe.enabled,
      configured: Boolean(settings.stripe.secretKey && settings.stripe.webhookSecret),
    },
    paypal: {
      enabled: settings.paypal.enabled,
      configured: Boolean(settings.paypal.clientId && settings.paypal.clientSecret),
    },
    billplz: {
      enabled: settings.billplz.enabled,
      configured: Boolean(settings.billplz.apiKey && settings.billplz.collectionId),
    },
  };
}

function gatewayLabel(provider: GatewayName) {
  if (provider === "toyyibpay") return "ToyyibPay";
  if (provider === "stripe") return "Stripe";
  if (provider === "paypal") return "PayPal";
  return "Billplz";
}

export async function assertGatewayReady<TProvider extends GatewayName>(
  provider: TProvider
): Promise<PaymentGatewaySettings[TProvider]> {
  const settings = await getPaymentGatewaySettings();
  const publicSettings = getPublicGatewaySettings(settings)[provider];

  if (!publicSettings.enabled) {
    throw new Error(`${gatewayLabel(provider)} is currently disabled.`);
  }

  if (!publicSettings.configured) {
    throw new Error(`${gatewayLabel(provider)} is not fully configured.`);
  }

  return settings[provider];
}
