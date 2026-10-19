import { afterAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { inArray } from "drizzle-orm";
import { getDb, getLeadsList, getLeadsStats, updateUserPermissions } from "./db";
import { engineers, leads } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("lead ownership filtering", () => {
  const suffix = Date.now().toString();
  const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 41) % 900_000_000);

  function caller(engineerId: number) {
    const ctx: TrpcContext = {
      user: null,
      actor: { id: testUserId, source: "app_user", role: "sales_engineer", name: "Lead scope integration test", engineerId },
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    return appRouter.createCaller(ctx);
  }
  const engineerNames = [
    `crm-scope-${suffix}-own-engineer`,
    `crm-scope-${suffix}-other-engineer`,
  ];
  const leadNames = [
    `crm-scope-${suffix}-own-lead`,
    `crm-scope-${suffix}-other-lead`,
  ];

  afterAll(async () => {
    const db = await getDb();
    if (db) {
      await db.delete(leads).where(inArray(leads.name, leadNames));
      await db.delete(engineers).where(inArray(engineers.name, engineerNames));
    }
    await updateUserPermissions(testUserId, []);
  });

  it("filters lead lists and aggregate stats to the assigned engineer", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for lead ownership integration tests");
    const now = new Date();
    const ownEngineerResult = await db.insert(engineers).values({
      name: engineerNames[0],
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    const otherEngineerResult = await db.insert(engineers).values({
      name: engineerNames[1],
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    const ownEngineerId = ownEngineerResult[0]?.id;
    const otherEngineerId = otherEngineerResult[0]?.id;
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create test engineers");

    const ownLeadRows = await db.insert(leads).values({
      name: leadNames[0],
      assignedEngineerId: ownEngineerId,
      status: "converted",
      createdAt: now,
      updatedAt: now,
    }).$returningId();
    const otherLeadRows = await db.insert(leads).values({
      name: leadNames[1],
      assignedEngineerId: otherEngineerId,
      status: "new",
      createdAt: now,
      updatedAt: now,
    }).$returningId();
    const ownLeadId = ownLeadRows[0]?.id;
    const otherLeadId = otherLeadRows[0]?.id;
    if (!ownLeadId || !otherLeadId) throw new Error("Could not create test lead IDs");

    const list = await getLeadsList(100, 0, undefined, ownEngineerId);
    expect(list.data.some((lead) => lead.name === leadNames[0])).toBe(true);
    expect(list.data.some((lead) => lead.name === leadNames[1])).toBe(false);
    expect(list.data.every((lead) => lead.assignedEngineerId === ownEngineerId)).toBe(true);

    const stats = await getLeadsStats(now.getFullYear(), now.getMonth() + 1, ownEngineerId);
    expect(stats.total).toBe(1);
    expect(stats.converted).toBe(1);

    await updateUserPermissions(testUserId, [{
      module: "crm", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own",
    }]);
    await expect(caller(ownEngineerId).leads.updateStatus({ id: otherLeadId, status: "contacted" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(ownEngineerId).leads.updateStatus({ id: ownLeadId, status: "contacted" }))
      .resolves.toMatchObject({ success: true });
    const [updatedOwnLead] = await db.select({ status: leads.status }).from(leads).where(inArray(leads.id, [ownLeadId]));
    expect(updatedOwnLead?.status).toBe("contacted");
  }, 15_000);
});
