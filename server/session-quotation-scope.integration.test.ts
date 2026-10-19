import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { engineers, meetingSessions, playbookQuotations } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 1289) % 900_000_000);
const suffix = `session-quotation-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const quotationIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownQuotationId = 0;
let otherQuotationId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "sales_engineer",
      name: "Own-scope session quotation test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("meeting session quotation link scope", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for session quotation scope tests");

    await updateUserPermissions(testUserId, [
      { module: "tasks", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own" },
      { module: "pricing_system", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
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
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create session quotation test engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const rows = await db.insert(playbookQuotations).values([
      {
        engineerId: ownEngineerId,
        clientName: `${suffix}-own-client`,
        itemsJson: "[]",
        totalValue: "100.00",
        status: "draft",
      },
      {
        engineerId: otherEngineerId,
        clientName: `${suffix}-other-client`,
        itemsJson: "[]",
        totalValue: "900.00",
        status: "draft",
      },
    ]).$returningId();
    ownQuotationId = rows[0]?.id ?? 0;
    otherQuotationId = rows[1]?.id ?? 0;
    if (!ownQuotationId || !otherQuotationId) throw new Error("Could not create session quotation fixtures");
    quotationIds.push(ownQuotationId, otherQuotationId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && quotationIds.length) {
      await db.delete(meetingSessions).where(inArray(meetingSessions.quotationId, quotationIds));
      await db.delete(playbookQuotations).where(inArray(playbookQuotations.id, quotationIds));
    }
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies creating a session linked to another engineer's quotation by direct ID", async () => {
    await expect(caller().session.create({
      engineerId: otherEngineerId,
      quotationId: otherQuotationId,
      clientName: `${suffix}-forged-client`,
      sessionType: "presentation",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows creating a session linked to the caller's own quotation", async () => {
    await expect(caller().session.create({
      engineerId: otherEngineerId,
      quotationId: ownQuotationId,
      clientName: `${suffix}-own-client`,
      sessionType: "presentation",
    })).resolves.toMatchObject({ success: true, sessionId: expect.any(Number) });
  });
});
