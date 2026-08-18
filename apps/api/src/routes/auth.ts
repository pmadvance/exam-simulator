import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import { env } from "../config.js";
import { getPool } from "../db.js";
import { signAccessToken, signRefreshToken } from "../lib/auth.js";
import { sendMail, verificationCodeEmail, passwordResetEmail } from "../lib/mail.js";
import { getDatabaseReady, getSessionPolicy, toIsoString, writeAuditLog } from "../helpers.js";
import { registerSchema, loginSchema } from "../schemas.js";
import {
  ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME,
  getAuthUser, requireAuth,
  setSessionCookies, clearSessionCookies, hashToken,
  verifyRefreshToken
} from "../middleware/auth.js";
import { isRateLimited } from "../middleware/rate-limit.js";
import { z } from "zod";

const router = Router();
const PASSWORD_REQUIREMENTS = /^(?=.*[A-Za-z])(?=.*\d).+$/;

// ─── Send email verification code ───
router.post("/send-verification-code", async (request, response, next) => {
  try {
    if (isRateLimited(request.ip ?? "unknown", "auth-verify", 5, 60_000)) {
      response.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable." });
      return;
    }

    // Check if email is already registered
    const [existing] = await getPool().query<RowDataPacket[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (existing.length > 0) {
      response.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    // Invalidate any unexpired codes for this email
    await getPool().execute(
      `UPDATE email_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE email = ? AND consumed_at IS NULL`,
      [email]
    );

    // Generate 6-digit code
    const code = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 minutes

    await getPool().execute(
      `INSERT INTO email_verification_codes (email, code, expires_at) VALUES (?, ?, ?)`,
      [email, code, expiresAt]
    );

    // Send email
    const mail = verificationCodeEmail(code);
    try {
      await sendMail(email, mail.subject, mail.html);
    } catch (mailError) {
      console.error("Failed to send verification email:", mailError);
      // In development, still return success so the flow works
      if (process.env.NODE_ENV === "production") {
        response.status(500).json({ message: "Failed to send verification email. Please try again." });
        return;
      }
    }

    const isProduction = process.env.NODE_ENV === "production";
    response.json(
      isProduction && !env.UAT_TEST_MODE
        ? { message: "Verification code sent to your email." }
        : { message: "Verification code sent to your email.", code: env.UAT_TEST_MODE ? env.UAT_VERIFICATION_CODE : code }
    );
  } catch (error) {
    next(error);
  }
});

router.post("/register", async (request, response, next) => {
  try {
    if (isRateLimited(request.ip ?? "unknown", "auth", 10, 60_000)) {
      response.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }
    const payload = registerSchema.parse(request.body);
    const databaseReady = await getDatabaseReady();

    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    const isUatBypass = env.UAT_TEST_MODE && payload.verificationCode === env.UAT_VERIFICATION_CODE;

    if (!isUatBypass) {
      const [codeRows] = await getPool().query<RowDataPacket[]>(
        `SELECT id, code, expires_at AS expiresAt, consumed_at AS consumedAt
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

      // Mark code as consumed
      await getPool().execute(
        `UPDATE email_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [codeRow.id]
      );
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const [result] = await getPool().execute(
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

    const newUserId = (result as { insertId: number }).insertId;

    // Auto-issue referral code for the new user
    try {
      const { ensureReferralCodeForUser } = await import("./admin/referrals.js");
      await ensureReferralCodeForUser(newUserId);
    } catch {
      // non-fatal
    }

    // Track referral if ?ref cookie or body field present
    const refCode = (request.body?.referralCode || request.cookies?.ref || "").toString().trim().toUpperCase();
    if (refCode) {
      try {
        const [refRows] = await getPool().query<RowDataPacket[]>(
          `SELECT id, user_id AS referrerUserId FROM referral_codes WHERE code = ? LIMIT 1`, [refCode]
        );
        if (refRows.length > 0 && Number(refRows[0].referrerUserId) !== newUserId) {
          await getPool().execute(
            `INSERT IGNORE INTO referral_redemptions (referral_code_id, referrer_user_id, referee_user_id, status)
             VALUES (?, ?, ?, 'pending')`,
            [refRows[0].id, refRows[0].referrerUserId, newUserId]
          );
        }
      } catch {
        // non-fatal
      }
    }

    response.status(201).json({
      id: newUserId,
      email: payload.email,
      fullName: payload.fullName
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    if (isRateLimited(request.ip ?? "unknown", "auth", 10, 60_000)) {
      response.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }
    const payload = loginSchema.parse(request.body);
    const databaseReady = await getDatabaseReady();

    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    const [rows] = await getPool().query(
      `SELECT id, email, full_name AS fullName, password_hash AS passwordHash, role, status
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [payload.email]
    );

    const user = (rows as Array<{
      id: number;
      email: string;
      fullName: string;
      passwordHash: string;
      role: string;
      status: string;
    }>)[0];

    if (!user || user.status !== "active") {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }
    
    const matches = await bcrypt.compare(payload.password, user.passwordHash);
    
    if (!matches) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const policy = await getSessionPolicy(user.id);
    const effectiveMaxSessions = policy.maxSessions ?? (user.role === "student" ? 1 : null);
    const sessionTtlDays = payload.rememberMe
      ? policy.refreshTtlDays ?? env.REFRESH_TOKEN_TTL_DAYS
      : 1;
    const sessionTtlMs = sessionTtlDays * 24 * 60 * 60 * 1000;

    const sessionId = crypto.randomUUID();
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role, sessionId });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role, sessionId }, sessionTtlDays);

    const sessionExpiresAt = new Date(Date.now() + sessionTtlMs);

    if (effectiveMaxSessions) {
      const [activeRows] = await getPool().query<RowDataPacket[]>(
        `SELECT id
         FROM auth_sessions
         WHERE user_id = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
         ORDER BY issued_at ASC`,
        [user.id]
      );

      const overflow = activeRows.length - effectiveMaxSessions + 1;
      if (overflow > 0) {
        const toRevoke = activeRows.slice(0, overflow);
        for (const session of toRevoke) {
          await getPool().execute(
            `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [session.id]
          );
        }
      }
    }
    await getPool().execute(
      `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        user.id,
        hashToken(refreshToken),
        request.header("user-agent")?.slice(0, 255) ?? null,
        request.ip?.slice(0, 64) ?? null,
        sessionExpiresAt
      ]
    );

    setSessionCookies(response, { accessToken, refreshToken }, { refreshMaxAgeMs: sessionTtlMs });
    response.json({
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (request, response, next) => {
  try {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof refreshToken !== "string") {
      response.status(401).json({ message: "Refresh token missing" });
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    let payload: ReturnType<typeof verifyRefreshToken>;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      clearSessionCookies(response);
      response.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const [rows] = await getPool().query(
      `SELECT id, email, full_name AS fullName, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [payload.userId]
    );

    const user = (rows as Array<{ id: number; email: string; fullName: string; role: string; status: string }>)[0];
    if (!user || user.status !== "active") {
      clearSessionCookies(response);
      response.status(401).json({ message: "Session no longer active" });
      return;
    }

    const [sessionRows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, refresh_token_hash AS refreshTokenHash, revoked_at AS revokedAt, expires_at AS expiresAt
       FROM auth_sessions
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [payload.sessionId, payload.userId]
    );
    const session = sessionRows[0];
    if (!session || session.revokedAt || new Date(session.expiresAt as string | Date).getTime() < Date.now()) {
      clearSessionCookies(response);
      response.status(401).json({ message: "Session expired or revoked" });
      return;
    }

    if ((session.refreshTokenHash as string) !== hashToken(refreshToken)) {
      clearSessionCookies(response);
      response.status(401).json({ message: "Refresh token mismatch" });
      return;
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role, sessionId: payload.sessionId });
    const sessionExpiresAt = new Date(session.expiresAt as string | Date);
    const refreshMaxAgeMsForSession = Math.max(0, sessionExpiresAt.getTime() - Date.now());
    const refreshTtlDaysForToken = Math.max(1, Math.ceil(refreshMaxAgeMsForSession / (24 * 60 * 60 * 1000)));
    const nextRefreshToken = signRefreshToken(
      { userId: user.id, role: user.role, sessionId: payload.sessionId },
      refreshTtlDaysForToken
    );
    await getPool().execute(
      `UPDATE auth_sessions
       SET refresh_token_hash = ?
       WHERE id = ?`,
      [hashToken(nextRefreshToken), payload.sessionId]
    );
    setSessionCookies(response, { accessToken, refreshToken: nextRefreshToken }, { refreshMaxAgeMs: refreshMaxAgeMsForSession });

    response.json({
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (request, response, next) => {
  try {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof refreshToken === "string") {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await getPool().execute(
          `UPDATE auth_sessions
           SET revoked_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [payload.sessionId]
        );
      } catch {
        // Ignore invalid tokens and continue with cookie cleanup.
      }
    }

    clearSessionCookies(response);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /signout — browser-navigable logout (no CORS issues with cookie clearing)
router.get("/signout", async (request, response, next) => {
  try {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof refreshToken === "string") {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await getPool().execute(
          `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [payload.sessionId]
        );
      } catch { /* ignore */ }
    }
    clearSessionCookies(response);
    response.redirect(env.APP_URL);
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (request, response, next) => {
  try {
    if (isRateLimited(request.ip ?? "unknown", "auth-forgot", 5, 15 * 60_000)) {
      response.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    const payload = z.object({ email: z.string().email() }).parse(request.body);
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, email, status
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [payload.email]
    );

    const user = rows[0] as { id: number; email: string; status: string } | undefined;
    const genericMessage = "If an account exists for that email, a reset link has been generated.";

    if (!user || user.status !== "active") {
      response.json({ message: genericMessage });
      return;
    }

    await getPool().execute(
      `UPDATE password_reset_tokens
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND consumed_at IS NULL`,
      [user.id]
    );

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);

    await getPool().execute(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;
    await writeAuditLog(user.id, "auth.password_reset.requested", "user", String(user.id), {
      email: user.email,
      expiresAt: expiresAt.toISOString()
    });

    // Send password reset email
    const mail = passwordResetEmail(resetUrl);
    try {
      await sendMail(user.email, mail.subject, mail.html);
    } catch (mailError) {
      console.error("Failed to send password reset email:", mailError);
    }

    const isProduction = process.env.NODE_ENV === "production";
    response.json(
      isProduction
        ? { message: "If an account exists for that email, a password reset link has been sent." }
        : { message: "If an account exists for that email, a password reset link has been sent.", resetToken: rawToken, resetUrl }
    );
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (request, response, next) => {
  try {
    const payload = z.object({ token: z.string().min(20), password: z.string().min(8) }).parse(request.body);
    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.status(503).json({ message: "Database unavailable. Start Docker services first." });
      return;
    }

    const [tokenRows] = await getPool().query<RowDataPacket[]>(
      `SELECT password_reset_tokens.id,
              password_reset_tokens.user_id AS userId,
              password_reset_tokens.expires_at AS expiresAt,
              password_reset_tokens.consumed_at AS consumedAt,
              users.status AS userStatus
       FROM password_reset_tokens
       INNER JOIN users ON users.id = password_reset_tokens.user_id
       WHERE password_reset_tokens.token_hash = ?
       LIMIT 1`,
      [hashToken(payload.token)]
    );

    const tokenRow = tokenRows[0] as {
      id: string;
      userId: number;
      expiresAt: Date | string;
      consumedAt: Date | string | null;
      userStatus: string;
    } | undefined;

    if (!tokenRow || tokenRow.consumedAt || tokenRow.userStatus !== "active") {
      response.status(400).json({ message: "Reset token is invalid or expired" });
      return;
    }

    const tokenExpired = new Date(tokenRow.expiresAt).getTime() < Date.now();
    if (tokenExpired) {
      await getPool().execute(
        `UPDATE password_reset_tokens
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [tokenRow.id]
      );
      response.status(400).json({ message: "Reset token is invalid or expired" });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    await getPool().execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, tokenRow.userId]);
    await getPool().execute(
      `UPDATE password_reset_tokens
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [tokenRow.id]
    );
    await getPool().execute(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND revoked_at IS NULL`,
      [tokenRow.userId]
    );

    await writeAuditLog(tokenRow.userId, "auth.password_reset.completed", "user", String(tokenRow.userId), {});

    clearSessionCookies(response);
    response.json({ message: "Password has been reset successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (request, response, next) => {
  try {
    const user = getAuthUser(request);
    if (!user) {
      response.status(401).json({ message: "Missing or invalid authentication token" });
      return;
    }

    // Fetch full user data from database
    const databaseReady = await getDatabaseReady();
    if (databaseReady) {
      const [rows] = await getPool().query<RowDataPacket[]>(
        `SELECT id, email, full_name AS fullName, age, occupation, gender, role FROM users WHERE id = ? LIMIT 1`,
        [user.userId]
      );
      if (rows.length > 0) {
        response.json({
          id: rows[0].id,
          email: rows[0].email,
          fullName: rows[0].fullName,
          age: rows[0].age,
          occupation: rows[0].occupation,
          gender: rows[0].gender,
          role: rows[0].role
        });
        return;
      }
    }

    // Fallback to JWT payload if database unavailable
    response.json(user);
  } catch (error) {
    next(error);
  }
});

router.get("/sessions", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    const databaseReady = await getDatabaseReady();
    if (!databaseReady) {
      response.json([]);
      return;
    }

    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
    let currentSessionId: string | null = null;
    if (typeof refreshToken === "string") {
      try {
        currentSessionId = verifyRefreshToken(refreshToken).sessionId;
      } catch {
        currentSessionId = null;
      }
    }

    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, user_agent AS userAgent, ip_address AS ipAddress,
              issued_at AS issuedAt, expires_at AS expiresAt, revoked_at AS revokedAt
       FROM auth_sessions
       WHERE user_id = ?
       ORDER BY issued_at DESC
       LIMIT 20`,
      [user.userId]
    );

    response.json(
      rows.map((row) => ({
        id: row.id,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        issuedAt: toIsoString(row.issuedAt as Date | string),
        expiresAt: toIsoString(row.expiresAt as Date | string),
        revokedAt: toIsoString(row.revokedAt as Date | string | null),
        isCurrent: currentSessionId === row.id
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions/:sessionId", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) {
      return;
    }

    const [result] = await getPool().execute(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
      [request.params.sessionId, user.userId]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      response.status(404).json({ message: "Session not found" });
      return;
    }

    await writeAuditLog(user.userId, "auth.session.revoked", "session", request.params.sessionId, {});
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", async (request, response, next) => {
  try {
    const user = requireAuth(request, response);
    if (!user) return;
    const payload = z.object({
      fullName: z.string().min(2).max(255).optional(),
      age: z.coerce.number().int().min(13).max(120).nullable().optional(),
      occupation: z.string().trim().max(120).nullable().optional(),
      gender: z.enum(["female", "male", "non_binary", "prefer_not_to_say", "other"]).nullable().optional(),
      currentPassword: z.string().min(8).optional(),
      newPassword: z.string().min(8).optional()
    }).parse(request.body);
    if (payload.newPassword && !payload.currentPassword) { response.status(400).json({ message: "Current password required to change password" }); return; }
    if (payload.newPassword && !PASSWORD_REQUIREMENTS.test(payload.newPassword)) {
      response.status(400).json({ message: "New password must contain both letters and numbers" });
      return;
    }
    if (payload.currentPassword) {
      const [rows] = await getPool().query<RowDataPacket[]>(`SELECT password_hash AS passwordHash FROM users WHERE id = ? LIMIT 1`, [user.userId]);
      const matches = await bcrypt.compare(payload.currentPassword, rows[0]?.passwordHash as string);
      if (!matches) { response.status(401).json({ message: "Current password is incorrect" }); return; }
    }
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    if (payload.fullName) { sets.push("full_name = ?"); vals.push(payload.fullName); }
    if (payload.age !== undefined) { sets.push("age = ?"); vals.push(payload.age ?? null); }
    if (payload.occupation !== undefined) { sets.push("occupation = ?"); vals.push(payload.occupation || null); }
    if (payload.gender !== undefined) { sets.push("gender = ?"); vals.push(payload.gender ?? null); }
    if (payload.newPassword) { sets.push("password_hash = ?"); vals.push(await bcrypt.hash(payload.newPassword, 10)); }
    if (sets.length === 0) { response.status(400).json({ message: "No fields to update" }); return; }
    vals.push(user.userId);
    await getPool().execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, vals);
    response.json({ message: "Profile updated" });
  } catch (error) { next(error); }
});

export default router;
