import type { Request, CookieOptions } from "express";

const AUTH_COOKIE_NAME = "byu-connect-session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    maxAge: SESSION_DURATION_MS,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
    signed: true,
  };
}

export function getCookieSecret(): string {
  return process.env.SESSION_SECRET ?? "byu-connect-secret-dev-only";
}

export function getAuthUserId(req: Request): number | null {
  const rawUserId = req.signedCookies?.[AUTH_COOKIE_NAME];
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

export function setAuthSession(res: any, userId: number): void {
  res.cookie(AUTH_COOKIE_NAME, String(userId), getCookieOptions());
}

export function clearAuthSession(res: any): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    signed: true,
  });
}
