import { Router } from "express";
import type { Response } from "express";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { getPool } from "../../db.js";
import { getDatabaseReady, parseJsonField, toIsoString, writeAuditLog } from "../../helpers.js";
import { getPaymentGatewaySettings } from "../../lib/payment/settings.js";
import { sessionPolicyUpdateSchema } from "../../schemas.js";
import { attempts } from "../../store.js";

const router = Router();

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }
  return text;
}

function sendCsv(response: Response, filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const lines = [headers.join(","), ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(","))];
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  response.send(lines.join("\n"));
}

router.get("/summary", async (_request, response, next) => {
  try {
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json({
        revenueUsd: 4280,
        activeSubscriptions: 34,
        expiringSoon: 5,
        failedPayments: 2,
        recentAttempts: attempts.size,
        totalQuestions: 0
      });
      return;
    }

    const [metricsRows] = await getPool().query(
      `SELECT
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS revenueUsd,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedPayments
       FROM orders`
    );
    const [activeRows] = await getPool().query(
      `SELECT COUNT(*) AS activeSubscriptions
       FROM enrollments
       WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP`
    );
    const [expiringRows] = await getPool().query(
      `SELECT COUNT(*) AS expiringSoon
       FROM enrollments
       WHERE status = 'active'
         AND expires_at BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)`
    );
    const [attemptRows] = await getPool().query(
      `SELECT COUNT(*) AS recentAttempts
       FROM attempts
       WHERE started_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)`
    );
    const [questionRows] = await getPool().query(
      `SELECT COUNT(*) AS totalQuestions FROM questions`
    );

    response.json({
      revenueUsd: Number((metricsRows as Array<{ revenueUsd: number | string }>)[0]?.revenueUsd ?? 0),
      activeSubscriptions: Number((activeRows as Array<{ activeSubscriptions: number | string }>)[0]?.activeSubscriptions ?? 0),
      expiringSoon: Number((expiringRows as Array<{ expiringSoon: number | string }>)[0]?.expiringSoon ?? 0),
      failedPayments: Number((metricsRows as Array<{ failedPayments: number | string }>)[0]?.failedPayments ?? 0),
      recentAttempts: Number((attemptRows as Array<{ recentAttempts: number | string }>)[0]?.recentAttempts ?? 0),
      totalQuestions: Number((questionRows as Array<{ totalQuestions: number | string }>)[0]?.totalQuestions ?? 0)
    });

    await writeAuditLog(response.locals.user.userId, "admin.summary.viewed", "dashboard", "summary", {});
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", async (request, response, next) => {
  try {
    const limit = Number(request.query.limit ?? 30);
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 30;
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT audit_logs.id, audit_logs.action_key AS actionKey,
              audit_logs.entity_type AS entityType, audit_logs.entity_id AS entityId,
              audit_logs.payload, audit_logs.created_at AS createdAt,
              users.email AS actorEmail
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.actor_user_id
       ORDER BY audit_logs.id DESC
       LIMIT ?`,
      [safeLimit]
    );

    response.json(
      rows.map((row) => ({
        id: Number(row.id),
        actionKey: row.actionKey,
        entityType: row.entityType,
        entityId: row.entityId,
        actorEmail: row.actorEmail,
        createdAt: toIsoString(row.createdAt as Date | string),
        payload: parseJsonField(row.payload, null)
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get("/sessions", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT auth_sessions.id, auth_sessions.user_id AS userId, users.email,
              auth_sessions.user_agent AS userAgent,
              auth_sessions.ip_address AS ipAddress,
              auth_sessions.issued_at AS issuedAt,
              auth_sessions.expires_at AS expiresAt,
              auth_sessions.revoked_at AS revokedAt
       FROM auth_sessions
       INNER JOIN users ON users.id = auth_sessions.user_id
       ORDER BY auth_sessions.issued_at DESC
       LIMIT 100`
    );

    response.json(
      rows.map((row) => ({
        id: row.id,
        userId: Number(row.userId),
        email: row.email,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        issuedAt: toIsoString(row.issuedAt as Date | string),
        expiresAt: toIsoString(row.expiresAt as Date | string),
        revokedAt: toIsoString(row.revokedAt as Date | string | null)
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions/:sessionId", async (request, response, next) => {
  try {
    const [result] = await getPool().execute(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE id = ? AND revoked_at IS NULL`,
      [request.params.sessionId]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      response.status(404).json({ message: "Session not found" });
      return;
    }

    await writeAuditLog(response.locals.user.userId, "admin.session.revoked", "session", request.params.sessionId, {});
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/session-policies", async (request, response, next) => {
  try {
    const userId = Number(request.query.userId ?? 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      response.status(400).json({ message: "userId query param is required" });
      return;
    }

    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT user_id AS userId, max_sessions AS maxSessions, refresh_ttl_days AS refreshTtlDays
       FROM user_session_policies
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    const row = rows[0];
    response.json({
      userId,
      maxSessions: row ? Number(row.maxSessions) || null : null,
      refreshTtlDays: row ? Number(row.refreshTtlDays) || null : null
    });
  } catch (error) {
    next(error);
  }
});

router.put("/session-policies", async (request, response, next) => {
  try {
    const payload = sessionPolicyUpdateSchema.parse(request.body);
    await getPool().execute(
      `INSERT INTO user_session_policies (user_id, max_sessions, refresh_ttl_days)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         max_sessions = VALUES(max_sessions),
         refresh_ttl_days = VALUES(refresh_ttl_days)`,
      [payload.userId, payload.maxSessions ?? null, payload.refreshTtlDays ?? null]
    );

    await writeAuditLog(response.locals.user.userId, "admin.session.policy.updated", "user", String(payload.userId), {
      maxSessions: payload.maxSessions ?? null,
      refreshTtlDays: payload.refreshTtlDays ?? null
    });

    response.json({
      userId: payload.userId,
      maxSessions: payload.maxSessions ?? null,
      refreshTtlDays: payload.refreshTtlDays ?? null
    });
  } catch (error) {
    next(error);
  }
});

// ───────────── Reporting ─────────────

router.get("/reports/sales", async (_request, response, next) => {
  try {
    const days = Math.min(Math.max(Number((_request as any).query.days ?? 30), 1), 365);
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT DATE(orders.created_at) AS date, products.title AS productTitle,
              COUNT(*) AS orderCount,
              SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount ELSE 0 END) AS revenue
       FROM orders
       INNER JOIN products ON products.id = orders.product_id
       WHERE orders.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)
       GROUP BY DATE(orders.created_at), products.title
       ORDER BY date DESC`,
      [days]
    );
    const payload = (rows as Array<{ date: string; productTitle: string; orderCount: number | string; revenue: number | string }>).map((r) => ({
      date: r.date,
      productTitle: r.productTitle,
      orderCount: Number(r.orderCount),
      revenue: Number(r.revenue)
    }));
    if (_request.query.format === "csv") {
      sendCsv(response, `sales-report-${days}d.csv`, ["date", "productTitle", "orderCount", "revenue"], payload.map((row) => [row.date, row.productTitle, row.orderCount, row.revenue]));
      return;
    }
    response.json(payload);
  } catch (error) { next(error); }
});

router.get("/reports/enrollments", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT products.title AS productTitle, products.slug AS productSlug,
              COUNT(*) AS totalEnrollments,
              SUM(CASE WHEN enrollments.status = 'active' AND enrollments.expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS activeCount,
              SUM(CASE WHEN enrollments.expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS expiredCount
       FROM enrollments
       INNER JOIN products ON products.id = enrollments.product_id
       GROUP BY products.id
       ORDER BY totalEnrollments DESC`
    );
    const payload = (rows as Array<{ productTitle: string; productSlug: string; totalEnrollments: number | string; activeCount: number | string; expiredCount: number | string }>).map((r) => ({
      productTitle: r.productTitle,
      productSlug: r.productSlug,
      totalEnrollments: Number(r.totalEnrollments),
      activeCount: Number(r.activeCount),
      expiredCount: Number(r.expiredCount)
    }));
    if (_request.query.format === "csv") {
      sendCsv(response, "enrollment-report.csv", ["productTitle", "productSlug", "totalEnrollments", "activeCount", "expiredCount"], payload.map((row) => [row.productTitle, row.productSlug, row.totalEnrollments, row.activeCount, row.expiredCount]));
      return;
    }
    response.json(payload);
  } catch (error) { next(error); }
});

router.get("/reports/attempts", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT exams.title AS examTitle, exams.slug AS examSlug,
              COUNT(*) AS totalAttempts,
              SUM(CASE WHEN attempts.status = 'submitted' THEN 1 ELSE 0 END) AS completedAttempts,
              ROUND(AVG(CASE WHEN attempts.status = 'submitted' THEN attempts.score ELSE NULL END), 1) AS avgScore
       FROM attempts
       INNER JOIN exams ON exams.id = attempts.exam_id
       GROUP BY exams.id
       ORDER BY totalAttempts DESC`
    );
    const payload = (rows as Array<{ examTitle: string; examSlug: string; totalAttempts: number | string; completedAttempts: number | string; avgScore: number | string | null }>).map((r) => ({
      examTitle: r.examTitle,
      examSlug: r.examSlug,
      totalAttempts: Number(r.totalAttempts),
      completedAttempts: Number(r.completedAttempts),
      avgScore: r.avgScore !== null ? Number(r.avgScore) : null
    }));
    if (_request.query.format === "csv") {
      sendCsv(response, "attempt-report.csv", ["examTitle", "examSlug", "totalAttempts", "completedAttempts", "avgScore"], payload.map((row) => [row.examTitle, row.examSlug, row.totalAttempts, row.completedAttempts, row.avgScore ?? ""]));
      return;
    }
    response.json(payload);
  } catch (error) { next(error); }
});

const settingsSchema = z.object({
  supportEmail: z.string().email().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenancePageType: z.enum(["maintenance", "launch"]).optional(),
  maintenanceMessage: z.string().max(400).optional(),
  maintenanceAllowedIps: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  maintenanceTeaserLabel: z.string().max(80).optional(),
  maintenanceTeaserHeadline: z.string().max(160).optional(),
  maintenanceTeaserItems: z.array(z.string().trim().min(1).max(180)).max(6).optional(),
  maintenanceCountdownEnabled: z.boolean().optional(),
  maintenanceCountdownEndsAt: z.string().max(40).nullable().optional(),
  announcements: z.array(z.string().min(1).max(160)).optional(),
  payment: z.object({
    toyyibpay: z.object({
      enabled: z.boolean(),
      secretKey: z.string().max(500),
      categoryCode: z.string().max(120),
      sandbox: z.boolean(),
    }),
    stripe: z.object({
      enabled: z.boolean(),
      sandbox: z.boolean(),
      secretKey: z.string().max(500),
      webhookSecret: z.string().max(500),
      testSecretKey: z.string().max(500),
      testWebhookSecret: z.string().max(500),
      liveSecretKey: z.string().max(500),
      liveWebhookSecret: z.string().max(500),
    }),
    paypal: z.object({
      enabled: z.boolean(),
      clientId: z.string().max(500),
      clientSecret: z.string().max(500),
      sandbox: z.boolean(),
    }),
    billplz: z.object({
      enabled: z.boolean(),
      apiKey: z.string().max(500),
      collectionId: z.string().max(120),
      xSignatureKey: z.string().max(500),
      sandbox: z.boolean(),
    }),
  }).optional(),
});

router.get("/settings", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT setting_key AS settingKey, setting_value AS settingValue
       FROM app_settings`
    );

    const map = new Map(rows.map((row) => [String(row.settingKey), String(row.settingValue)]));
    const payment = await getPaymentGatewaySettings();

    response.json({
      supportEmail: map.get("supportEmail") ?? "support@examprep.local",
      maintenanceMode: map.get("maintenanceMode") === "true",
      maintenancePageType: map.get("maintenancePageType") === "launch" ? "launch" : "maintenance",
      maintenanceMessage: map.get("maintenanceMessage") ?? "",
      maintenanceAllowedIps: parseJsonField<string[]>(map.get("maintenanceAllowedIps") ?? "[]", []),
      maintenanceTeaserLabel: map.get("maintenanceTeaserLabel") ?? "Launching Soon",
      maintenanceTeaserHeadline: map.get("maintenanceTeaserHeadline") ?? "PM Exam Pro launches soon.",
      maintenanceTeaserItems: parseJsonField<string[]>(
        map.get("maintenanceTeaserItems") ?? "[]",
        [
          "Exam-style practice|Train with timed simulators built around certification exam workflows.",
          "Progress insights|Spot weak domains and know where to focus before exam day.",
          "Simple access|Choose a practice set, checkout, and start studying without friction.",
        ]
      ),
      maintenanceCountdownEnabled: map.get("maintenanceCountdownEnabled") === "true",
      maintenanceCountdownEndsAt: map.get("maintenanceCountdownEndsAt") || null,
      announcements: parseJsonField<string[]>(map.get("announcements") ?? "[]", []),
      payment,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/settings", async (request, response, next) => {
  try {
    const payload = settingsSchema.parse(request.body ?? {});
    const currentPayment = await getPaymentGatewaySettings();
    const payment = payload.payment ?? currentPayment;
    const entries: Array<[string, string]> = [
      ["supportEmail", payload.supportEmail ?? "support@examprep.local"],
      ["maintenanceMode", String(Boolean(payload.maintenanceMode))],
      ["maintenancePageType", payload.maintenancePageType ?? "maintenance"],
      ["maintenanceMessage", payload.maintenanceMessage ?? ""],
      ["maintenanceAllowedIps", JSON.stringify(payload.maintenanceAllowedIps ?? [])],
      ["maintenanceTeaserLabel", payload.maintenanceTeaserLabel ?? "Launching Soon"],
      ["maintenanceTeaserHeadline", payload.maintenanceTeaserHeadline ?? "PM Exam Pro launches soon."],
      ["maintenanceTeaserItems", JSON.stringify(payload.maintenanceTeaserItems ?? [])],
      ["maintenanceCountdownEnabled", String(Boolean(payload.maintenanceCountdownEnabled))],
      ["maintenanceCountdownEndsAt", payload.maintenanceCountdownEndsAt ?? ""],
      ["announcements", JSON.stringify(payload.announcements ?? [])],
      ["payment.toyyibpay.enabled", String(payment.toyyibpay.enabled)],
      ["payment.toyyibpay.secretKey", payment.toyyibpay.secretKey],
      ["payment.toyyibpay.categoryCode", payment.toyyibpay.categoryCode],
      ["payment.toyyibpay.sandbox", String(payment.toyyibpay.sandbox)],
      ["payment.stripe.enabled", String(payment.stripe.enabled)],
      ["payment.stripe.sandbox", String(payment.stripe.sandbox)],
      ["payment.stripe.testSecretKey", payment.stripe.testSecretKey],
      ["payment.stripe.testWebhookSecret", payment.stripe.testWebhookSecret],
      ["payment.stripe.liveSecretKey", payment.stripe.liveSecretKey],
      ["payment.stripe.liveWebhookSecret", payment.stripe.liveWebhookSecret],
      ["payment.paypal.enabled", String(payment.paypal.enabled)],
      ["payment.paypal.clientId", payment.paypal.clientId],
      ["payment.paypal.clientSecret", payment.paypal.clientSecret],
      ["payment.paypal.sandbox", String(payment.paypal.sandbox)],
      ["payment.billplz.enabled", String(payment.billplz.enabled)],
      ["payment.billplz.apiKey", payment.billplz.apiKey],
      ["payment.billplz.collectionId", payment.billplz.collectionId],
      ["payment.billplz.xSignatureKey", payment.billplz.xSignatureKey],
      ["payment.billplz.sandbox", String(payment.billplz.sandbox)],
    ];

    for (const [key, value] of entries) {
      await getPool().execute(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
    }

    await writeAuditLog(response.locals.user.userId, "admin.settings.updated", "settings", "platform", {
      ...payload,
      payment: payload.payment ? {
        toyyibpay: { enabled: payload.payment.toyyibpay.enabled, sandbox: payload.payment.toyyibpay.sandbox },
        stripe: { enabled: payload.payment.stripe.enabled, sandbox: payload.payment.stripe.sandbox },
        paypal: { enabled: payload.payment.paypal.enabled, sandbox: payload.payment.paypal.sandbox },
        billplz: { enabled: payload.payment.billplz.enabled, sandbox: payload.payment.billplz.sandbox },
      } : undefined,
    });
    response.json({
      supportEmail: payload.supportEmail ?? "support@examprep.local",
      maintenanceMode: Boolean(payload.maintenanceMode),
      maintenancePageType: payload.maintenancePageType ?? "maintenance",
      maintenanceMessage: payload.maintenanceMessage ?? "",
      maintenanceAllowedIps: payload.maintenanceAllowedIps ?? [],
      maintenanceTeaserLabel: payload.maintenanceTeaserLabel ?? "Launching Soon",
      maintenanceTeaserHeadline: payload.maintenanceTeaserHeadline ?? "PM Exam Pro launches soon.",
      maintenanceTeaserItems: payload.maintenanceTeaserItems ?? [],
      maintenanceCountdownEnabled: Boolean(payload.maintenanceCountdownEnabled),
      maintenanceCountdownEndsAt: payload.maintenanceCountdownEndsAt ?? null,
      announcements: payload.announcements ?? [],
      payment,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
