import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { deals, engineers } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 619) % 900_000_000);
const suffix = `deal-record-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const dealIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownDealId = 0;
let otherDealId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "sales_engineer",
      name: "Own-scope deal record test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("deal direct-ID scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for deal record scope integration tests");

    await updateUserPermissions(testUserId, [{
      module: "closing",
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 1,
      dataScope: "own",
    }]);

    const ownEngineer = await db.insert(engineers).values({
      name: `${suffix}-own-engineer`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    const otherEngineer = await db.insert(engineers).values({
      name: `${suffix}-other-engineer`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    ownEngineerId = ownEngineer[0]?.id ?? 0;
    otherEngineerId = otherEngineer[0]?.id ?? 0;
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create deal scope test engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const now = new Date();
    const insertedDeals = await db.insert(deals).values([
      {
        engineerId: ownEngineerId,
        clientName: `${suffix}-own-client`,
        value: "100.00",
        grossValue: "100.00",
        netValue: "100.00",
        stage: "proposal",
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
      },
      {
        engineerId: otherEngineerId,
        clientName: `${suffix}-other-client`,
        value: "900.00",
        grossValue: "900.00",
        netValue: "900.00",
        stage: "proposal",
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
      },
    ]).$returningId();
    ownDealId = insertedDeals[0]?.id ?? 0;
    otherDealId = insertedDeals[1]?.id ?? 0;
    if (!ownDealId || !otherDealId) throw new Error("Could not create deal scope test records");
    dealIds.push(ownDealId, otherDealId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && dealIds.length) await db.delete(deals).where(inArray(deals.id, dealIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("scopes deal list and stats to the authenticated engineer despite a forged engineerId filter", async () => {
    const result = await caller().closing.list({
      limit: 100,
      offset: 0,
      engineerId: otherEngineerId,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).toContain(`${suffix}-own-client`);
    expect(serialized).not.toContain(`${suffix}-other-client`);

    const stats = await caller().closing.stats({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    });
    expect(JSON.stringify(stats)).not.toContain(`${suffix}-other-client`);
  });

  it("denies timeline reads for another engineer's deal by direct ID", async () => {
    await expect(caller().closing.timeline({ dealId: otherDealId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies stage updates for another engineer's deal by direct ID", async () => {
    await expect(caller().closing.updateStage({ id: otherDealId, stage: "negotiation" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies lost-stage updates for another engineer's deal by direct ID", async () => {
    await expect(caller().closing.updateDealStage({ id: otherDealId, stage: "closed_lost", lostReason: "competitor" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks own-scope users from overriding the accounting period through the general stage endpoint", async () => {
    await expect(caller().closing.updateStage({
      id: ownDealId,
      accountingMonth: 1,
      accountingYear: 2026,
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const db = await getDb();
    if (!db) throw new Error("Database is required for deal record scope integration tests");
    const [saved] = await db.select({
      accountingMonth: deals.accountingMonth,
      accountingYear: deals.accountingYear,
    }).from(deals).where(eq(deals.id, ownDealId)).limit(1);
    expect(saved?.accountingMonth).toBeNull();
    expect(saved?.accountingYear).toBeNull();
  });

  it("blocks own-scope sales engineers from changing discount caps and company-wide tier configuration", async () => {
    await expect(caller().closing.setDiscountCap({
      engineerId: ownEngineerId,
      year: 2026,
      month: 10,
      monthlyCap: 1000,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().closing.setEngineerTarget({
      engineerId: ownEngineerId,
      year: 2026,
      month: 10,
      targetAmount: 10000,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().closing.setOperationalTargets({
      engineerId: ownEngineerId,
      year: 2026,
      month: 10,
      targetClosings: 10,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().closing.upsertDiscountTier({
      minSales: 0,
      maxDiscountPct: 5,
      label: `${suffix}-unauthorized-tier`,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().closing.upsertCommissionTier({
      minAchievementPct: 0,
      commissionPct: 5,
      label: `${suffix}-unauthorized-tier`,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the assigned engineer to read and update their own deal", async () => {
    await expect(caller().closing.timeline({ dealId: ownDealId })).resolves.toBeDefined();
    await expect(caller().closing.updateStage({ id: ownDealId, stage: "negotiation" }))
      .resolves.toMatchObject({ success: true });
  });
});
