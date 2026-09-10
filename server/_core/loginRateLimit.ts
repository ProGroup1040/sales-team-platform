import { createHmac } from "node:crypto";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { loginRateLimits } from "../../drizzle/schema";
import { getDb, requireDb } from "../db";
import { ENV } from "./env";

export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export type LoginRateLimitRecord = {
  attempts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

export class LoginRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("LOGIN_RATE_LIMITED");
  }
}

export function getClientAddress(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function hashLoginAttemptKey(req: Request, username: string): string {
  return createHmac("sha256", ENV.cookieSecret)
    .update(`${getClientAddress(req)}\u0000${username.trim().toLowerCase()}`)
    .digest("hex");
}

export function evaluateLoginRateLimit(
  record: LoginRateLimitRecord | null | undefined,
  now: Date,
): { allowed: boolean; retryAfterSeconds: number } {
  if (!record) return { allowed: true, retryAfterSeconds: 0 };
  if (record.blockedUntil && record.blockedUntil.getTime() > now.getTime()) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000)),
    };
  }
  if (now.getTime() - record.windowStartedAt.getTime() >= LOGIN_RATE_LIMIT_WINDOW_MS) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function assertLoginAttemptAllowed(req: Request, username: string): Promise<string> {
  const keyHash = hashLoginAttemptKey(req, username);
  const db = await requireDb();
  const [record] = await db
    .select({
      attempts: loginRateLimits.attempts,
      windowStartedAt: loginRateLimits.windowStartedAt,
      blockedUntil: loginRateLimits.blockedUntil,
    })
    .from(loginRateLimits)
    .where(eq(loginRateLimits.keyHash, keyHash))
    .limit(1);
  const decision = evaluateLoginRateLimit(record, new Date());
  if (!decision.allowed) throw new LoginRateLimitError(decision.retryAfterSeconds);
  return keyHash;
}

export async function recordFailedLoginAttempt(keyHash: string): Promise<void> {
  const db = await requireDb();
  const now = new Date();
  const windowFloor = new Date(now.getTime() - LOGIN_RATE_LIMIT_WINDOW_MS);
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(loginRateLimits)
      .where(eq(loginRateLimits.keyHash, keyHash))
      .limit(1);
    if (!existing || existing.windowStartedAt.getTime() < windowFloor.getTime()) {
      if (existing) {
        await tx.update(loginRateLimits).set({ attempts: 1, windowStartedAt: now, blockedUntil: null }).where(eq(loginRateLimits.id, existing.id));
      } else {
        await tx.insert(loginRateLimits).values({ keyHash, attempts: 1, windowStartedAt: now, blockedUntil: null });
      }
      return;
    }
    const attempts = existing.attempts + 1;
    await tx.update(loginRateLimits).set({
      attempts,
      blockedUntil: attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS ? new Date(now.getTime() + LOGIN_RATE_LIMIT_WINDOW_MS) : null,
    }).where(eq(loginRateLimits.id, existing.id));
  });
}

export async function clearLoginAttempts(keyHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(loginRateLimits).where(eq(loginRateLimits.keyHash, keyHash));
}
