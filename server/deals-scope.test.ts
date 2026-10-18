import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { getDealsList, getDealsStats, getDb, getDiscountSummary, getEngineerDiscountSummary } from "./db";
import { deals, engineers } from "../drizzle/schema";

describe("getDealsList ownership filtering", () => {
  const suffix = Date.now().toString();
  const engineerNames = [
    `auth-scope-${suffix}-own-engineer`,
    `auth-scope-${suffix}-other-engineer`,
  ];
  const names = [
    `auth-scope-${suffix}-own-open`,
    `auth-scope-${suffix}-other-open`,
    `auth-scope-${suffix}-own-closed`,
    `auth-scope-${suffix}-other-closed`,
  ];

  afterAll(async () => {
    const db = await getDb();
    if (db) {
      await db.delete(deals).where(inArray(deals.clientName, names));
      await db.delete(engineers).where(inArray(engineers.name, engineerNames));
    }
  });

  it("preserves engineer ownership for monthly and stage-specific filters", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for deal ownership integration tests");
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

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

    await db.insert(deals).values({
      engineerId: ownEngineerId,
      clientName: names[0],
      value: "100.00",
      grossValue: "100.00",
      netValue: "100.00",
      stage: "proposal",
      createdAt: now,
      updatedAt: now,
      isDeleted: 0,
    });
    await db.insert(deals).values({
      engineerId: otherEngineerId,
      clientName: names[1],
      value: "200.00",
      grossValue: "200.00",
      netValue: "200.00",
      stage: "proposal",
      createdAt: now,
      updatedAt: now,
      isDeleted: 0,
    });
    await db.insert(deals).values({
      engineerId: ownEngineerId,
      clientName: names[2],
      value: "300.00",
      grossValue: "300.00",
      netValue: "300.00",
      stage: "closed_won",
      accountingMonth: month,
      accountingYear: year,
      closedAt: now,
      createdAt: now,
      updatedAt: now,
      isDeleted: 0,
    });
    await db.insert(deals).values({
      engineerId: otherEngineerId,
      clientName: names[3],
      value: "400.00",
      grossValue: "400.00",
      netValue: "400.00",
      stage: "closed_won",
      accountingMonth: month,
      accountingYear: year,
      closedAt: now,
      createdAt: now,
      updatedAt: now,
      isDeleted: 0,
    });

    const monthly = await getDealsList(100, 0, undefined, year, month, ownEngineerId);
    expect(monthly.data.every((deal) => deal.engineerId === ownEngineerId)).toBe(true);
    expect(monthly.data.some((deal) => deal.clientName === names[0])).toBe(true);
    expect(monthly.data.some((deal) => deal.clientName === names[2])).toBe(true);
    expect(monthly.data.some((deal) => deal.clientName === names[1] || deal.clientName === names[3])).toBe(false);

    const closedWon = await getDealsList(100, 0, "closed_won", year, month, ownEngineerId);
    expect(closedWon.data.every((deal) => deal.engineerId === ownEngineerId)).toBe(true);
    expect(closedWon.data.some((deal) => deal.clientName === names[2])).toBe(true);
    expect(closedWon.data.some((deal) => deal.clientName === names[3])).toBe(false);

    const stats = await getDealsStats(year, month, ownEngineerId);
    expect(stats.open).toBe(1);
    expect(stats.closedWon).toBe(1);
    expect(stats.closedLost).toBe(0);

    const discountSummary = await getDiscountSummary(year, month, undefined, undefined, ownEngineerId);
    expect(discountSummary?.actualSales).toBe(300);
    expect(discountSummary?.pipeline).toBe(100);

    const engineerSummary = await getEngineerDiscountSummary(year, month, undefined, undefined, ownEngineerId);
    expect(engineerSummary).toHaveLength(1);
    expect(engineerSummary[0].engineerId).toBe(ownEngineerId);
  }, 15_000);
});
