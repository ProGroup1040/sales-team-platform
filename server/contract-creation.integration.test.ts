import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { autoCreateContractFromDeal, getDb } from "./db";
import { collections, deals } from "../drizzle/schema";

describe("automatic contract creation", () => {
  const tag = `contract-race-${Date.now()}`;
  let dealId = 0;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database required for contract creation integration test");
    const [result] = await db.insert(deals).values({
      engineerId: 0,
      clientName: tag,
      value: "1000.00",
      grossValue: "1000.00",
      netValue: "950.00",
      stage: "closed_won",
    });
    dealId = Number((result as { insertId?: number }).insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (dealId) {
      await db.delete(collections).where(eq(collections.dealId, dealId));
      await db.delete(deals).where(and(eq(deals.id, dealId), eq(deals.clientName, tag)));
    }
  });

  it("creates one contract for concurrent requests and returns the same contract", async () => {
    const results = await Promise.all([
      autoCreateContractFromDeal(dealId),
      autoCreateContractFromDeal(dealId),
    ]);

    const db = await getDb();
    const saved = await db!.select().from(collections).where(eq(collections.dealId, dealId));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ clientName: tag, contractAmount: "950.00", collectedAmount: "0.00" });
    expect(new Set(results.map((result) => result.collectionId)).size).toBe(1);
    expect(results.filter((result) => result.isNew)).toHaveLength(1);
    expect(results.filter((result) => !result.isNew)).toHaveLength(1);
  }, 15_000);

  it("returns the existing contract on retry", async () => {
    const retry = await autoCreateContractFromDeal(dealId);
    expect(retry.isNew).toBe(false);
    const db = await getDb();
    const saved = await db!.select({ id: collections.id }).from(collections).where(eq(collections.dealId, dealId));
    expect(saved).toHaveLength(1);
    expect(retry.collectionId).toBe(saved[0].id);
  }, 15_000);
});
