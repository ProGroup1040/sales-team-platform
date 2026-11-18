import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getTableName, sql } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { sectionPermissions } from "../drizzle/schema";

const fixture = vi.hoisted(() => ({ tableName: `test_section_permissions_${process.pid}_${Date.now()}` }));

// Keep real router/database integration without deleting live role settings.
vi.mock("../drizzle/schema", async (importOriginal) => {
  const original = await importOriginal<typeof import("../drizzle/schema")>();
  const { int, mysqlEnum, mysqlTable, timestamp, varchar } = await import("drizzle-orm/mysql-core");
  return {
    ...original,
    sectionPermissions: mysqlTable(fixture.tableName, {
      id: int("id").autoincrement().primaryKey(),
      role: varchar("role", { length: 64 }).notNull(),
      module: varchar("module", { length: 64 }).notNull(),
      section: varchar("section", { length: 128 }).notNull(),
      visibility: mysqlEnum("visibility", ["all", "self", "hidden"]).notNull().default("all"),
      canEdit: int("canEdit").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    }),
  };
});

const enabled = Boolean(process.env.DATABASE_URL);
const suffix = `section-permission-${Date.now()}-${process.pid}`;

function caller(role: string | null) {
  const ctx: TrpcContext = {
    user: null,
    actor: role ? {
      id: 1_500_000_000 + process.pid,
      source: "app_user",
      role,
      name: `${suffix}-${role}`,
      engineerId: null,
    } : null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("section permission self-read authorization", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for section permission integration tests");
    expect(getTableName(sectionPermissions)).toBe(fixture.tableName);
    await db.execute(sql.raw(`CREATE TABLE \`${fixture.tableName}\` LIKE section_permissions`));
    await db.insert(sectionPermissions).values([
      { role: "admin", module: "closing", section: "summary", visibility: "all", canEdit: 1 },
      { role: "manager", module: "closing", section: "summary", visibility: "all", canEdit: 1 },
      { role: "sales_engineer", module: "closing", section: "summary", visibility: "self", canEdit: 0 },
      { role: "section_test_unknown", module: "closing", section: "summary", visibility: "hidden", canEdit: 0 },
    ]);
  }, 30_000);

  afterAll(async () => {
    const db = await getDb();
    if (db) await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${fixture.tableName}\``));
  }, 30_000);

  it("uses an isolated table instead of live section-permission settings", () => {
    expect(getTableName(sectionPermissions)).toBe(fixture.tableName);
    expect(getTableName(sectionPermissions)).not.toBe("section_permissions");
  });

  it.each(["admin", "manager"])("%s receives every configured section", async (role) => {
    const result = await caller(role).sectionPermissions.myPermissions();
    expect(Object.keys(result).length).toBeGreaterThan(1);
    expect(Object.values(result).every((permission) =>
      permission.visibility === "all" && permission.canEdit === true
    )).toBe(true);
    expect(Object.keys(result).some((key) => key.startsWith("closing."))).toBe(true);
  });

  it.each([
    ["sales_engineer", "self", false],
    ["section_test_unknown", "hidden", false],
  ])("returns only the %s actor's configured section map", async (role, visibility, canEdit) => {
    const result = await caller(role).sectionPermissions.myPermissions();
    expect(result).toEqual({ "closing.summary": { visibility, canEdit } });
  });

  it("does not expose any role's permissions to a missing-session caller", async () => {
    await expect(caller(null).sectionPermissions.myPermissions())
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps section administration restricted to manager/admin", async () => {
    await expect(caller("sales_engineer").sectionPermissions.getAll())
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("manager").sectionPermissions.getAll()).resolves.toMatchObject({
      roles: expect.any(Array),
      modules: expect.any(Array),
      permissions: expect.any(Array),
    });
  });
});
