import jwt from "jsonwebtoken";

import { env } from "../config.js";

export type AuthTokenPayload = {
  userId: number;
  email: string;
  role: string;
  sessionId?: string;
};

export type RefreshTokenPayload = {
  userId: number;
  role: string;
  sessionId: string;
};

export function signAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m` });
}

export function signRefreshToken(payload: RefreshTokenPayload, ttlDays = env.REFRESH_TOKEN_TTL_DAYS) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${ttlDays}d` });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
}
