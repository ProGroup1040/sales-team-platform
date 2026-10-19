import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { appUsers, engineers } from "../drizzle/schema";
import { getDb, listEngineersWithAccountStatus } from "./db";

// This integration test inserts real rows and is intentionally limited to CI's
// disposable MySQL service. Never run account-management integration fixtures
// against an arbitrary developer or production database.
const enabled = process.env.CI === "true" && Boolean(process.env.DATABASE_URL);
const suffix = `account-status-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];

describe.skipIf(!enabled)("engineer account status regression", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("CI MySQL is required for engineer account status tests");

    const [linkedEngineer] = await db.insert(engineers).values({
      name: `${suffix} Linked`,
      role: "sales_engineer",
      status: "active",
      username: null,
      isDeleted: 0,
    }).$returningId();
    const [legacyEngineer] = await db.insert(engineers).values({
      name: `${suffix} Legacy`,
      role: "sales_engineer",
      status: "active",
      username: `legacy.${process.pid}`,
      isDeleted: 0,
    }).$returningId();
    engineerIds.push(linkedEngineer.id, legacyEngineer.id);

    await db.insert(appUsers).values({
      name: `${suffix} Linked`,
      username: `linked.${process.pid}`,
      passwordHash: "test-only-not-a-real-password-hash",
      role: "sales_engineer",
      engineerId: linkedEngineer.id,
      status: "active",
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db || engineerIds.length === 0) return;
    await db.delete(appUsers).where(inArray(appUsers.engineerId, engineerIds));
    await db.delete(engineers).where(inArray(engineers.id, engineerIds));
  });

  it("counts a linked app_users identity even when engineers.username is empty", async () => {
    const rows = await listEngineersWithAccountStatus();
    const linked = rows.find((row) => row.id === engineerIds[0]);

    expect(linked).toMatchObject({
      id: engineerIds[0],
      hasAccount: true,
      username: `linked.${process.pid}`,
    });
  });

  it("does not count a legacy engineers.username without a linked app_users identity", async () => {
    const rows = await listEngineersWithAccountStatus();
    const legacy = rows.find((row) => row.id === engineerIds[1]);

    expect(legacy).toMatchObject({
      id: engineerIds[1],
      hasAccount: false,
      username: `legacy.${process.pid}`,
    });
  });
});
