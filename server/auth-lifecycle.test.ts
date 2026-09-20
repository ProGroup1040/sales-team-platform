import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./_core/loginRateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./_core/loginRateLimit")>();
  return {
    ...actual,
    assertLoginAttemptAllowed: vi.fn().mockResolvedValue("test-login-key"),
    clearLoginAttempts: vi.fn().mockResolvedValue(undefined),
    recordFailedLoginAttempt: vi.fn().mockResolvedValue(undefined),
  };
});

import { appRouter } from "./routers";
import {
  createAppUser,
  getAppUserById,
  getUserPermissions,
  loginAppUser,
  updateAppUser,
} from "./db";

function createContext() {
  const setCookies: string[] = [];
  const ctx = {
    user: null,
    actor: null,
    req: { headers: {} },
    res: { append: (_name: string, value: string) => setCookies.push(value) },
  } as unknown as TrpcContext;
  return { ctx, setCookies };
}

describe("user creation to authentication lifecycle", () => {
  const username = `lifecycle_${Date.now()}`;
  const password = "Lifecycle-password-2026";
  let userId: number;

  it("creates one login identity with a bcrypt hash and default permissions", async () => {
    const user = await createAppUser({
      name: "Lifecycle User",
      username,
      password,
      role: "sales_engineer",
      engineerId: 42,
    });
    userId = user.id;

    expect(user.username).toBe(username);
    expect(user.passwordHash).not.toBe(password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user.engineerId).toBe(42);
    expect((await getUserPermissions(user.id)).length).toBeGreaterThan(0);
  });

  it("logs in the account created by User Management through localAuth.login", async () => {
    const { ctx, setCookies } = createContext();
    const result = await appRouter.createCaller(ctx).localAuth.login({ username, password });

    expect(result).toMatchObject({
      ok: true,
      role: "sales_engineer",
      name: "Lifecycle User",
      engineerId: 42,
      forcePasswordChange: false,
    });
    expect(setCookies.some(cookie => cookie.startsWith("app_user_token="))).toBe(true);
  });

  it("loads the same stored identity and token with the direct App User login service", async () => {
    const result = await loginAppUser(username.toUpperCase(), password);
    expect(result?.user.id).toBe(userId);
    expect(result?.user.username).toBe(username);
    expect(result?.token).toBeTruthy();
  });

  it("rejects a wrong password and an unknown username", async () => {
    await expect(loginAppUser(username, "wrong-password")).resolves.toBeNull();
    await expect(loginAppUser("does-not-exist", password)).resolves.toBeNull();
  });

  it("rejects inactive accounts", async () => {
    await updateAppUser(userId, { status: "inactive" });
    await expect(loginAppUser(username, password)).resolves.toBeNull();
    await expect(
      appRouter.createCaller(createContext().ctx).localAuth.login({ username, password }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects duplicate usernames instead of creating another identity", async () => {
    await expect(createAppUser({
      name: "Duplicate User",
      username,
      password,
      role: "sales_engineer",
    })).rejects.toThrow("USERNAME_EXISTS");
  });

  it("preserves the existing account record without storing plaintext credentials", async () => {
    const user = await getAppUserById(userId);
    expect(user?.id).toBe(userId);
    expect(user?.passwordHash).not.toBe(password);
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});
