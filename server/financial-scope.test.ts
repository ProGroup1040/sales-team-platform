import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { collections, engineers } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 173) % 900_000_000);
const suffix = `financial-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const collectionIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownCollectionId = 0;
let otherCollectionId = 0;

function caller(role: "sales_engineer" | "manager" = "sales_engineer") {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role,
      name: "Own-scope financial test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("financial record scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for financial scope integration tests");
    await updateUserPermissions(testUserId, [{
      module: "collections",
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
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create financial scope engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const ownCollection = await db.insert(collections).values({
      engineerId: ownEngineerId,
      clientName: `${suffix}-own-client`,
      contractAmount: "1000.00",
    }).$returningId();
    const otherCollection = await db.insert(collections).values({
      engineerId: otherEngineerId,
      clientName: `${suffix}-other-client`,
      contractAmount: "2000.00",
    }).$returningId();
    ownCollectionId = ownCollection[0]?.id ?? 0;
    otherCollectionId = otherCollection[0]?.id ?? 0;
    if (!ownCollectionId || !otherCollectionId) throw new Error("Could not create financial scope collections");
    collectionIds.push(ownCollectionId, otherCollectionId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && collectionIds.length) await db.delete(collections).where(inArray(collections.id, collectionIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies a direct-ID financial profile read for another engineer's collection", async () => {
    await expect(caller().financial.clientProfile({ collectionId: otherCollectionId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies adding a payment to another engineer's collection even with a valid collection ID", async () => {
    await expect(caller().financial.addPayment({
      collectionId: otherCollectionId,
      clientName: "forged client name",
      amount: 100,
      paymentDate: "2026-10-18",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies commission lookups that substitute another engineer ID", async () => {
    await expect(caller().financial.collectionCommission({
      engineerId: otherEngineerId,
      month: 10,
      year: 2026,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns only owned contracts for own scope", async () => {
    const result = await caller().financial.allContracts({});
    expect(result.every((contract: { engineerId?: number | null }) => contract.engineerId === ownEngineerId)).toBe(true);
    expect(result.some((contract: { id: number }) => contract.id === otherCollectionId)).toBe(false);
  });

  it("allows an all-scope manager to read both contracts and the period aggregate", async () => {
    await updateUserPermissions(testUserId, [{
      module: "collections",
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 1,
      dataScope: "all",
    }]);
    const result = await caller("manager").financial.allContracts({});
    expect(result.some((contract: { id: number }) => contract.id === ownCollectionId)).toBe(true);
    expect(result.some((contract: { id: number }) => contract.id === otherCollectionId)).toBe(true);
    await expect(caller("manager").financial.periodAnalysis({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    })).resolves.toBeDefined();
  }, 15_000);
});
