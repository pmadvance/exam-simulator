import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { getPool } from "../../db.js";
import { writeAuditLog, toMySQLDatetime } from "../../helpers.js";

const router = Router();

// ───────────── Helpers ─────────────

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function ensureReferralCodeForUser(userId: number): Promise<string> {
  const pool = getPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT code FROM referral_codes WHERE user_id = ? LIMIT 1`, [userId]
  );
  if (existing.length > 0) return String(existing[0].code);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      await pool.execute(
        `INSERT INTO referral_codes (user_id, code) VALUES (?, ?)`, [userId, code]
      );
      return code;
    } catch {
      // duplicate code, retry
    }
  }
  throw new Error("Could not generate unique referral code");
}

// ───────────── Admin: List referrals ─────────────

router.get("/referrals", async (_request, response, next) => {
  try {
    const pool = getPool();
    const [codeRows] = await pool.query<RowDataPacket[]>(
      `SELECT rc.id, rc.code, rc.total_redemptions AS totalRedemptions,
              rc.total_reward_myr AS totalRewardMyr, rc.created_at AS createdAt,
              u.id AS userId, u.email AS userEmail, u.full_name AS userFullName
       FROM referral_codes rc
       INNER JOIN users u ON u.id = rc.user_id
       ORDER BY rc.total_redemptions DESC, rc.id DESC LIMIT 100`
    );

    const [redRows] = await pool.query<RowDataPacket[]>(
      `SELECT rr.id, rr.status, rr.created_at AS createdAt, rr.rewarded_at AS rewardedAt,
              rr.order_id AS orderId,
              referrer.email AS referrerEmail, referee.email AS refereeEmail
       FROM referral_redemptions rr
       INNER JOIN users referrer ON referrer.id = rr.referrer_user_id
       INNER JOIN users referee ON referee.id = rr.referee_user_id
       ORDER BY rr.id DESC LIMIT 200`
    );

    const summary = {
      totalCodes: codeRows.length,
      totalRedemptions: codeRows.reduce((s, r) => s + Number(r.totalRedemptions ?? 0), 0),
      totalRewardMyr: Number(
        codeRows.reduce((s, r) => s + Number(r.totalRewardMyr ?? 0), 0).toFixed(2)
      ),
      pending: redRows.filter((r) => r.status === "pending").length,
    };

    response.json({ summary, codes: codeRows, redemptions: redRows });
  } catch (error) { next(error); }
});

// ───────────── Admin: Manually mark a referral as rewarded ─────────────

router.patch("/referrals/redemptions/:id/reward", async (request, response, next) => {
  try {
    const { rewardMyr } = z.object({ rewardMyr: z.coerce.number().min(0).default(0) }).parse(request.body);
    const id = Number(request.params.id);
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, referrer_user_id AS referrerUserId, referral_code_id AS referralCodeId, status
       FROM referral_redemptions WHERE id = ? LIMIT 1`, [id]
    );
    if (rows.length === 0) {
      response.status(404).json({ message: "Redemption not found" }); return;
    }
    if (rows[0].status === "rewarded") {
      response.status(409).json({ message: "Already rewarded" }); return;
    }
    await pool.execute(
      `UPDATE referral_redemptions SET status = 'rewarded', rewarded_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]
    );
    await pool.execute(
      `UPDATE referral_codes SET total_redemptions = total_redemptions + 1, total_reward_myr = total_reward_myr + ? WHERE id = ?`,
      [rewardMyr, rows[0].referralCodeId]
    );
    await writeAuditLog(response.locals.user.userId, "admin.referral.rewarded", "referral_redemption", String(id), { rewardMyr });
    response.json({ id, status: "rewarded" });
  } catch (error) { next(error); }
});

export default router;
export { ensureReferralCodeForUser };

/**
 * Process referral reward when a user makes their first paid order.
 * Issues a percentage voucher to both referrer and referee.
 * Idempotent: only awards once per referee.
 */
export async function processReferralReward(refereeUserId: number, orderId: number): Promise<void> {
  const pool = getPool();
  const [redemptionRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, referral_code_id AS referralCodeId, referrer_user_id AS referrerUserId, status
     FROM referral_redemptions WHERE referee_user_id = ? LIMIT 1`, [refereeUserId]
  );
  if (redemptionRows.length === 0) return;
  const redemption = redemptionRows[0];
  if (redemption.status === "rewarded") return;

  // Check this is the referee's first paid order
  const [paidCount] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM orders WHERE user_id = ? AND status = 'paid'`, [refereeUserId]
  );
  if (Number(paidCount[0]?.cnt ?? 0) > 1) return; // Not the first paid order

  // Issue 15% off vouchers (90-day expiry) to both parties
  const referrerCode = `REF-R${redemption.referrerUserId}-${Date.now().toString(36).toUpperCase()}`;
  const refereeCode = `REF-E${refereeUserId}-${Date.now().toString(36).toUpperCase()}`;
  const validUntil = toMySQLDatetime(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());

  let referrerVoucherId: number | null = null;
  let refereeVoucherId: number | null = null;
  try {
    const [v1] = await pool.execute(
      `INSERT INTO vouchers (code, type, amount, min_order, usage_limit, per_user_limit, valid_from, valid_until, status)
       VALUES (?, 'percentage', 15, 0, 1, 1, CURRENT_TIMESTAMP, ?, 'active')`,
      [referrerCode, validUntil]
    );
    referrerVoucherId = (v1 as { insertId: number }).insertId;
    const [v2] = await pool.execute(
      `INSERT INTO vouchers (code, type, amount, min_order, usage_limit, per_user_limit, valid_from, valid_until, status)
       VALUES (?, 'percentage', 15, 0, 1, 1, CURRENT_TIMESTAMP, ?, 'active')`,
      [refereeCode, validUntil]
    );
    refereeVoucherId = (v2 as { insertId: number }).insertId;
  } catch {
    // If voucher table missing fields, skip silently
  }

  await pool.execute(
    `UPDATE referral_redemptions
     SET status = 'rewarded', rewarded_at = CURRENT_TIMESTAMP,
         order_id = ?, referrer_voucher_id = ?, referee_voucher_id = ?
     WHERE id = ?`,
    [orderId, referrerVoucherId, refereeVoucherId, redemption.id]
  );
  await pool.execute(
    `UPDATE referral_codes SET total_redemptions = total_redemptions + 1 WHERE id = ?`,
    [redemption.referralCodeId]
  );
}