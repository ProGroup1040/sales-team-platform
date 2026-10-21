import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAppUser, getAppUserById, getAppUserJwtSecret, loginAppUser, verifyAppUserToken, getAppUsers, getUserPermissions, updateAppUser, updateUserPermissions, logActivity, getActivityLogs, DEFAULT_ROLE_PERMISSIONS } from "./db";
import { getDb } from "./db";

// ─── Test Suite: Internal App Users System ────────────────────────────────────
describe("Internal App Users System", () => {
  let testUserId: number;
  let linkedEngineerId = 42;
  const testUsername = `test_user_${Date.now()}`;
  const testPassword = "TestPassword-2026";

  afterAll(async () => {
    // Cleanup: remove test user
    if (testUserId) {
      const db = await getDb();
      if (db) {
        const { appUsers, userPermissions, activityLogs, engineers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.delete(activityLogs).where(eq(activityLogs.userId, testUserId));
        await db.delete(userPermissions).where(eq(userPermissions.userId, testUserId));
        await db.delete(appUsers).where(eq(appUsers.id, testUserId));
        if (linkedEngineerId !== 42) await db.delete(engineers).where(eq(engineers.id, linkedEngineerId));
      }
    }
  });

  it("should create a new app user", async () => {
    const user = await createAppUser({
      name: "Test User",
      username: testUsername,
      password: testPassword,
      role: "sales_engineer",
    });
    expect(user).toBeDefined();
    expect(user.username).toBe(testUsername);
    expect(user.role).toBe("sales_engineer");
    testUserId = user.id;
  });

  it("should login with correct credentials", async () => {
    const result = await loginAppUser(testUsername, testPassword);
    expect(result).not.toBeNull();
    expect(result?.user.username).toBe(testUsername);
    expect(result?.token).toBeDefined();
    expect(typeof result?.token).toBe("string");
  });

  it("should fail login with wrong password", async () => {
    const result = await loginAppUser(testUsername, "wrongpassword");
    expect(result).toBeNull();
  });

  it("should fail login with non-existent user", async () => {
    const result = await loginAppUser("nonexistent_user_xyz", "password");
    expect(result).toBeNull();
  });

  it("should verify JWT token", async () => {
    const loginResult = await loginAppUser(testUsername, testPassword);
    expect(loginResult).not.toBeNull();
    const verified = await verifyAppUserToken(loginResult!.token);
    expect(verified).not.toBeNull();
    expect(verified?.username).toBe(testUsername);
    expect(verified?.role).toBe("sales_engineer");
  });

  it("should reject invalid JWT token", async () => {
    const result = await verifyAppUserToken("invalid.token.here");
    expect(result).toBeNull();
  });

  it("invalidates an existing app-user token after a credential or role change", async () => {
    const loginResult = await loginAppUser(testUsername, testPassword);
    expect(loginResult).not.toBeNull();

    await updateAppUser(testUserId, { role: "sales_specialist" });

    await expect(verifyAppUserToken(loginResult!.token)).resolves.toBeNull();
  });

  it("persists an engineer link and invalidates tokens issued before the link", async () => {
    const loginResult = await loginAppUser(testUsername, testPassword);
    expect(loginResult).not.toBeNull();
    const currentUser = await getAppUserById(testUserId);
    if (currentUser?.engineerId) linkedEngineerId = currentUser.engineerId;
    const db = await getDb();
    if (db && !currentUser?.engineerId) {
      const { engineers } = await import("../drizzle/schema");
      const [result] = await db.insert(engineers).values({
        name: `App User Link ${Date.now()}`,
        username: `app-link-${Date.now()}`,
        role: "sales_engineer",
        department: "sales_engineer",
        status: "active",
      });
      linkedEngineerId = Number((result as any).insertId);
    }
    const targetEngineerId = currentUser?.engineerId ?? linkedEngineerId;

    await updateAppUser(testUserId, { engineerId: targetEngineerId });

    await expect(verifyAppUserToken(loginResult!.token)).resolves.toBeNull();
    const refreshed = await loginAppUser(testUsername, testPassword);
    expect(refreshed?.user.engineerId).toBe(targetEngineerId);
  });

  it("should list active app users", async () => {
    const users = await getAppUsers();
    expect(Array.isArray(users)).toBe(true);
    const testUser = users.find(u => u.username === testUsername);
    expect(testUser).toBeDefined();
  });

  it("creates explicit deny-by-default permissions for a new user", async () => {
    const permissions = await getUserPermissions(testUserId);
    expect(Array.isArray(permissions)).toBe(true);
    expect(permissions.length).toBeGreaterThan(0);
    expect(permissions.every(permission =>
      permission.canView === 0 &&
      permission.canAdd === 0 &&
      permission.canEdit === 0 &&
      permission.canDelete === 0 &&
      permission.dataScope === "own"
    )).toBe(true);
  });

  it("should update user permissions", async () => {
    const newPerms = [
      { module: "crm", canView: 1, canAdd: 1, canEdit: 0, canDelete: 0, dataScope: "own" as const },
      { module: "kpi", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" as const },
    ];
    await updateUserPermissions(testUserId, newPerms);
    const updated = await getUserPermissions(testUserId);
    const crmPerm = updated.find(p => p.module === "crm");
    expect(crmPerm?.canView).toBe(1);
    expect(crmPerm?.canAdd).toBe(1);
    expect(crmPerm?.canEdit).toBe(0);
  });

  it("canonicalizes the legacy deals alias before persisting user permissions", async () => {
    await updateUserPermissions(testUserId, [
      { module: "deals", canView: 1, canAdd: 0, canEdit: 1, canDelete: 0, dataScope: "own" as const },
    ]);

    const permissions = await getUserPermissions(testUserId);
    expect(permissions).toEqual(expect.arrayContaining([
      expect.objectContaining({ module: "closing", canView: 1, canEdit: 1 }),
    ]));
    expect(permissions.some((permission) => permission.module === "deals")).toBe(false);
  });

  it("should log activity", async () => {
    await logActivity({ userId: testUserId, action: "login", details: "Test login" });
    const logs = await getActivityLogs({ userId: testUserId, limit: 5 });
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("login");
  });

  it("should have DEFAULT_ROLE_PERMISSIONS defined", () => {
    expect(DEFAULT_ROLE_PERMISSIONS).toBeDefined();
    expect(DEFAULT_ROLE_PERMISSIONS.manager).toBeDefined();
    expect(DEFAULT_ROLE_PERMISSIONS.sales_engineer).toBeDefined();
  });

  it("uses the application session-secret override for app-user token signing", () => {
    const oldApplicationSecret = process.env.APP_JWT_SECRET;
    const oldPlatformSecret = process.env.JWT_SECRET;
    process.env.APP_JWT_SECRET = "a".repeat(48);
    process.env.JWT_SECRET = "platform-secret-that-must-not-win";

    try {
      expect(new TextDecoder().decode(getAppUserJwtSecret())).toBe("a".repeat(48));
    } finally {
      if (oldApplicationSecret === undefined) delete process.env.APP_JWT_SECRET;
      else process.env.APP_JWT_SECRET = oldApplicationSecret;
      if (oldPlatformSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = oldPlatformSecret;
    }
  });
});
