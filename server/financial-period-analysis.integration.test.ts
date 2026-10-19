import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { collections, payments } from "../drizzle/schema";
import { getCollectionPeriodAnalysis, getDb } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
const suffix = `period-analysis-${Date.now()}-${process.pid}`;
let collectionId = 0;
const paymentIds: number[] = [];

describe.skipIf(!enabled)("financial.periodAnalysis date boundaries", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for financial period analysis integration tests");
    const [collection] = await db.insert(collections).values({
      clientName: `${suffix}-client`,
      contractAmount: "1000.00",
      collectedAmount: "300.00",
    }).$returningId();
    collectionId = collection.id;
    const inserted = await db.insert(payments).values([
      {
        collectionId,
        clientName: `${suffix}-client`,
        amount: "100.00",
        paymentDate: new Date("2026-10-01T00:00:00.000Z"),
        paymentType: "initial",
        addedBy: "admin",
        receiptNumber: `${suffix}-oct-first`,
      },
      {
        collectionId,
        clientName: `${suffix}-client`,
        amount: "200.00",
        paymentDate: new Date("2026-10-31T00:00:00.000Z"),
        paymentType: "installment",
        addedBy: "admin",
        receiptNumber: `${suffix}-oct-last`,
      },
      {
        collectionId,
        clientName: `${suffix}-client`,
        amount: "999.00",
        paymentDate: new Date("2026-09-30T00:00:00.000Z"),
        paymentType: "final",
        addedBy: "admin",
        receiptNumber: `${suffix}-sep-last`,
      },
      {
        collectionId,
        clientName: `${suffix}-client`,
        amount: "888.00",
        paymentDate: new Date("2026-11-01T00:00:00.000Z"),
        paymentType: "visit_fee",
        addedBy: "admin",
        receiptNumber: `${suffix}-nov-first`,
      },
    ]).$returningId();
    paymentIds.push(...inserted.map((row) => row.id));
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (paymentIds.length) await db.delete(payments).where(inArray(payments.id, paymentIds));
    if (collectionId) await db.delete(collections).where(inArray(collections.id, [collectionId]));
  });

  it("includes October 1 and October 31 while excluding adjacent dates", async () => {
    const result = await getCollectionPeriodAnalysis("2026-10-01", "2026-10-31");
    expect(result).not.toBeNull();
    expect(result?.total).toBe(300);
    expect(result?.count).toBe(2);
    expect(result?.monthlyBreakdown).toEqual([
      expect.objectContaining({ year: 2026, month: 10, total: 300, count: 2 }),
    ]);
    expect(result?.byType).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "initial", total: 100, count: 1 }),
      expect.objectContaining({ type: "installment", total: 200, count: 1 }),
    ]));
  });

  it("returns zero totals and empty breakdowns for an empty period", async () => {
    const result = await getCollectionPeriodAnalysis("2026-12-01", "2026-12-31");
    expect(result).toMatchObject({ total: 0, count: 0, monthlyBreakdown: [], byType: [] });
  });

  it("rejects malformed and reversed date ranges before querying", async () => {
    await expect(getCollectionPeriodAnalysis("2026-10-01T00:00:00Z", "2026-10-31")).rejects.toThrow("YYYY-MM-DD");
    await expect(getCollectionPeriodAnalysis("2026-02-30", "2026-10-31")).rejects.toThrow("YYYY-MM-DD");
    await expect(getCollectionPeriodAnalysis("2026-11-01", "2026-10-31")).rejects.toThrow("Invalid collection period");
  });
});
