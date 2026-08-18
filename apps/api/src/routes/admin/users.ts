import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { getPool } from "../../db.js";
import { hasActiveEnrollment, writeAuditLog, toMySQLDatetime } from "../../helpers.js";
import { enrollmentExtendSchema, reconcileSchema, voucherCreateSchema } from "../../schemas.js";
import { sendMail } from "../../lib/mail.js";
import { z } from "zod";

const router = Router();

// ───────────── Admin User Management ─────────────

router.get("/users", async (request, response, next) => {
  try {
    const search = String(request.query.search ?? "").trim();
    const limit = Math.min(Math.max(Number(request.query.limit ?? 50), 1), 200);
    const offset = Math.max(Number(request.query.offset ?? 0), 0);
    
    // Simple base query
    let query = `SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt FROM users`;
    const params: unknown[] = [];
    if (search.length > 0) {
      query += ` WHERE email LIKE ? OR full_name LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const [rows] = await getPool().query(query, params);
    
    // Fetch latest audit log for each user in a separate query
    const userIds = (rows as Array<{id: number}>).map(r => r.id);
    let auditMap: Record<number, string> = {};
    const enrollmentMap: Record<number, Array<{ id: number; productSlug: string; productTitle: string; status: string; expiresAt: Date | string | null }>> = {};
    
    if (userIds.length > 0) {
      try {
        const placeholders = userIds.map(() => '?').join(',');
        const [auditRows] = await getPool().query(
          `SELECT entity_id AS entityId, payload 
           FROM audit_logs 
           WHERE entity_type = 'user' 
             AND entity_id IN (${placeholders})
             AND action_key LIKE 'admin.user.%'
           ORDER BY created_at DESC`,
          userIds.map(id => String(id))
        );
        
        // Keep only the first (latest) entry per user
        for (const row of auditRows as Array<{entityId: string, payload: string}>) {
          const userId = Number(row.entityId);
          if (!auditMap[userId] && row.payload) {
            try {
              const payload = JSON.parse(row.payload);
              if (payload?.reason) {
                auditMap[userId] = payload.reason;
              }
            } catch {
              // ignore parse error
            }
          }
        }
      } catch {
        // If audit query fails, continue without remarks
      }

      try {
        const placeholders = userIds.map(() => "?").join(",");
        const [enrollmentRows] = await getPool().query(
          `SELECT enrollments.id,
                  enrollments.user_id AS userId,
                  products.slug AS productSlug,
                  products.title AS productTitle,
                  enrollments.status,
                  enrollments.expires_at AS expiresAt
           FROM enrollments
           INNER JOIN products ON products.id = enrollments.product_id
           WHERE enrollments.user_id IN (${placeholders})
           ORDER BY enrollments.expires_at DESC`,
          userIds
        );
        for (const row of enrollmentRows as Array<{ id: number; userId: number; productSlug: string; productTitle: string; status: string; expiresAt: Date | string | null }>) {
          const userId = Number(row.userId);
          enrollmentMap[userId] ??= [];
          enrollmentMap[userId].push({
            id: row.id,
            productSlug: row.productSlug,
            productTitle: row.productTitle,
            status: row.status,
            expiresAt: row.expiresAt,
          });
        }
      } catch {
        // If enrollment query fails, continue without summaries
      }
    }
    
    // Merge remarks
    const parsedRows = (rows as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      lastRemark: auditMap[Number(row.id)] || null,
      enrollments: enrollmentMap[Number(row.id)] || [],
    }));
    
    response.json(parsedRows);
  } catch (error) { next(error); }
});

router.get("/users/:id", async (request, response, next) => {
  try {
    const [userRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt FROM users WHERE id = ? LIMIT 1`,
      [request.params.id]
    );
    if (userRows.length === 0) { response.status(404).json({ message: "User not found" }); return; }
    const [enrollRows] = await getPool().query<RowDataPacket[]>(
      `SELECT enrollments.id, products.slug AS productSlug, products.title AS productTitle,
              enrollments.status, enrollments.starts_at AS startsAt, enrollments.expires_at AS expiresAt
       FROM enrollments INNER JOIN products ON products.id = enrollments.product_id
       WHERE enrollments.user_id = ? ORDER BY enrollments.id DESC`,
      [request.params.id]
    );
    const [orderRows] = await getPool().query<RowDataPacket[]>(
      `SELECT orders.id, products.title AS productTitle, orders.status, orders.total_amount AS totalAmount,
              orders.created_at AS createdAt
       FROM orders INNER JOIN products ON products.id = orders.product_id
       WHERE orders.user_id = ? ORDER BY orders.id DESC LIMIT 20`,
      [request.params.id]
    );
    response.json({ ...userRows[0], enrollments: enrollRows, orders: orderRows });
  } catch (error) { next(error); }
});

router.patch("/users/:id/status", async (request, response, next) => {
  try {
    const { status, reason } = z.object({ status: z.enum(["active", "suspended"]), reason: z.string().min(2) }).parse(request.body);
    const [result] = await getPool().execute(`UPDATE users SET status = ? WHERE id = ?`, [status, request.params.id]);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "User not found" }); return; }
    await writeAuditLog(response.locals.user.userId, `admin.user.${status}`, "user", request.params.id, { reason });
    response.json({ id: Number(request.params.id), status, lastRemark: reason });
  } catch (error) { next(error); }
});

// ───────────── Add Single User (admin) ─────────────

function generateRandomPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const userCreateSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(8).optional(),
  role: z.enum(["student", "admin", "content_admin", "support_admin"]).default("student"),
  productSlug: z.string().optional(),
  accessDays: z.coerce.number().int().positive().optional(),
  sendWelcomeEmail: z.boolean().default(true),
});

router.post("/users", async (request, response, next) => {
  try {
    const payload = userCreateSchema.parse(request.body);
    if (payload.role !== "student" && response.locals.user.role !== "super_admin") {
      response.status(403).json({ message: "Only super_admin can create non-student users" });
      return;
    }
    const pool = getPool();
    const [existing] = await pool.query<RowDataPacket[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [payload.email]);
    if (existing.length > 0) {
      response.status(409).json({ message: "Email already in use" });
      return;
    }
    const generatedPassword = payload.password ?? generateRandomPassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    const [insert] = await pool.execute(
      `INSERT INTO users (email, full_name, role, status, password_hash, email_verified_at)
       VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)`,
      [payload.email, payload.fullName, payload.role, passwordHash]
    );
    const userId = (insert as { insertId: number }).insertId;

    let enrollmentId: number | null = null;
    if (payload.productSlug) {
      const [prodRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, access_days AS accessDays FROM products WHERE slug = ? LIMIT 1`,
        [payload.productSlug]
      );
      if (prodRows.length > 0) {
        const accessDays = payload.accessDays ?? Number(prodRows[0].accessDays ?? 90);
        const [enrollResult] = await pool.execute(
          `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
           VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY), 'active')`,
          [userId, prodRows[0].id, accessDays]
        );
        enrollmentId = (enrollResult as { insertId: number }).insertId;
      }
    }

    if (payload.sendWelcomeEmail) {
      try {
        const html = `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
            <h2 style="color:#E8792B;">Welcome, ${payload.fullName}!</h2>
            <p>Your account on PMP Practice Exam Simulator has been created by an administrator.</p>
            <p><strong>Email:</strong> ${payload.email}<br/>
               <strong>Temporary Password:</strong> <code>${generatedPassword}</code></p>
            <p>Please sign in and change your password as soon as possible.</p>
            <p style="color:#666;font-size:12px;">If you did not expect this email, please contact support.</p>
          </div>
        `;
        await sendMail(payload.email, "Welcome to PMP Practice Exam Simulator", html);
      } catch {
        // Email failure should not block user creation
      }
    }

    await writeAuditLog(response.locals.user.userId, "admin.user.created", "user", String(userId), {
      email: payload.email, role: payload.role, productSlug: payload.productSlug ?? null, enrollmentId,
    });

    response.status(201).json({
      id: userId,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      enrollmentId,
      generatedPassword: payload.password ? undefined : generatedPassword,
    });
  } catch (error) { next(error); }
});

// ───────────── Bulk User Import (CSV preview + apply) ─────────────

type BulkUserRow = {
  email: string;
  fullName: string;
  password: string | null;
  productSlugs: string[];
  accessDays: number | null;
  rowNumber: number;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitProductSlugs(value: string) {
  return value
    .split(/[;|\s]+/)
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);
}

function parseUserCsv(csv: string): { records: BulkUserRow[]; errors: Array<{ row: number; reason: string }> } {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 1) throw new Error("CSV must include at least one user row");

  function parseRow(line: string): string[] {
    const out: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { out.push(cur.trim()); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur.trim());
    return out;
  }

  const aliases: Record<string, string> = {
    "email": "email", "emailaddress": "email", "e-mail": "email",
    "fullname": "fullName", "name": "fullName", "fullName": "fullName",
    "password": "password", "pwd": "password",
    "productslug": "productSlug", "product": "productSlug", "slug": "productSlug",
    "accessdays": "accessDays", "days": "accessDays", "access": "accessDays",
  };

  const firstRow = parseRow(lines[0]);
  const hasHeader = !emailPattern.test((firstRow[0] ?? "").trim().toLowerCase());
  const rawHeader = hasHeader ? firstRow : ["email", "fullName", "password", "productSlug", "accessDays"];
  const idx: Record<string, number> = {};
  rawHeader.forEach((name, i) => {
    const norm = name.toLowerCase().replace(/[\s_-]+/g, "");
    const canonical = aliases[norm] ?? name;
    if (idx[canonical] === undefined) idx[canonical] = i;
  });

  if (idx.email === undefined || idx.fullName === undefined) {
    throw new Error("CSV missing required columns: email, fullName");
  }
  if (hasHeader && lines.length < 2) {
    throw new Error("CSV must include at least one data row");
  }

  const records: BulkUserRow[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const seen = new Set<string>();

  const dataLines = hasHeader ? lines.slice(1) : lines;
  dataLines.forEach((line, i) => {
    const rowNum = i + (hasHeader ? 2 : 1);
    const cols = parseRow(line);
    const email = (cols[idx.email] ?? "").trim().toLowerCase();
    const fullName = (cols[idx.fullName] ?? "").trim();
    if (!email) { errors.push({ row: rowNum, reason: "missing email" }); return; }
    if (!emailPattern.test(email)) { errors.push({ row: rowNum, reason: `invalid email "${email}"` }); return; }
    if (!fullName) { errors.push({ row: rowNum, reason: "missing fullName" }); return; }
    if (seen.has(email)) { errors.push({ row: rowNum, reason: `duplicate email "${email}" within file` }); return; }
    seen.add(email);
    const password = idx.password !== undefined ? (cols[idx.password] || "").trim() : "";
    const productSlugs = idx.productSlug !== undefined ? splitProductSlugs(cols[idx.productSlug] || "") : [];
    const accessDaysRaw = idx.accessDays !== undefined ? (cols[idx.accessDays] || "").trim() : "";
    if (password && password.length < 8) {
      errors.push({ row: rowNum, reason: "password must be at least 8 characters, or leave it blank to auto-generate" });
      return;
    }
    let accessDays: number | null = null;
    if (accessDaysRaw) {
      accessDays = Number(accessDaysRaw);
      if (!Number.isInteger(accessDays) || accessDays < 0 || (productSlugs.length > 0 && accessDays === 0)) {
        errors.push({
          row: rowNum,
          reason: productSlugs.length > 0
            ? `accessDays must be a positive whole number when productSlug is provided, got "${accessDaysRaw}"`
            : `accessDays must be 0 or a positive whole number, got "${accessDaysRaw}"`,
        });
        return;
      }
    }
    records.push({
      email, fullName,
      password: password || null,
      productSlugs,
      accessDays,
      rowNumber: rowNum,
    });
  });

  return { records, errors };
}

async function loadProductsBySlug(productSlugs: string[]) {
  const productMap: Record<string, { id: number; accessDays: number }> = {};
  if (productSlugs.length === 0) return productMap;

  const [prodRows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, slug, access_days AS accessDays FROM products WHERE slug IN (?)`,
    [productSlugs]
  );
  for (const p of prodRows as Array<{ id: number; slug: string; accessDays: number }>) {
    productMap[p.slug] = { id: p.id, accessDays: Number(p.accessDays) };
  }
  return productMap;
}

router.post("/users/import/preview", async (request, response, next) => {
  try {
    const { csv } = z.object({ csv: z.string().min(10) }).parse(request.body);
    const parsed = parseUserCsv(csv);
    if (parsed.records.length === 0) {
      response.json({
        total: 0,
        newUsers: 0,
        duplicates: 0,
        withEnrollment: 0,
        records: [],
        errors: parsed.errors.length > 0 ? parsed.errors : [{ row: 1, reason: "No valid rows found" }],
      });
      return;
    }
    const emails = parsed.records.map((r) => r.email);
    const [existingRows] = await getPool().query<RowDataPacket[]>(
      `SELECT email FROM users WHERE email IN (?)`, [emails]
    );
    const existingEmails = new Set((existingRows as Array<{ email: string }>).map((r) => r.email.toLowerCase()));

    const productSlugs = [...new Set(parsed.records.flatMap((r) => r.productSlugs))];
    const productMap = await loadProductsBySlug(productSlugs);
    const errors = [...parsed.errors];
    const invalidRows = new Set(parsed.errors.map((error) => error.row));
    for (const record of parsed.records) {
      for (const productSlug of record.productSlugs) {
        if (!productMap[productSlug]) {
          errors.push({ row: record.rowNumber, reason: `unknown productSlug "${productSlug}"` });
          invalidRows.add(record.rowNumber);
        }
      }
    }

    const preview = parsed.records.map((r) => ({
      ...r,
      productSlug: r.productSlugs.join(";"),
      alreadyExists: existingEmails.has(r.email),
      productResolved: r.productSlugs.length > 0 ? r.productSlugs.every((slug) => Boolean(productMap[slug])) : null,
      importable: !existingEmails.has(r.email) && !invalidRows.has(r.rowNumber),
    }));

    response.json({
      total: parsed.records.length,
      newUsers: preview.filter((p) => p.importable).length,
      duplicates: preview.filter((p) => p.alreadyExists).length,
      withEnrollment: preview.filter((p) => p.importable && p.productSlugs.length > 0 && p.productResolved).length,
      records: preview,
      errors,
    });
  } catch (error) { next(error); }
});

router.post("/users/import/apply", async (request, response, next) => {
  try {
    const { csv, sendWelcomeEmail } = z.object({
      csv: z.string().min(10),
      sendWelcomeEmail: z.boolean().default(true),
    }).parse(request.body);
    const parsed = parseUserCsv(csv);
    if (parsed.records.length === 0) {
      response.status(400).json({ message: "No valid rows found", errors: parsed.errors });
      return;
    }

    const pool = getPool();
    const created: Array<{ email: string; userId: number; generatedPassword?: string }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    // Pre-resolve product slugs
    const productSlugs = [...new Set(parsed.records.flatMap((r) => r.productSlugs))];
    const productMap = await loadProductsBySlug(productSlugs);
    const errors = [...parsed.errors];
    for (const record of parsed.records) {
      for (const productSlug of record.productSlugs) {
        if (!productMap[productSlug]) {
          errors.push({ row: record.rowNumber, reason: `unknown productSlug "${productSlug}"` });
        }
      }
    }
    if (errors.length > 0) {
      response.status(400).json({ message: "Fix CSV errors before applying import", errors });
      return;
    }

    for (const r of parsed.records) {
      const [existing] = await pool.query<RowDataPacket[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [r.email]);
      if (existing.length > 0) {
        skipped.push({ email: r.email, reason: "already exists" });
        continue;
      }
      const generated = r.password ?? generateRandomPassword();
      const hash = await bcrypt.hash(generated, 10);
      const [insert] = await pool.execute(
        `INSERT INTO users (email, full_name, role, status, password_hash, email_verified_at)
         VALUES (?, ?, 'student', 'active', ?, CURRENT_TIMESTAMP)`,
        [r.email, r.fullName, hash]
      );
      const userId = (insert as { insertId: number }).insertId;

      for (const productSlug of r.productSlugs) {
        const product = productMap[productSlug];
        if (!product) continue;
        const days = r.accessDays ?? product.accessDays;
        await pool.execute(
          `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
           VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY), 'active')`,
          [userId, product.id, days]
        );
      }

      if (sendWelcomeEmail) {
        try {
          const html = `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#E8792B;">Welcome, ${r.fullName}!</h2>
            <p>Your account has been created. Sign in with:</p>
            <p><strong>Email:</strong> ${r.email}<br/><strong>Password:</strong> <code>${generated}</code></p>
            <p>Please change your password after signing in.</p>
          </div>`;
          await sendMail(r.email, "Welcome to PMP Practice Exam Simulator", html);
        } catch { /* ignore email errors */ }
      }

      created.push({ email: r.email, userId, generatedPassword: r.password ? undefined : generated });
    }

    await writeAuditLog(response.locals.user.userId, "admin.users.bulk-import", "user", "batch", {
      created: created.length, skipped: skipped.length, errors: parsed.errors.length,
    });

    response.json({
      created: created.length,
      skipped: skipped.length,
      errors: parsed.errors,
      results: created,
      skippedDetail: skipped,
    });
  } catch (error) { next(error); }
});

// ───────────── Admin Orders & Enrollments ─────────────

router.get("/orders", async (request, response, next) => {
  try {
    const status = request.query.status as string | undefined;
    const limit = Math.min(Math.max(Number(request.query.limit ?? 50), 1), 200);
    const offset = Math.max(Number(request.query.offset ?? 0), 0);
    let query = `SELECT orders.id, users.email AS userEmail, COALESCE(products.title, CONCAT('(deleted product #', orders.product_id, ')')) AS productTitle,
                        orders.status, orders.total_amount AS totalAmount, orders.gateway_reference AS gatewayReference,
                        orders.created_at AS createdAt, orders.updated_at AS updatedAt
                 FROM orders
                 INNER JOIN users ON users.id = orders.user_id
                 LEFT JOIN products ON products.id = orders.product_id`;
    const params: unknown[] = [];
    if (status && ["pending", "paid", "failed", "refunded"].includes(status)) {
      query += ` WHERE orders.status = ?`; params.push(status);
    }
    query += ` ORDER BY orders.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const [rows] = await getPool().query(query, params);
    response.json((rows as Array<Record<string, unknown>>).map((r) => ({ ...r, totalAmount: Number(r.totalAmount) })));
  } catch (error) { next(error); }
});

router.patch("/orders/:id/reconcile", async (request, response, next) => {
  try {
    const payload = reconcileSchema.parse(request.body);
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, user_id AS userId, product_id AS productId, status FROM orders WHERE id = ? LIMIT 1`,
      [request.params.id]
    );
    if (rows.length === 0) { response.status(404).json({ message: "Order not found" }); return; }
    const order = rows[0];
    await getPool().execute(`UPDATE orders SET status = ? WHERE id = ?`, [payload.status, order.id]);
    if (payload.status === "paid" && order.status !== "paid") {
      const [prodRows] = await getPool().query<RowDataPacket[]>(`SELECT access_days AS accessDays FROM products WHERE id = ? LIMIT 1`, [order.productId]);
      const accessDays = Number(prodRows[0]?.accessDays ?? 90);
      const alreadyEnrolled = await hasActiveEnrollment(Number(order.userId), Number(order.productId));
      if (!alreadyEnrolled) {
        await getPool().execute(
          `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status) VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY), 'active')`,
          [order.userId, order.productId, accessDays]
        );
      }
    }
    await writeAuditLog(response.locals.user.userId, "admin.order.reconcile", "order", String(order.id), { ...payload, previousStatus: order.status });
    response.json({ id: Number(order.id), status: payload.status });
  } catch (error) { next(error); }
});

router.patch("/enrollments/:id/extend", async (request, response, next) => {
  try {
    const payload = enrollmentExtendSchema.parse(request.body);
    const [result] = await getPool().execute(
      `UPDATE enrollments SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), status = 'active' WHERE id = ?`,
      [payload.days, request.params.id]
    );
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Enrollment not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.enrollment.extended", "enrollment", request.params.id, payload);
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, user_id AS userId, product_id AS productId, status, starts_at AS startsAt, expires_at AS expiresAt FROM enrollments WHERE id = ? LIMIT 1`,
      [request.params.id]
    );
    response.json(rows[0]);
  } catch (error) { next(error); }
});

const enrollmentGrantSchema = z.object({
  productSlug: z.string().min(3),
  accessDays: z.coerce.number().int().positive(),
});

router.post("/users/:id/enrollments", async (request, response, next) => {
  try {
    const userId = Number(request.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(400).json({ message: "Invalid user id" });
      return;
    }

    const payload = enrollmentGrantSchema.parse(request.body);
    const pool = getPool();
    const [userRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (userRows.length === 0) {
      response.status(404).json({ message: "User not found" });
      return;
    }

    const [productRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, slug, title FROM products WHERE slug = ? LIMIT 1`,
      [payload.productSlug]
    );
    if (productRows.length === 0) {
      response.status(404).json({ message: "Product not found" });
      return;
    }
    const product = productRows[0];

    const [activeRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM enrollments
       WHERE user_id = ? AND product_id = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP
       ORDER BY expires_at DESC LIMIT 1`,
      [userId, product.id]
    );

    let enrollmentId: number;
    if (activeRows.length > 0) {
      enrollmentId = Number(activeRows[0].id);
      await pool.execute(
        `UPDATE enrollments
         SET starts_at = CURRENT_TIMESTAMP,
             expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY),
             status = 'active'
         WHERE id = ?`,
        [payload.accessDays, enrollmentId]
      );
    } else {
      const [insert] = await pool.execute(
        `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
         VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY), 'active')`,
        [userId, product.id, payload.accessDays]
      );
      enrollmentId = (insert as { insertId: number }).insertId;
    }

    await writeAuditLog(response.locals.user.userId, "admin.enrollment.granted", "enrollment", String(enrollmentId), {
      userId,
      productSlug: payload.productSlug,
      accessDays: payload.accessDays,
    });

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT enrollments.id,
              products.slug AS productSlug,
              products.title AS productTitle,
              enrollments.status,
              enrollments.starts_at AS startsAt,
              enrollments.expires_at AS expiresAt
       FROM enrollments
       INNER JOIN products ON products.id = enrollments.product_id
       WHERE enrollments.id = ? LIMIT 1`,
      [enrollmentId]
    );
    response.status(activeRows.length > 0 ? 200 : 201).json(rows[0]);
  } catch (error) { next(error); }
});

router.patch("/enrollments/:id/status", async (request, response, next) => {
  try {
    const payload = z.object({ status: z.enum(["active", "revoked"]) }).parse(request.body);
    const [result] = await getPool().execute(
      `UPDATE enrollments SET status = ? WHERE id = ?`,
      [payload.status, request.params.id]
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      response.status(404).json({ message: "Enrollment not found" });
      return;
    }
    await writeAuditLog(response.locals.user.userId, `admin.enrollment.${payload.status}`, "enrollment", request.params.id, payload);
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT enrollments.id,
              products.slug AS productSlug,
              products.title AS productTitle,
              enrollments.status,
              enrollments.starts_at AS startsAt,
              enrollments.expires_at AS expiresAt
       FROM enrollments
       INNER JOIN products ON products.id = enrollments.product_id
       WHERE enrollments.id = ? LIMIT 1`,
      [request.params.id]
    );
    response.json(rows[0]);
  } catch (error) { next(error); }
});

// ───────────── Voucher Management ─────────────

router.get("/vouchers", async (request, response, next) => {
  try {
    const page = Math.max(Number(request.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(request.query.limit ?? 25), 1), 200);
    const offset = (page - 1) * limit;
    const search = String(request.query.search ?? "").trim();
    const statusFilter = String(request.query.status ?? "").trim();
    const typeFilter = String(request.query.type ?? "").trim();
    const productIdFilter = request.query.productId ? Number(request.query.productId) : null;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) { conditions.push("v.code LIKE ?"); params.push(`%${search}%`); }
    if (statusFilter === "active") { conditions.push("v.status = 'active' AND (v.valid_until IS NULL OR v.valid_until >= CURRENT_TIMESTAMP)"); }
    else if (statusFilter === "expired") { conditions.push("(v.status != 'active' OR (v.valid_until IS NOT NULL AND v.valid_until < CURRENT_TIMESTAMP))"); }
    if (typeFilter === "fixed" || typeFilter === "percentage") { conditions.push("v.type = ?"); params.push(typeFilter); }
    if (productIdFilter) { conditions.push("v.product_id = ?"); params.push(productIdFilter); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await getPool().query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM vouchers v ${where}`, params
    );
    const total = Number((countRows as RowDataPacket[])[0].total);

    const dataParams = [...params, limit, offset];
    const [rows] = await getPool().query(
      `SELECT v.id, v.code, v.type, v.amount, v.min_order AS minOrder, v.usage_limit AS usageLimit,
              v.per_user_limit AS perUserLimit, v.product_id AS productId, p.title AS productTitle,
              v.valid_from AS validFrom, v.valid_until AS validUntil, v.status, v.created_at AS createdAt,
              COALESCE(r.redemptions, 0) AS redemptions
       FROM vouchers v
       LEFT JOIN products p ON p.id = v.product_id
       LEFT JOIN (SELECT voucher_id, COUNT(*) AS redemptions FROM voucher_redemptions GROUP BY voucher_id) r ON r.voucher_id = v.id
       ${where}
       ORDER BY v.id DESC LIMIT ? OFFSET ?`,
      dataParams
    );
    response.json({
      data: (rows as Array<Record<string, unknown>>).map((r) => ({ ...r, amount: Number(r.amount), minOrder: Number(r.minOrder), redemptions: Number(r.redemptions) })),
      total,
      page,
      limit,
    });
  } catch (error) { next(error); }
});

router.post("/vouchers", async (request, response, next) => {
  try {
    const payload = voucherCreateSchema.parse(request.body);
    const validFrom = payload.validFrom ? toMySQLDatetime(payload.validFrom) : toMySQLDatetime(new Date().toISOString());
    const validUntil = payload.validUntil ? toMySQLDatetime(payload.validUntil) : null;
    const [result] = await getPool().execute(
      `INSERT INTO vouchers (code, type, amount, min_order, usage_limit, per_user_limit, product_id, valid_from, valid_until, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payload.code, payload.type, payload.amount, payload.minOrder, payload.usageLimit ?? null, payload.perUserLimit, payload.productId ?? null,
       validFrom, validUntil, payload.status]
    );
    const voucherId = (result as { insertId: number }).insertId;
    await writeAuditLog(response.locals.user.userId, "admin.voucher.created", "voucher", String(voucherId), payload);
    response.status(201).json({ id: voucherId, ...payload });
  } catch (error) { next(error); }
});

// ───────────── Voucher Bulk Issue ─────────────

const voucherBulkSchema = z.object({
  prefix: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/i),
  count: z.coerce.number().int().min(1).max(500),
  type: z.enum(["fixed", "percentage"]).default("fixed"),
  amount: z.coerce.number().positive(),
  minOrder: z.coerce.number().min(0).default(0),
  perUserLimit: z.coerce.number().int().positive().default(1),
  usageLimit: z.coerce.number().int().positive().default(1),
  productId: z.coerce.number().int().positive().nullable().optional(),
  validUntil: z.string().nullable().optional(),
});

function generateVoucherSuffix(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

router.post("/vouchers/bulk", async (request, response, next) => {
  try {
    const payload = voucherBulkSchema.parse(request.body);
    const pool = getPool();
    const created: Array<{ id: number; code: string }> = [];
    const validFrom = toMySQLDatetime(new Date().toISOString());
    for (let i = 0; i < payload.count; i++) {
      let code = "";
      let attempts = 0;
      // Try unique code up to 5 times per slot
      while (attempts < 5) {
        const candidate = `${payload.prefix.toUpperCase()}-${generateVoucherSuffix()}`;
        const [exists] = await pool.query<RowDataPacket[]>(`SELECT id FROM vouchers WHERE code = ? LIMIT 1`, [candidate]);
        if (exists.length === 0) { code = candidate; break; }
        attempts++;
      }
      if (!code) continue;
      const [result] = await pool.execute(
        `INSERT INTO vouchers (code, type, amount, min_order, usage_limit, per_user_limit, product_id, valid_from, valid_until, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [code, payload.type, payload.amount, payload.minOrder, payload.usageLimit, payload.perUserLimit,
         payload.productId ?? null, validFrom, payload.validUntil ? toMySQLDatetime(payload.validUntil) : null]
      );
      created.push({ id: (result as { insertId: number }).insertId, code });
    }
    await writeAuditLog(response.locals.user.userId, "admin.voucher.bulk-issued", "voucher", payload.prefix, {
      requested: payload.count, created: created.length, type: payload.type, amount: payload.amount,
    });
    response.status(201).json({ requested: payload.count, created: created.length, codes: created });
  } catch (error) { next(error); }
});

// ───────────── Voucher Analytics ─────────────

router.get("/vouchers/analytics", async (_request, response, next) => {
  try {
    const pool = getPool();
    // Aggregate redemption stats from voucher_redemptions (joined to orders for paid status).
    // Counts every redemption row; sums discount only for paid orders.
    type AnalyticsRow = { code: string; type: string; amount: number; usageLimit: number | null; status: string;
      validUntil: Date | string | null; redemptions: number; totalDiscount: number };
    const [r] = await pool.query<RowDataPacket[]>(
      `SELECT v.code, v.type, v.amount, v.usage_limit AS usageLimit, v.status, v.valid_until AS validUntil,
              COALESCE(stats.redemptions, 0) AS redemptions,
              COALESCE(stats.totalDiscount, 0) AS totalDiscount
       FROM vouchers v
       LEFT JOIN (
         SELECT vr.voucher_id,
                COUNT(*) AS redemptions,
                SUM(CASE WHEN o.status = 'paid' THEN vr.discount_amount ELSE 0 END) AS totalDiscount
         FROM voucher_redemptions vr
         INNER JOIN orders o ON o.id = vr.order_id
         GROUP BY vr.voucher_id
       ) stats ON stats.voucher_id = v.id
       ORDER BY redemptions DESC, v.id DESC LIMIT 100`
    );
    const rows = (r as unknown) as AnalyticsRow[];
    const totalRedemptions = rows.reduce((s, r) => s + Number(r.redemptions ?? 0), 0);
    const totalDiscount = rows.reduce((s, r) => s + Number(r.totalDiscount ?? 0), 0);
    const expiringSoon = rows.filter((r) => {
      if (!r.validUntil) return false;
      const d = new Date(r.validUntil as string).getTime();
      const now = Date.now();
      return d > now && d - now < 14 * 24 * 60 * 60 * 1000;
    }).length;
    response.json({
      summary: {
        totalVouchers: rows.length,
        totalRedemptions,
        totalDiscount: Number(totalDiscount.toFixed(2)),
        expiringSoon,
      },
      vouchers: rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        redemptions: Number(r.redemptions ?? 0),
        totalDiscount: Number(r.totalDiscount ?? 0),
      })),
    });
  } catch (error) { next(error); }
});

// ───────────── Role Management (super_admin only) ─────────────

router.patch("/users/:id/role", async (request, response, next) => {
  try {
    if (response.locals.user.role !== "super_admin") {
      response.status(403).json({ message: "Only super_admin can change user roles" });
      return;
    }
    const { role, reason } = z.object({
      role: z.enum(["student", "admin", "super_admin", "content_admin", "support_admin"]),
      reason: z.string().min(2)
    }).parse(request.body);
    if (Number(request.params.id) === response.locals.user.userId) {
      response.status(400).json({ message: "Cannot change your own role" });
      return;
    }
    const [result] = await getPool().execute(`UPDATE users SET role = ? WHERE id = ?`, [role, request.params.id]);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "User not found" }); return; }
    await writeAuditLog(response.locals.user.userId, "admin.user.role-changed", "user", request.params.id, { role, reason });
    response.json({ id: Number(request.params.id), role });
  } catch (error) { next(error); }
});

// ───────────── Voucher Email Send ─────────────

router.post("/vouchers/:id/send-email", async (request, response, next) => {
  try {
    const { emails, message } = z.object({
      emails: z.array(z.string().email()).min(1).max(50),
      message: z.string().max(500).optional(),
    }).parse(request.body);

    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT v.id, v.code, v.type, v.amount, v.valid_until AS validUntil, p.title AS productTitle
       FROM vouchers v LEFT JOIN products p ON p.id = v.product_id
       WHERE v.id = ? LIMIT 1`,
      [request.params.id]
    );
    if (rows.length === 0) { response.status(404).json({ message: "Voucher not found" }); return; }
    const v = rows[0];

    const discount = v.type === "percentage" ? `${Number(v.amount)}% off` : `USD ${Number(v.amount).toFixed(2)} off`;
    const expiry = v.validUntil ? new Date(v.validUntil as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "No expiry";
    const courseNote = v.productTitle ? `<p style="margin:0 0 8px"><strong>Applicable course:</strong> ${String(v.productTitle)}</p>` : `<p style="margin:0 0 8px"><strong>Applicable course:</strong> All courses</p>`;
    const customMsg = message ? `<p style="margin:16px 0 0;color:#555;">${String(message)}</p>` : "";

    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;">
  <h2 style="color:#E8792B;">You've received a discount voucher!</h2>
  <p>Here is your exclusive voucher code for <strong>PM Advance</strong>:</p>
  <div style="text-align:center;padding:20px;background:#f8f8f8;border-radius:8px;margin:20px 0;">
    <span style="font-size:2rem;font-weight:bold;letter-spacing:4px;font-family:monospace;color:#222;">${String(v.code)}</span>
  </div>
  <p style="margin:0 0 8px"><strong>Discount:</strong> ${discount}</p>
  ${courseNote}
  <p style="margin:0 0 8px"><strong>Valid until:</strong> ${expiry}</p>
  ${customMsg}
  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
  <p style="font-size:12px;color:#aaa;">Apply this code at checkout on <a href="https://pmadvance.com.my" style="color:#E8792B;">pmadvance.com.my</a>.</p>
</div>`;

    const sent: string[] = [];
    const failed: string[] = [];
    for (const email of emails) {
      try {
        await sendMail(email, `Your PM Advance Voucher: ${String(v.code)}`, html);
        sent.push(email);
      } catch {
        failed.push(email);
      }
    }

    await writeAuditLog(response.locals.user.userId, "admin.voucher.emailed", "voucher", request.params.id, { sent, failed });
    response.json({ sent: sent.length, failed: failed.length, failedEmails: failed });
  } catch (error) { next(error); }
});

// ───────────── Voucher Status Update ─────────────

router.patch("/vouchers/:id", async (request, response, next) => {
  try {
    const payload = z.object({
      status: z.enum(["active", "inactive", "expired"]).optional(),
      type: z.enum(["fixed", "percentage"]).optional(),
      amount: z.coerce.number().positive().optional(),
      minOrder: z.coerce.number().min(0).optional(),
      usageLimit: z.coerce.number().int().positive().nullable().optional(),
      perUserLimit: z.coerce.number().int().positive().optional(),
      validUntil: z.string().nullable().optional(),
    }).parse(request.body);

    const sets: string[] = [];
    const vals: (string | number | null)[] = [];

    if (payload.status !== undefined) { sets.push("status = ?"); vals.push(payload.status); }
    if (payload.type !== undefined) { sets.push("type = ?"); vals.push(payload.type); }
    if (payload.amount !== undefined) { sets.push("amount = ?"); vals.push(payload.amount); }
    if (payload.minOrder !== undefined) { sets.push("min_order = ?"); vals.push(payload.minOrder); }
    if (payload.usageLimit !== undefined) { sets.push("usage_limit = ?"); vals.push(payload.usageLimit); }
    if (payload.perUserLimit !== undefined) { sets.push("per_user_limit = ?"); vals.push(payload.perUserLimit); }
    if (payload.validUntil !== undefined) { sets.push("valid_until = ?"); vals.push(payload.validUntil ? toMySQLDatetime(payload.validUntil) : null); }

    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }

    vals.push(Number(request.params.id));
    const [result] = await getPool().execute(`UPDATE vouchers SET ${sets.join(", ")} WHERE id = ?`, vals);
    if ((result as { affectedRows: number }).affectedRows === 0) { response.status(404).json({ message: "Voucher not found" }); return; }

    await writeAuditLog(response.locals.user.userId, "admin.voucher.updated", "voucher", request.params.id, payload);
    response.json({ id: Number(request.params.id), ...payload });
  } catch (error) { next(error); }
});

// ───────────── Delete User (Anonymise) ─────────────

router.delete("/users/:id", async (request, response, next) => {
  try {
    const targetId = Number(request.params.id);
    if (isNaN(targetId)) { response.status(400).json({ message: "Invalid user id" }); return; }

    // Prevent self-deletion
    if (targetId === response.locals.user.userId) {
      response.status(400).json({ message: "You cannot delete your own account" });
      return;
    }

    // Fetch target user
    const [userRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, email, full_name AS fullName, role FROM users WHERE id = ? LIMIT 1`,
      [targetId]
    );
    if (userRows.length === 0) { response.status(404).json({ message: "User not found" }); return; }
    const target = userRows[0];

    // Only super_admin can delete another super_admin
    if (target.role === "super_admin" && response.locals.user.role !== "super_admin") {
      response.status(403).json({ message: "Only super_admin can delete another super_admin account" });
      return;
    }

    const anonymisedEmail = `deleted_${targetId}@deleted.invalid`;
    const pool = getPool();

    // Anonymise: wipe PII, free the email for reuse
    const [updateResult] = await pool.query(
      `UPDATE users SET
         email = ?,
         full_name = '[Deleted User]',
         password_hash = '[deleted]'
       WHERE id = ?`,
      [anonymisedEmail, targetId]
    );

    // Revoke all active sessions for the deleted user
    await pool.query(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`,
      [targetId]
    );

    await writeAuditLog(response.locals.user.userId, "admin.user.deleted", "user", String(targetId), {
      originalEmail: String(target.email),
      originalName: String(target.fullName),
      role: String(target.role),
    });

    response.json({ id: targetId, anonymised: true });
  } catch (error) {
    console.error("[DELETE /users/:id] Error:", error);
    next(error);
  }
});

export default router;
