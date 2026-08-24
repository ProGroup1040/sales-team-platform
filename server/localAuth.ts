import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { engineers } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { ONE_YEAR_MS, LOCAL_AUTH_COOKIE } from "@shared/const";
import { getRequestCookie } from "./_core/httpCookies";

export type LocalSessionPayload = {
  engineerId: number;
  username: string;
  role: string;
  name: string;
  forcePasswordChange?: boolean;
};

function getSecretKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signLocalSession(payload: LocalSessionPayload): Promise<string> {
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({
    engineerId: payload.engineerId,
    username: payload.username,
    role: payload.role,
    name: payload.name,
    forcePasswordChange: payload.forcePasswordChange ? 1 : 0,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecretKey());
}

export async function verifyLocalSession(token: string | undefined | null): Promise<LocalSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const { engineerId } = payload as Record<string, unknown>;
    const parsedEngineerId = Number(engineerId);
    if (!Number.isInteger(parsedEngineerId) || parsedEngineerId <= 0) return null;

    const db = await getDb();
    if (!db) return null;
    const [engineer] = await db.select().from(engineers).where(and(
      eq(engineers.id, parsedEngineerId),
      eq(engineers.status, "active"),
      eq(engineers.isDeleted, 0),
    )).limit(1);
    if (!engineer || !engineer.username) return null;

    return {
      engineerId: engineer.id,
      username: engineer.username,
      role: engineer.role,
      name: engineer.name,
      forcePasswordChange: engineer.forcePasswordChange === 1,
    };
  } catch {
    return null;
  }
}

export async function localLogin(username: string, password: string): Promise<{ token: string; session: LocalSessionPayload } | null> {
  const db = await getDb();
  if (!db) return null;

  const [engineer] = await db
    .select()
    .from(engineers)
    .where(eq(engineers.username, username))
    .limit(1);

  if (!engineer || !engineer.passwordHash || engineer.isDeleted) return null;
  if (engineer.status !== "active") return null;

  const valid = await bcrypt.compare(password, engineer.passwordHash);
  if (!valid) return null;

  const session: LocalSessionPayload = {
    engineerId: engineer.id,
    username: engineer.username!,
    role: engineer.role,
    name: engineer.name,
    forcePasswordChange: !!((engineer as any).forcePasswordChange),
  };
  const token = await signLocalSession(session);
  return { token, session };
}

export async function getLocalSessionFromRequest(req: Request): Promise<LocalSessionPayload | null> {
  return verifyLocalSession(getRequestCookie(req, LOCAL_AUTH_COOKIE));
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function createEngineerAccount(data: {
  name: string;
  username: string;
  password: string;
  role: "admin" | "engineer" | "admin_sales";
  email?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const passwordHash = await hashPassword(data.password);

  // Check if username exists
  const [existing] = await db
    .select({ id: engineers.id })
    .from(engineers)
    .where(eq(engineers.username, data.username))
    .limit(1);

  if (existing) {
    // Update password if engineer already exists with this username
    await db.update(engineers).set({ passwordHash }).where(eq(engineers.username, data.username));
    return;
  }

  await db.insert(engineers).values({
    name: data.name,
    username: data.username,
    passwordHash,
    role: data.role,
    email: data.email || null,
    status: "active",
    isDeleted: 0,
  });
}
