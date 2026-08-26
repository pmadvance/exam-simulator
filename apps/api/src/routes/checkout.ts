import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { getPool } from "../db.js";
import { env } from "../config.js";
import { getDatabaseReady, getProductBySlug, getSessionPolicy, hasActiveEnrollment, writeAuditLog } from "../helpers.js";
import { checkoutSchema, guestCheckoutSchema, paymentCallbackSchema } from "../schemas.js";
import { getAuthUser, requireAuth, setSessionCookies, hashToken } from "../middleware/auth.js";
import { signAccessToken, signRefreshToken } from "../lib/auth.js";
import { getProvider } from "../lib/payment/index.js";
import { parseStripeWebhookEvent, StripeWebhookSignatureError } from "../lib/payment/stripe.js";
import { assertGatewayReady, getPaymentGatewaySettings, getPublicGatewaySettings } from "../lib/payment/settings.js";
import { isRateLimited } from "../middleware/rate-limit.js";
import { z } from "zod";
import express from "express";

const router = Router();

type PaymentFinalizationInput = {
  orderId: number;
  status: "paid" | "failed" | "pending";
  eventKey: string;
  rawPayload: Record<string, unknown>;
};

type PaymentFinalizationResult =
  | { kind: "pending" }
  | { kind: "not_found" }
  | { kind: "processed"; orderId: number; status: "paid" | "failed"; idempotent?: boolean };

async function hasActiveEnrollmentInConnection(connection: PoolConnection, userId: number, productId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM enrollments
     WHERE user_id = ? AND product_id = ? AND status = 'active'
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
     LIMIT 1`,
    [userId, productId]
  );
  return rows.length > 0;
}

async function finalizePaymentEvent(
  providerName: string,
  result: PaymentFinalizationInput,
  auditAction: "payment.callback" | "payment.verified" = "payment.callback"
): Promise<PaymentFinalizationResult> {
  if (!result.orderId) return { kind: "not_found" };
  if (result.status === "pending") return { kind: "pending" };

  const connection = await getPool().getConnection();
  let orderForAudit: { id: number; userId: number } | null = null;
  let groupOrdersForRewards: Array<{ id: number; userId: number }> = [];

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query<RowDataPacket[]>(
      `SELECT orders.id, orders.user_id AS userId, orders.product_id AS productId, orders.status,
              orders.cart_group_id AS cartGroupId, products.access_days AS accessDays
       FROM orders
       INNER JOIN products ON products.id = orders.product_id
       WHERE orders.id = ?
       LIMIT 1
       FOR UPDATE`,
      [result.orderId]
    );
    const order = orderRows[0] as {
      id: number;
      userId: number;
      productId: number;
      status: string;
      cartGroupId: string | null;
      accessDays: number;
    } | undefined;

    if (!order) {
      await connection.rollback();
      return { kind: "not_found" };
    }
    orderForAudit = { id: order.id, userId: order.userId };

    try {
      await connection.execute(
        `INSERT INTO payment_events (event_key, order_id, provider, event_type, payload)
         VALUES (?, ?, ?, ?, ?)`,
        [result.eventKey, order.id, providerName, result.status, JSON.stringify(result.rawPayload)]
      );
    } catch (error) {
      const duplicateError = error as Error & { code?: string };
      if (duplicateError.code === "ER_DUP_ENTRY") {
        await connection.rollback();
        return { kind: "processed", orderId: order.id, status: order.status === "paid" ? "paid" : "failed", idempotent: true };
      }
      throw error;
    }

    const [groupRows] = order.cartGroupId
      ? await connection.query<RowDataPacket[]>(
          `SELECT orders.id, orders.user_id AS userId, orders.product_id AS productId, products.access_days AS accessDays
           FROM orders
           INNER JOIN products ON products.id = orders.product_id
           WHERE orders.cart_group_id = ?
           FOR UPDATE`,
          [order.cartGroupId]
        )
      : [[order] as unknown as RowDataPacket[]];

    const groupOrders = groupRows as Array<{ id: number; userId: number; productId: number; accessDays: number }>;

    if (result.status === "paid") {
      for (const groupOrder of groupOrders) {
        await connection.execute(
          `UPDATE orders SET status = 'paid', gateway_reference = ? WHERE id = ? AND status = 'pending'`,
          [result.eventKey, groupOrder.id]
        );
        const alreadyEnrolled = await hasActiveEnrollmentInConnection(connection, groupOrder.userId, groupOrder.productId);
        if (!alreadyEnrolled) {
          await connection.execute(
            `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
             VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY), 'active')`,
            [groupOrder.userId, groupOrder.productId, groupOrder.accessDays]
          );
        }
      }
      groupOrdersForRewards = groupOrders.map((groupOrder) => ({ id: groupOrder.id, userId: groupOrder.userId }));
    } else {
      for (const groupOrder of groupOrders) {
        await connection.execute(
          `UPDATE orders SET status = 'failed', gateway_reference = ? WHERE id = ? AND status = 'pending'`,
          [result.eventKey, groupOrder.id]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (orderForAudit) {
    await writeAuditLog(orderForAudit.userId, auditAction, "order", String(orderForAudit.id), result.rawPayload);
  }

  if (result.status === "paid") {
    try {
      const { processReferralReward } = await import("./admin/referrals.js");
      for (const groupOrder of groupOrdersForRewards) {
        await processReferralReward(groupOrder.userId, groupOrder.id);
      }
    } catch {
      // Referral rewards should not make a successful payment callback fail.
    }
  }

  return { kind: "processed", orderId: result.orderId, status: result.status };
}

router.get("/payment-gateways", async (_request, response, next) => {
  try {
    const settings = await getPaymentGatewaySettings();
    response.json(getPublicGatewaySettings(settings));
  } catch (error) {
    next(error);
  }
});

router.post("/checkout/orders", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    const payload = checkoutSchema.parse(request.body);
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    const product = await getProductBySlug(payload.productSlug);
    if (!product) {
      response.status(404).json({ message: "Product not found" });
      return;
    }

    const gatewayReference = `mock-${crypto.randomUUID()}`;
    const [result] = await getPool().execute(
      `INSERT INTO orders (user_id, product_id, status, total_amount, gateway_reference)
       VALUES (?, ?, 'pending', ?, ?)`,
      [user.userId, product.id, product.priceUsd, gatewayReference]
    );

    const orderId = (result as { insertId: number }).insertId;
    await writeAuditLog(user.userId, "order.created", "order", String(orderId), {
      productSlug: product.slug,
      gatewayReference
    });

    response.status(201).json({
      orderId,
      status: "pending",
      gatewayReference,
      product,
      callbackPayload: {
        orderId,
        status: "paid",
        provider: "mockpay",
        eventKey: `evt-${crypto.randomUUID()}`
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/payments/callbacks/mock", async (request, response, next) => {
  try {
    const payload = paymentCallbackSchema.parse(request.body);
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    const finalized = await finalizePaymentEvent(payload.provider, {
      orderId: payload.orderId,
      status: payload.status,
      eventKey: payload.eventKey,
      rawPayload: payload
    });
    if (finalized.kind === "not_found") {
      response.status(404).json({ message: "Order not found" });
      return;
    }
    if (finalized.kind === "processed" && finalized.idempotent) {
      response.json({ orderId: finalized.orderId, status: finalized.status, idempotent: true });
      return;
    }
    response.json({ orderId: payload.orderId, status: payload.status === "paid" ? "paid" : "failed" });
  } catch (error) {
    next(error);
  }
});

router.post("/checkout/apply-voucher", async (request, response, next) => {
  try {
    const { code, productSlug } = z.object({ code: z.string().min(1), productSlug: z.string().min(1) }).parse(request.body);
    const product = await getProductBySlug(productSlug);
    if (!product) { response.status(404).json({ message: "Product not found" }); return; }
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT * FROM vouchers WHERE code = ? AND status = 'active' AND valid_from <= CURRENT_TIMESTAMP AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP) LIMIT 1`,
      [code.trim().toUpperCase()]
    );
    if (rows.length === 0) { response.status(400).json({ message: "Invalid or expired voucher code" }); return; }
    const voucher = rows[0];
    if (voucher.product_id && Number(voucher.product_id) !== product.id) { response.status(400).json({ message: "Voucher not valid for this product" }); return; }
    if (Number(product.priceUsd) < Number(voucher.min_order ?? 0)) { response.status(400).json({ message: "Minimum order amount not reached for this voucher" }); return; }
    if (voucher.usage_limit) {
      const [usageRows] = await getPool().query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM voucher_redemptions WHERE voucher_id = ?`, [voucher.id]);
      if (Number(usageRows[0].cnt) >= Number(voucher.usage_limit)) { response.status(400).json({ message: "Voucher usage limit reached" }); return; }
    }
    const user = getAuthUser(request);
    if (user) {
      const [userUsage] = await getPool().query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM voucher_redemptions WHERE voucher_id = ? AND user_id = ?`, [voucher.id, user.userId]);
      if (Number(userUsage[0].cnt) >= Number(voucher.per_user_limit)) { response.status(400).json({ message: "You have already used this voucher" }); return; }
    }
    const discount = voucher.type === "percentage" ? Math.min(product.priceUsd * Number(voucher.amount) / 100, product.priceUsd) : Math.min(Number(voucher.amount), product.priceUsd);
    response.json({ voucherId: Number(voucher.id), code: String(voucher.code), discount: Math.round(discount * 100) / 100, finalPrice: Math.round((product.priceUsd - discount) * 100) / 100 });
  } catch (error) { next(error); }
});

// ── Guest checkout: combined registration + payment ────────────
router.post("/checkout/register-and-pay", async (request, response, next) => {
  try {
    if (isRateLimited(request.ip ?? "unknown", "checkout", 10, 60_000)) {
      response.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable." });
      return;
    }

    const existingUser = getAuthUser(request);
    let userId: number;
    let userEmail: string;
    let userName: string;

    if (existingUser) {
      // Already logged in — use their account
      userId = existingUser.userId;
      userEmail = existingUser.email;
      const [userRows] = await getPool().query<RowDataPacket[]>(
        `SELECT full_name FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      userName = userRows[0]?.full_name ?? existingUser.email;

      // Accept single productSlug or array of productSlugs
      const { productSlug, productSlugs, voucherCode, provider } = z.object({
        productSlug: z.string().min(3).optional(),
        productSlugs: z.array(z.string().min(3)).optional(),
        voucherCode: z.string().optional(),
        provider: z.enum(["toyyibpay", "stripe", "paypal", "billplz"]).default("toyyibpay"),
      }).parse(request.body);

      if (!(env.UAT_TEST_MODE && provider === "toyyibpay")) {
        try {
          await assertGatewayReady(provider);
        } catch (error) {
          response.status(400).json({ message: error instanceof Error ? error.message : "Payment gateway unavailable." });
          return;
        }
      }

      const slugs = productSlugs ?? (productSlug ? [productSlug] : []);
      if (slugs.length === 0) {
        response.status(400).json({ message: "At least one product is required." });
        return;
      }

      // Resolve all products
      const products: ProductInfo[] = [];
      for (const slug of slugs) {
        const product = await getProductBySlug(slug);
        if (!product) {
          response.status(404).json({ message: `Product not found: ${slug}` });
          return;
        }
        const alreadyEnrolled = await hasActiveEnrollment(userId, product.id);
        if (alreadyEnrolled) {
          response.status(400).json({ message: `You already have active access to: ${product.title}` });
          return;
        }
        products.push(product);
      }

      // Voucher applies to first product only
      let voucherId: number | null = null;
      let voucherDiscount = 0;
      if (voucherCode && products.length > 0) {
        const vResult = await applyVoucherInternal(voucherCode, products[0], userId);
        if (vResult.error) {
          response.status(400).json({ message: vResult.error });
          return;
        }
        voucherId = vResult.voucherId!;
        voucherDiscount = products[0].priceUsd - vResult.finalPrice!;
      }

      const result = await createBulkOrdersAndBill(userId, userEmail, userName, products, voucherId, voucherDiscount, provider);
      response.status(201).json(result);
    } else {
      // Guest — register first
      const payload = guestCheckoutSchema.parse(request.body);
      if (!(env.UAT_TEST_MODE && payload.provider === "toyyibpay")) {
        try {
          await assertGatewayReady(payload.provider);
        } catch (error) {
          response.status(400).json({ message: error instanceof Error ? error.message : "Payment gateway unavailable." });
          return;
        }
      }

      const isUatBypass = env.UAT_TEST_MODE && payload.verificationCode === env.UAT_VERIFICATION_CODE;

      if (!isUatBypass) {
        const [codeRows] = await getPool().query<RowDataPacket[]>(
          `SELECT id, code, expires_at AS expiresAt
           FROM email_verification_codes
           WHERE email = ? AND code = ? AND consumed_at IS NULL
           ORDER BY created_at DESC
           LIMIT 1`,
          [payload.email, payload.verificationCode]
        );
        const codeRow = codeRows[0];
        if (!codeRow) {
          response.status(400).json({ message: "Invalid verification code." });
          return;
        }
        if (new Date(codeRow.expiresAt as string | Date).getTime() < Date.now()) {
          response.status(400).json({ message: "Verification code has expired. Please request a new one." });
          return;
        }
        await getPool().execute(
          `UPDATE email_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [codeRow.id]
        );
      }

      // Resolve all products (primary + extras)
      const slugs = payload.productSlugs ?? [payload.productSlug];
      const products: ProductInfo[] = [];
      for (const slug of slugs) {
        const product = await getProductBySlug(slug);
        if (!product) {
          response.status(404).json({ message: `Product not found: ${slug}` });
          return;
        }
        products.push(product);
      }

      // Check if email is already taken
      const [existingRows] = await getPool().query<RowDataPacket[]>(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [payload.email]
      );
      if (existingRows.length > 0) {
        response.status(409).json({ message: "An account with this email already exists. Please login first." });
        return;
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);
      const [userResult] = await getPool().execute(
        `INSERT INTO users (email, full_name, age, occupation, gender, password_hash, privacy_accepted_at, privacy_notice_version, terms_accepted_at, terms_version)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, '2026-05-26', CURRENT_TIMESTAMP, '2026-05-26')`,
        [
          payload.email,
          payload.fullName,
          payload.age ?? null,
          payload.occupation || null,
          payload.gender ?? null,
          passwordHash
        ]
      );
      userId = (userResult as { insertId: number }).insertId;
      userEmail = payload.email;
      userName = payload.fullName;

      await writeAuditLog(userId, "user.registered", "user", String(userId), { via: "checkout" });

      // Auto-issue referral code for new user + track inbound referral (body.referralCode or `ref` cookie)
      try {
        const { ensureReferralCodeForUser } = await import("./admin/referrals.js");
        await ensureReferralCodeForUser(userId);
      } catch {
        // non-fatal
      }
      const refCode = (payload.referralCode || (request.cookies as Record<string, string> | undefined)?.ref || "")
        .toString().trim().toUpperCase();
      if (refCode) {
        try {
          const [refRows] = await getPool().query<RowDataPacket[]>(
            `SELECT id, user_id AS referrerUserId FROM referral_codes WHERE code = ? LIMIT 1`, [refCode]
          );
          if (refRows.length > 0 && Number(refRows[0].referrerUserId) !== userId) {
            await getPool().execute(
              `INSERT IGNORE INTO referral_redemptions (referral_code_id, referrer_user_id, referee_user_id, status)
               VALUES (?, ?, ?, 'pending')`,
              [refRows[0].id, refRows[0].referrerUserId, userId]
            );
          }
        } catch {
          // non-fatal
        }
      }

      // Create auth session so the user is logged in immediately
      const sessionId = crypto.randomUUID();
      const accessToken = signAccessToken({ userId, email: userEmail, role: "student", sessionId });
      const refreshToken = signRefreshToken({ userId, role: "student", sessionId });
      const policy = await getSessionPolicy(userId);
      const sessionTtlDays = policy.refreshTtlDays ?? 14;
      const sessionExpiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);

      await getPool().execute(
        `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          hashToken(refreshToken),
          request.header("user-agent")?.slice(0, 255) ?? null,
          request.ip?.slice(0, 64) ?? null,
          sessionExpiresAt
        ]
      );

      setSessionCookies(response, { accessToken, refreshToken });

      let voucherId: number | null = null;
      let voucherDiscount = 0;
      if (payload.voucherCode && products.length > 0) {
        const vResult = await applyVoucherInternal(payload.voucherCode, products[0], userId);
        if (vResult.error) {
          response.status(400).json({ message: vResult.error });
          return;
        }
        voucherId = vResult.voucherId!;
        voucherDiscount = products[0].priceUsd - vResult.finalPrice!;
      }

      const result = await createBulkOrdersAndBill(userId, userEmail, userName, products, voucherId, voucherDiscount, payload.provider);
      response.status(201).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// ── Stripe callback with signature verification (raw JSON) ─────
router.post(
  "/payments/callbacks/stripe",
  express.raw({ type: "application/json" }),
  async (request, response, next) => {
    try {
      const signature = request.header("stripe-signature");
      if (!signature) {
        response.status(400).json({ message: "Missing stripe-signature header" });
        return;
      }

      const rawBody = request.body;
      if (!Buffer.isBuffer(rawBody)) {
        response.status(400).json({ message: "Invalid Stripe webhook payload" });
        return;
      }

      let event;
      try {
        event = await parseStripeWebhookEvent(rawBody, signature);
      } catch (error) {
        if (error instanceof StripeWebhookSignatureError) {
          response.status(400).json({ message: error.message });
          return;
        }
        throw error;
      }
      const provider = getProvider("stripe");
      const result = await provider.verifyCallback(event as unknown as Record<string, unknown>);

      await processGatewayCallback("stripe", result, response);
    } catch (error) {
      next(error);
    }
  }
);

// ── Payment callback from non-Stripe gateways (form-encoded) ───
router.post(
  "/payments/callbacks/:provider",
  express.urlencoded({ extended: false }),
  async (request, response, next) => {
    try {
      const providerName = request.params.provider;

      // Skip mock — it has its own handler
      if (providerName === "mock") {
        next();
        return;
      }

      if (providerName === "stripe") {
        response.status(415).json({ message: "Stripe callbacks must be sent as JSON with signature verification" });
        return;
      }

      let provider;
      try {
        provider = getProvider(providerName);
      } catch {
        response.status(400).json({ message: `Unknown provider: ${providerName}` });
        return;
      }

      const result = await provider.verifyCallback({
        ...(request.query as Record<string, unknown>),
        ...(request.body as Record<string, unknown>),
      });

      if (!result.orderId) {
        response.status(400).json({ message: "Invalid callback: missing order ID" });
        return;
      }

      // Ignore pending status — only process final statuses
      if (result.status === "pending") {
        response.json({ status: "acknowledged" });
        return;
      }

      const finalized = await finalizePaymentEvent(providerName, result);
      if (finalized.kind === "not_found") {
        response.status(404).json({ message: "Order not found" });
        return;
      }
      // ToyyibPay expects a simple OK response
      response.json(finalized.kind === "processed" && finalized.idempotent ? { status: "OK", idempotent: true } : { status: "OK" });
    } catch (error) {
      next(error);
    }
  }
);

// ── Shared callback processor ─────────────────────────────────
async function processGatewayCallback(providerName: string, result: { orderId: number; status: "paid" | "failed" | "pending"; eventKey: string; rawPayload: Record<string, unknown> }, response: express.Response) {
  if (!result.orderId) {
    response.status(400).json({ message: "Invalid callback: missing order ID" });
    return;
  }

  const finalized = await finalizePaymentEvent(providerName, result);
  if (finalized.kind === "pending") {
    response.json({ status: "acknowledged" });
    return;
  }
  if (finalized.kind === "not_found") {
    response.status(404).json({ message: "Order not found" });
    return;
  }
  response.json(finalized.idempotent ? { status: "OK", idempotent: true } : { status: "OK" });
}

// ── Order status (for result page polling) ─────────────────────
router.get("/checkout/orders/:id/status", async (request, response, next) => {
  try {
    const orderId = Number(request.params.id);
    if (!orderId || orderId < 1) {
      response.status(400).json({ message: "Invalid order ID" });
      return;
    }

    const [rows] = await getPool().query(
      `SELECT orders.id, orders.status, orders.total_amount AS totalAmount,
              products.title AS productTitle, products.slug AS productSlug
       FROM orders
       INNER JOIN products ON products.id = orders.product_id
       WHERE orders.id = ?
       LIMIT 1`,
      [orderId]
    );

    const order = (rows as Array<{
      id: number;
      status: string;
      totalAmount: number;
      productTitle: string;
      productSlug: string;
    }>)[0];

    if (!order) {
      response.status(404).json({ message: "Order not found" });
      return;
    }

    response.json(order);
  } catch (error) {
    next(error);
  }
});

// ── Verify payment with gateway (for when callback doesn't arrive) ──
router.post("/checkout/orders/:id/verify", async (request, response, next) => {
  try {
    const orderId = Number(request.params.id);
    if (!orderId || orderId < 1) {
      response.status(400).json({ message: "Invalid order ID" });
      return;
    }

    const [rows] = await getPool().query(
      `SELECT orders.id, orders.user_id AS userId, orders.product_id AS productId,
              orders.status, orders.gateway_provider AS gatewayProvider,
              orders.gateway_bill_code AS billCode,
              orders.cart_group_id AS cartGroupId,
              products.access_days AS accessDays
       FROM orders
       INNER JOIN products ON products.id = orders.product_id
       WHERE orders.id = ?
       LIMIT 1`,
      [orderId]
    );

    const order = (rows as Array<{
      id: number;
      userId: number;
      productId: number;
      status: string;
      gatewayProvider: string;
      billCode: string;
      cartGroupId: string | null;
      accessDays: number;
    }>)[0];

    if (!order) {
      response.status(404).json({ message: "Order not found" });
      return;
    }

    // Already finalized
    if (order.status !== "pending") {
      response.json({ orderId: order.id, status: order.status, verified: true });
      return;
    }

    // Verify with the payment provider
    let provider;
    try {
      provider = getProvider(order.gatewayProvider);
    } catch {
      response.status(400).json({ message: "Unknown payment provider for this order" });
      return;
    }

    if (!provider.verifyBill || !order.billCode) {
      response.json({ orderId: order.id, status: "pending", verified: false });
      return;
    }

    const result = await provider.verifyBill(order.billCode);

    if (!result || result.status !== "paid") {
      response.json({ orderId: order.id, status: "pending", verified: false });
      return;
    }

    const finalized = await finalizePaymentEvent(order.gatewayProvider, {
      orderId: order.id,
      status: "paid",
      eventKey: result.eventKey,
      rawPayload: result.rawPayload,
    }, "payment.verified");

    if (finalized.kind === "not_found") {
      response.status(404).json({ message: "Order not found" });
      return;
    }
    if (finalized.kind === "processed" && finalized.idempotent) {
      response.json({ orderId: order.id, status: finalized.status, verified: true, idempotent: true });
      return;
    }
    response.json({ orderId: order.id, status: "paid", verified: true });
  } catch (error) {
    next(error);
  }
});

// ── Helpers ────────────────────────────────────────────────────

type ProductInfo = { id: number; slug: string; priceUsd: number; title: string; description: string };

async function applyVoucherInternal(
  code: string,
  product: ProductInfo,
  userId: number
): Promise<{ error?: string; voucherId?: number; finalPrice?: number }> {
  const normalizedCode = code.trim().toUpperCase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM vouchers WHERE code = ? AND status = 'active' AND valid_from <= CURRENT_TIMESTAMP AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP) LIMIT 1`,
    [normalizedCode]
  );
  if (rows.length === 0) return { error: "Invalid or expired voucher code" };
  const voucher = rows[0];

  if (voucher.product_id && Number(voucher.product_id) !== product.id) return { error: "Voucher not valid for this product" };
  if (Number(product.priceUsd) < Number(voucher.min_order ?? 0)) return { error: "Minimum order amount not reached for this voucher" };

  if (voucher.usage_limit) {
    const [usageRows] = await getPool().query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM voucher_redemptions WHERE voucher_id = ?`, [voucher.id]);
    if (Number(usageRows[0].cnt) >= Number(voucher.usage_limit)) return { error: "Voucher usage limit reached" };
  }

  const [userUsage] = await getPool().query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM voucher_redemptions WHERE voucher_id = ? AND user_id = ?`, [voucher.id, userId]);
  if (Number(userUsage[0].cnt) >= Number(voucher.per_user_limit)) return { error: "You have already used this voucher" };

  const discount = voucher.type === "percentage"
    ? Math.min(product.priceUsd * Number(voucher.amount) / 100, product.priceUsd)
    : Math.min(Number(voucher.amount), product.priceUsd);

  return {
    voucherId: Number(voucher.id),
    finalPrice: Math.round((product.priceUsd - discount) * 100) / 100,
  };
}

async function createBulkOrdersAndBill(
  userId: number,
  userEmail: string,
  userName: string,
  products: ProductInfo[],
  voucherId: number | null,
  voucherDiscount: number,
  providerName: "toyyibpay" | "stripe" | "paypal" | "billplz" = "toyyibpay"
) {
  const provider = getProvider(providerName);
  const cartGroupId = crypto.randomUUID();

  const totalAmount = Math.round(
    (products.reduce((sum, p) => sum + p.priceUsd, 0) - voucherDiscount) * 100
  ) / 100;

  const orderIds: number[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const itemPrice = i === 0
      ? Math.round((product.priceUsd - voucherDiscount) * 100) / 100
      : product.priceUsd;

    const [orderResult] = await getPool().execute(
      `INSERT INTO orders (user_id, product_id, status, total_amount, gateway_provider, cart_group_id)
       VALUES (?, ?, 'pending', ?, ?, ?)`,
      [userId, product.id, itemPrice, provider.name, cartGroupId]
    );
    const orderId = (orderResult as { insertId: number }).insertId;
    orderIds.push(orderId);

    // Record voucher redemption on first product if used
    if (i === 0 && voucherId) {
      await getPool().execute(
        `INSERT INTO voucher_redemptions (voucher_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)`,
        [voucherId, userId, orderId, voucherDiscount]
      );
    }

    await writeAuditLog(userId, "order.created", "order", String(orderId), {
      productSlug: product.slug,
      provider: provider.name,
      cartGroupId,
    });
  }

  // Use first order ID as the external reference (payment callback will find the group)
  const primaryOrderId = orderIds[0];
  const callbackUrl = `${env.API_BASE_URL}/api/payments/callbacks/${provider.name}`;
  const returnUrl = `${env.APP_URL}/checkout/result?order_id=${primaryOrderId}`;

  if (env.UAT_TEST_MODE && provider.name === "toyyibpay") {
    const billCode = `UAT-${primaryOrderId}-${Date.now()}`;
    for (const oid of orderIds) {
      await getPool().execute(
        `UPDATE orders SET gateway_bill_code = ?, gateway_reference = ? WHERE id = ?`,
        [billCode, billCode, oid]
      );
    }

    await finalizePaymentEvent("toyyibpay", {
      orderId: primaryOrderId,
      status: "paid",
      eventKey: `toyyibpay-uat-${billCode}`,
      rawPayload: {
        order_id: primaryOrderId,
        billcode: billCode,
        status_id: "1",
        provider: "toyyibpay",
        uat: true,
      },
    });

    return {
      orderId: primaryOrderId,
      orderIds,
      paymentUrl: `${returnUrl}&billcode=${encodeURIComponent(billCode)}&status_id=1`,
      billCode,
      provider: provider.name,
    };
  }

  const billDescription = products.length === 1
    ? products[0].title
    : `${products.length} items from PM Advance`;

  const bill = await provider.createBill({
    orderId: primaryOrderId,
    amount: totalAmount,
    description: billDescription,
    customerName: userName,
    customerEmail: userEmail,
    callbackUrl,
    returnUrl,
  });

  // Store the bill code on all orders
  for (const oid of orderIds) {
    await getPool().execute(
      `UPDATE orders SET gateway_bill_code = ?, gateway_reference = ? WHERE id = ?`,
      [bill.billCode, bill.billCode, oid]
    );
  }

  return {
    orderId: primaryOrderId,
    orderIds,
    paymentUrl: bill.paymentUrl,
    billCode: bill.billCode,
    provider: provider.name,
  };
}

export default router;
