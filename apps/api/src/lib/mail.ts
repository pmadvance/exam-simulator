import nodemailer from "nodemailer";
import { env } from "../config.js";

const isProduction = process.env.NODE_ENV === "production";
const smtpUser = env.SMTP_USER.trim();
const smtpPass = env.SMTP_PASS.trim();
const hasSmtpCredentials = smtpUser.length > 0 && smtpPass.length > 0;
const isDevMail = !hasSmtpCredentials && !isProduction;

function createTransporter() {
  // In development without SMTP credentials, log emails to console
  if (isDevMail) {
    console.warn("[MAIL] SMTP disabled; using development jsonTransport because SMTP_USER/SMTP_PASS are not set.");
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (!hasSmtpCredentials) {
    console.error("[MAIL] SMTP is not configured. Set both SMTP_USER and SMTP_PASS to enable email delivery.");
    return null;
  }

  // Brevo (or any SMTP relay): smtp-relay.brevo.com:587
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

const transporter = createTransporter();

export async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    throw new Error("SMTP is not configured. Set SMTP_USER and SMTP_PASS before sending email.");
  }

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });

  if (isDevMail) {
    console.log(`[DEV MAIL] to=${to} subject="${subject}"`);
  } else {
    console.log(`[MAIL] to=${to} messageId=${info.messageId}`);
  }
}

export function verificationCodeEmail(code: string) {
  return {
    subject: "Your PMAdvance verification code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a56db;">PMAdvance</h2>
        <p>Your email verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 20px; background: #f0f4ff; border-radius: 8px; margin: 16px 0;">${code}</div>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your PMAdvance password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a56db;">PMAdvance</h2>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #1a56db; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link expires in 30 minutes. If you didn't request this, please ignore this email.</p>
        <p style="color: #999; font-size: 12px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  };
}
