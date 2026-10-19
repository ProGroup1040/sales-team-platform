import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { engineers, leads, visits } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 1373) % 900_000_000);
const suffix = `visit-lead-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const leadIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownLeadId = 0;
let otherLeadId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "sales_engineer",
      name: "Own-scope visit lead-link test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("visit-to-lead link scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for visit lead-link scope tests");

    await updateUserPermissions(testUserId, [
      { module: "visits", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own" },
      { module: "crm", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    ]);

    const own = await db.insert(engineers).values({
      name: `${suffix}-own-engineer`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    const other = await db.insert(engineers).values({
      name: `${suffix}-other-engineer`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    ownEngineerId = own[0]?.id ?? 0;
    otherEngineerId = other[0]?.id ?? 0;
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create visit lead-link test engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const rows = await db.insert(leads).values([
      {
        name: `${suffix}-own-lead`,
        source: "other",
        assignedEngineerId: ownEngineerId,
        status: "new",
        isDeleted: 0,
      },
      {
        name: `${suffix}-other-lead`,
        source: "other",
        assignedEngineerId: otherEngineerId,
        status: "new",
        isDeleted: 0,
      },
    ]).$returningId();
    ownLeadId = rows[0]?.id ?? 0;
    otherLeadId = rows[1]?.id ?? 0;
    if (!ownLeadId || !otherLeadId) throw new Error("Could not create visit lead-link test leads");
    leadIds.push(ownLeadId, otherLeadId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && leadIds.length) await db.delete(visits).where(inArray(visits.leadId, leadIds));
    if (db && leadIds.length) await db.delete(leads).where(inArray(leads.id, leadIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies creating a visit linked to another engineer's lead by direct ID", async () => {
    await expect(caller().visits.create({
      engineerId: otherEngineerId,
      leadId: otherLeadId,
      clientName: `${suffix}-forged-client`,
      scheduledAt: new Date("2026-10-20T10:00:00.000Z"),
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows creating a visit linked to the caller's own lead", async () => {
    await expect(caller().visits.create({
      engineerId: otherEngineerId,
      leadId: ownLeadId,
      clientName: `${suffix}-own-lead`,
      scheduledAt: new Date("2026-10-20T11:00:00.000Z"),
    })).resolves.toMatchObject({ success: true });
  });
});
