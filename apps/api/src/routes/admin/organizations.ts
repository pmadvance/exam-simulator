import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { getPool } from "../../db.js";
import { writeAuditLog } from "../../helpers.js";

const router = Router();

const orgCreateSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  name: z.string().min(2).max(200),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  seatTierOverride: z.coerce.number().min(0).max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["active", "suspended", "archived"]).default("active"),
});

const orgUpdateSchema = orgCreateSchema.partial().omit({ slug: true });

/** Default seat-tier discount logic (percent). Override per-org via seat_tier_override column. */
export function defaultSeatDiscount(seats: number): number {
  if (seats >= 20) return 20;
  if (seats >= 10) return 15;
  if (seats >= 5) return 10;
  return 0;
}

router.get("/organizations", async (_request, response, next) => {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT o.id, o.slug, o.name, o.contact_email AS contactEmail, o.contact_phone AS contactPhone,
              o.seat_tier_override AS seatTierOverride, o.notes, o.status,
              o.created_at AS createdAt, o.updated_at AS updatedAt,
              (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id) AS memberCount,
              (SELECT COUNT(*) FROM organization_orders oo WHERE oo.organization_id = o.id) AS orderCount
       FROM organizations o ORDER BY o.id DESC LIMIT 200`
    );
    response.json((rows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      seatTierOverride: r.seatTierOverride !== null ? Number(r.seatTierOverride) : null,
      memberCount: Number(r.memberCount ?? 0),
      orderCount: Number(r.orderCount ?? 0),
    })));
  } catch (error) { next(error); }
});

router.get("/organizations/:id", async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const pool = getPool();
    const [orgRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, slug, name, contact_email AS contactEmail, contact_phone AS contactPhone,
              seat_tier_override AS seatTierOverride, notes, status,
              created_at AS createdAt, updated_at AS updatedAt
       FROM organizations WHERE id = ? LIMIT 1`, [id]
    );
    if (orgRows.length === 0) { response.status(404).json({ message: "Organization not found" }); return; }
    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT om.id, om.role, om.invited_email AS invitedEmail, om.joined_at AS joinedAt,
              u.id AS userId, u.email, u.full_name AS fullName
       FROM organization_members om INNER JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = ? ORDER BY om.id ASC`, [id]
    );
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT oo.id, oo.order_id AS orderId, oo.seat_count AS seatCount,
              oo.discount_percent AS discountPercent, oo.created_at AS createdAt,
              o.status AS orderStatus, o.total_amount AS totalAmount
       FROM organization_orders oo INNER JOIN orders o ON o.id = oo.order_id
       WHERE oo.organization_id = ? ORDER BY oo.id DESC LIMIT 50`, [id]
    );
    response.json({
      ...orgRows[0],
      seatTierOverride: orgRows[0].seatTierOverride !== null ? Number(orgRows[0].seatTierOverride) : null,
      members,
      orders: (orders as Array<Record<string, unknown>>).map((r) => ({
        ...r,
        discountPercent: Number(r.discountPercent ?? 0),
        totalAmount: Number(r.totalAmount ?? 0),
      })),
    });
  } catch (error) { next(error); }
});

router.post("/organizations", async (request, response, next) => {
  try {
    const payload = orgCreateSchema.parse(request.body);
    const [exists] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM organizations WHERE slug = ? LIMIT 1`, [payload.slug]
    );
    if (exists.length > 0) { response.status(409).json({ message: "Slug already in use" }); return; }
    const [result] = await getPool().execute(
      `INSERT INTO organizations (slug, name, contact_email, contact_phone, seat_tier_override, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [payload.slug, payload.name, payload.contactEmail ?? null, payload.contactPhone ?? null,
       payload.seatTierOverride ?? null, payload.notes ?? null, payload.status]
    );
    const id = (result as { insertId: number }).insertId;
    await writeAuditLog(response.locals.user.userId, "admin.organization.created", "organization", String(id), payload);
    response.status(201).json({ id, ...payload });
  } catch (error) { next(error); }
});

router.patch("/organizations/:id", async (request, response, next) => {
  try {
    const payload = orgUpdateSchema.parse(request.body);
    const id = Number(request.params.id);
    const sets: string[] = [];
    const vals: Array<string | number | null> = [];
    if (payload.name !== undefined) { sets.push("name = ?"); vals.push(payload.name); }
    if (payload.contactEmail !== undefined) { sets.push("contact_email = ?"); vals.push(payload.contactEmail ?? null); }
    if (payload.contactPhone !== undefined) { sets.push("contact_phone = ?"); vals.push(payload.contactPhone ?? null); }
    if (payload.seatTierOverride !== undefined) { sets.push("seat_tier_override = ?"); vals.push(payload.seatTierOverride ?? null); }
    if (payload.notes !== undefined) { sets.push("notes = ?"); vals.push(payload.notes ?? null); }
    if (payload.status !== undefined) { sets.push("status = ?"); vals.push(payload.status); }
    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }
    vals.push(id);
    const [result] = await getPool().execute(`UPDATE organizations SET ${sets.join(", ")} WHERE id = ?`, vals);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      response.status(404).json({ message: "Organization not found" }); return;
    }
    await writeAuditLog(response.locals.user.userId, "admin.organization.updated", "organization", String(id), payload);
    response.json({ id, ...payload });
  } catch (error) { next(error); }
});

const memberAddSchema = z.object({
  userEmail: z.string().email().optional(),
  userId: z.coerce.number().int().positive().optional(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
}).refine((d) => d.userEmail || d.userId, { message: "userEmail or userId required" });

router.post("/organizations/:id/members", async (request, response, next) => {
  try {
    const payload = memberAddSchema.parse(request.body);
    const orgId = Number(request.params.id);
    const pool = getPool();

    let userId = payload.userId;
    if (!userId && payload.userEmail) {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [payload.userEmail]);
      if (rows.length === 0) { response.status(404).json({ message: "User not found by email" }); return; }
      userId = Number(rows[0].id);
    }
    if (!userId) { response.status(400).json({ message: "User identifier required" }); return; }

    try {
      const [result] = await pool.execute(
        `INSERT INTO organization_members (organization_id, user_id, role, invited_email)
         VALUES (?, ?, ?, ?)`,
        [orgId, userId, payload.role, payload.userEmail ?? null]
      );
      const memberId = (result as { insertId: number }).insertId;
      await writeAuditLog(response.locals.user.userId, "admin.organization.member-added", "organization", String(orgId), { userId, role: payload.role });
      response.status(201).json({ id: memberId, organizationId: orgId, userId, role: payload.role });
    } catch (e) {
      if ((e as { code?: string }).code === "ER_DUP_ENTRY") {
        response.status(409).json({ message: "User already a member of this organization" });
        return;
      }
      throw e;
    }
  } catch (error) { next(error); }
});

router.delete("/organizations/:id/members/:memberId", async (request, response, next) => {
  try {
    const orgId = Number(request.params.id);
    const memberId = Number(request.params.memberId);
    const [result] = await getPool().execute(
      `DELETE FROM organization_members WHERE id = ? AND organization_id = ?`, [memberId, orgId]
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      response.status(404).json({ message: "Member not found" }); return;
    }
    await writeAuditLog(response.locals.user.userId, "admin.organization.member-removed", "organization", String(orgId), { memberId });
    response.json({ success: true });
  } catch (error) { next(error); }
});

/** Public-ish: compute discount for given seats (admin can hit it for quote calc). */
router.get("/organizations/:id/quote", async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const seats = Math.max(1, Number(request.query.seats ?? 1));
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT seat_tier_override AS override FROM organizations WHERE id = ? LIMIT 1`, [id]
    );
    if (rows.length === 0) { response.status(404).json({ message: "Organization not found" }); return; }
    const override = rows[0].override !== null ? Number(rows[0].override) : null;
    const discountPercent = override ?? defaultSeatDiscount(seats);
    response.json({ seats, discountPercent, source: override !== null ? "override" : "default-tier" });
  } catch (error) { next(error); }
});

// ───────────── B2B seat-order: enroll members at the org discount ─────────────

const seatOrderSchema = z.object({
  productSlug: z.string().min(2),
  memberUserIds: z.array(z.coerce.number().int().positive()).min(1).max(500),
  paymentStatus: z.enum(["paid", "pending"]).default("paid"),
});

/**
 * Create a single B2B order covering N seats for the given product.
 * - Computes discount from the org's seat_tier_override OR `defaultSeatDiscount(seats)`.
 * - Inserts ONE order with the discounted total (per-seat-price × seats × (1 - discount/100)).
 * - Records the link in `organization_orders`.
 * - When `paymentStatus = 'paid'`, also creates an active enrollment for each listed member
 *   (skipping any who already have an active enrollment for that product).
 *
 * NOTE: Members must already be added to the organization via POST /organizations/:id/members.
 */
router.post("/organizations/:id/orders", async (request, response, next) => {
  try {
    const orgId = Number(request.params.id);
    const payload = seatOrderSchema.parse(request.body);
    const pool = getPool();

    const [orgRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, seat_tier_override AS override, status FROM organizations WHERE id = ? LIMIT 1`, [orgId]
    );
    if (orgRows.length === 0) { response.status(404).json({ message: "Organization not found" }); return; }
    if (orgRows[0].status !== "active") { response.status(400).json({ message: "Organization is not active" }); return; }

    const [productRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, slug, title, price_usd AS priceUsd, access_days AS accessDays
       FROM products WHERE slug = ? LIMIT 1`, [payload.productSlug]
    );
    if (productRows.length === 0) { response.status(404).json({ message: "Product not found" }); return; }
    const product = productRows[0];

    // Verify all listed members actually belong to this org
    const [memberRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id AS userId FROM organization_members WHERE organization_id = ? AND user_id IN (?)`,
      [orgId, payload.memberUserIds]
    );
    const validMemberIds = (memberRows as Array<{ userId: number }>).map((r) => Number(r.userId));
    if (validMemberIds.length === 0) {
      response.status(400).json({ message: "None of the supplied user IDs are members of this organization" });
      return;
    }

    const seats = validMemberIds.length;
    const override = orgRows[0].override !== null ? Number(orgRows[0].override) : null;
    const discountPercent = override ?? defaultSeatDiscount(seats);
    const grossTotal = Number(product.priceUsd) * seats;
    const discountedTotal = Math.round(grossTotal * (1 - discountPercent / 100) * 100) / 100;

    // The order is recorded under the first member as the "buyer" (org admin/owner ideally).
    // For accurate reporting we pick the org's owner if present, else the first member.
    const [ownerRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id AS userId FROM organization_members
       WHERE organization_id = ? ORDER BY (role = 'owner') DESC, (role = 'admin') DESC, id ASC LIMIT 1`, [orgId]
    );
    const buyerId = ownerRows.length > 0 ? Number(ownerRows[0].userId) : validMemberIds[0];

    const gatewayRef = `b2b-${orgId}-${Date.now().toString(36)}`;
    const [orderResult] = await pool.execute(
      `INSERT INTO orders (user_id, product_id, status, total_amount, gateway_reference)
       VALUES (?, ?, ?, ?, ?)`,
      [buyerId, product.id, payload.paymentStatus, discountedTotal, gatewayRef]
    );
    const orderId = (orderResult as { insertId: number }).insertId;

    await pool.execute(
      `INSERT INTO organization_orders (organization_id, order_id, seat_count, discount_percent)
       VALUES (?, ?, ?, ?)`, [orgId, orderId, seats, discountPercent]
    );

    let enrolledCount = 0;
    let alreadyEnrolledCount = 0;
    if (payload.paymentStatus === "paid") {
      for (const userId of validMemberIds) {
        const [existing] = await pool.query<RowDataPacket[]>(
          `SELECT id FROM enrollments WHERE user_id = ? AND product_id = ? AND status = 'active'
                  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) LIMIT 1`,
          [userId, product.id]
        );
        if (existing.length > 0) { alreadyEnrolledCount += 1; continue; }
        await pool.execute(
          `INSERT INTO enrollments (user_id, product_id, starts_at, expires_at, status)
           VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY), 'active')`,
          [userId, product.id, product.accessDays]
        );
        enrolledCount += 1;
      }
    }

    await writeAuditLog(response.locals.user.userId, "admin.organization.seat-order-created", "organization", String(orgId), {
      orderId, productSlug: payload.productSlug, seats, discountPercent,
      grossTotal, discountedTotal, paymentStatus: payload.paymentStatus,
      enrolledCount, alreadyEnrolledCount,
    });

    response.status(201).json({
      orderId, organizationId: orgId, seats, discountPercent,
      grossTotal, discountedTotal, status: payload.paymentStatus,
      enrolledCount, alreadyEnrolledCount, skippedMemberIds: payload.memberUserIds.filter((id) => !validMemberIds.includes(id)),
    });
  } catch (error) { next(error); }
});

export default router;
