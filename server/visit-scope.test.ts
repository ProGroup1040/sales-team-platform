import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { engineers, visits } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid) % 900_000_000);
const suffix = `visit-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const visitIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownVisitId = 0;
let otherVisitId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "sales_engineer",
      name: "Own-scope visit test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("visit record scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for visit scope integration tests");
    await updateUserPermissions(testUserId, [{
      module: "visits",
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 1,
      dataScope: "own",
    }]);

    const ownEngineer = await db.insert(engineers).values({
      name: `${suffix}-own`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    const otherEngineer = await db.insert(engineers).values({
      name: `${suffix}-other`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    ownEngineerId = ownEngineer[0]?.id ?? 0;
    otherEngineerId = otherEngineer[0]?.id ?? 0;
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create scope test engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const ownVisit = await db.insert(visits).values({
      engineerId: ownEngineerId,
      clientName: `${suffix}-own-client`,
      scheduledAt: new Date(),
      status: "scheduled",
    }).$returningId();
    const otherVisit = await db.insert(visits).values({
      engineerId: otherEngineerId,
      clientName: `${suffix}-other-client`,
      scheduledAt: new Date(),
      status: "scheduled",
    }).$returningId();
    ownVisitId = ownVisit[0]?.id ?? 0;
    otherVisitId = otherVisit[0]?.id ?? 0;
    if (!ownVisitId || !otherVisitId) throw new Error("Could not create scope test visits");
    visitIds.push(ownVisitId, otherVisitId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && visitIds.length) await db.delete(visits).where(inArray(visits.id, visitIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies updating another engineer's visit by direct record ID", async () => {
    await expect(caller().visits.updateStatus({ id: otherVisitId, status: "completed" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies soft-deleting another engineer's visit by direct record ID", async () => {
    await expect(caller().visits.softDelete({ id: otherVisitId, reason: "data_entry_error" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an own-scope actor to update their own visit", async () => {
    await expect(caller().visits.updateStatus({ id: ownVisitId, status: "completed" }))
      .resolves.toMatchObject({ success: true });
  });
});
