import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAppUser, loginAppUser, verifyAppUserToken, getAppUsers, getUserPermissions, updateUserPermissions, logActivity, getActivityLogs, DEFAULT_ROLE_PERMISSIONS } from "./db";
import { getDb } from "./db";

// ─── Test Suite: Internal App Users System ────────────────────────────────────
describe("Internal App Users System", () => {
  let testUserId: number;
  const testUsername = `test_user_${Date.now()}`;

  afterAll(async () => {
    // Cleanup: remove test user
    if (testUserId) {
      const db = await getDb();
      if (db) {
        const { appUsers, userPermissions, activityLogs } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.delete(activityLogs).where(eq(activityLogs.userId, testUserId));
        await db.delete(userPermissions).where(eq(userPermissions.userId, testUserId));
        await db.delete(appUsers).where(eq(appUsers.id, testUserId));
      }
    }
  });

  it("should create a new app user", async () => {
    const user = await createAppUser({
      name: "Test User",
      username: testUsername,
      password: "test123",
      role: "sales_engineer",
    });
    expect(user).toBeDefined();
    expect(user.username).toBe(testUsername);
    expect(user.role).toBe("sales_engineer");
    testUserId = user.id;
  });

  it("should login with correct credentials", async () => {
    const result = await loginAppUser(testUsername, "test123");
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
    const loginResult = await loginAppUser(testUsername, "test123");
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

  it("should list active app users", async () => {
    const users = await getAppUsers();
    expect(Array.isArray(users)).toBe(true);
    const testUser = users.find(u => u.username === testUsername);
    expect(testUser).toBeDefined();
  });

  it("should create default permissions for new user", async () => {
    const permissions = await getUserPermissions(testUserId);
    expect(Array.isArray(permissions)).toBe(true);
    // sales_engineer should have default permissions
    expect(permissions.length).toBeGreaterThan(0);
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
});
