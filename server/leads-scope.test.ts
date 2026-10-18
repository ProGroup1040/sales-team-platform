import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { getDb, getLeadsList, getLeadsStats } from "./db";
import { engineers, leads } from "../drizzle/schema";

describe("lead ownership filtering", () => {
  const suffix = Date.now().toString();
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

    await db.insert(leads).values({
      name: leadNames[0],
      assignedEngineerId: ownEngineerId,
      status: "converted",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(leads).values({
      name: leadNames[1],
      assignedEngineerId: otherEngineerId,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    const list = await getLeadsList(100, 0, undefined, ownEngineerId);
    expect(list.data.some((lead) => lead.name === leadNames[0])).toBe(true);
    expect(list.data.some((lead) => lead.name === leadNames[1])).toBe(false);
    expect(list.data.every((lead) => lead.assignedEngineerId === ownEngineerId)).toBe(true);

    const stats = await getLeadsStats(now.getFullYear(), now.getMonth() + 1, ownEngineerId);
    expect(stats.total).toBe(1);
    expect(stats.converted).toBe(1);
  }, 15_000);
});
