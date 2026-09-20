import { beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { localLogin, signLocalSession, verifyLocalSession } from "./localAuth";
import { ENV } from "./_core/env";

const mockedGetDb = vi.mocked(getDb);

describe("local-session token claims", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes a positive session version in newly issued local-session tokens", async () => {
    const token = await signLocalSession({
      engineerId: 9,
      username: "local.engineer",
      role: "sales_engineer",
      name: "مهندس اختبار",
      sessionVersion: 3,
    });
    const { payload } = await jwtVerify(token, new TextEncoder().encode(ENV.cookieSecret));
    expect(payload.sv).toBe(3);
  });

  it("rejects a local-session token after the engineer session version changes", async () => {
    mockedGetDb.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{
              id: 9,
              username: "local.engineer",
              role: "sales_engineer",
              name: "مهندس اختبار",
              status: "active",
              isDeleted: 0,
              forcePasswordChange: 0,
              sessionVersion: 2,
            }],
          }),
        }),
      }),
    } as never);
    const token = await signLocalSession({
      engineerId: 9,
      username: "local.engineer",
      role: "sales_engineer",
      name: "مهندس اختبار",
      sessionVersion: 1,
    });

    await expect(verifyLocalSession(token)).resolves.toBeNull();
  });

  it("normalizes legacy engineer login identifiers and accepts the stored email", async () => {
    const password = "Legacy-password-2026";
    mockedGetDb.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{
              id: 10,
              username: "legacy.user",
              email: "legacy.user@example.com",
              passwordHash: await bcrypt.hash(password, 4),
              role: "sales_engineer",
              name: "Legacy User",
              status: "active",
              isDeleted: 0,
              forcePasswordChange: 0,
              sessionVersion: 1,
            }],
          }),
        }),
      }),
    } as never);

    const result = await localLogin("  LEGACY.USER@EXAMPLE.COM  ", password);
    expect(result?.session.username).toBe("legacy.user");
  });
});
