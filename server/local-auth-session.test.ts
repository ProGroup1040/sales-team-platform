import { beforeEach, describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { signLocalSession, verifyLocalSession } from "./localAuth";
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
});
