import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { sectionPermissions } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const roles = ["admin", "manager", "sales_engineer", "section_test_unknown"];
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
    await db.delete(sectionPermissions).where(inArray(sectionPermissions.role, roles));
    await db.insert(sectionPermissions).values([
      { role: "admin", module: "closing", section: "summary", visibility: "all", canEdit: 1 },
      { role: "manager", module: "closing", section: "summary", visibility: "all", canEdit: 1 },
      { role: "sales_engineer", module: "closing", section: "summary", visibility: "self", canEdit: 0 },
      { role: "section_test_unknown", module: "closing", section: "summary", visibility: "hidden", canEdit: 0 },
    ]);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db) await db.delete(sectionPermissions).where(inArray(sectionPermissions.role, roles));
  });

  it.each([
    ["admin", "all", true],
    ["manager", "all", true],
    ["sales_engineer", "self", false],
    ["section_test_unknown", "hidden", false],
  ])("returns only the %s actor's section map", async (role, visibility, canEdit) => {
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
