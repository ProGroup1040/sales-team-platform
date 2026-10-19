import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDealWithDiscount, getDb } from "./db";
import { deals, engineers } from "../drizzle/schema";

describe("discounted deal creation", () => {
  const tag = `deal-discount-create-${Date.now()}`;
  let engineerId = 0;
  let validDealId = 0;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) return;
    const [engineer] = await db.insert(engineers).values({
      name: tag,
      role: "sales_engineer",
      department: "sales_engineer",
      status: "active",
    }).$returningId();
    engineerId = engineer?.id ?? 0;
    if (!engineerId) throw new Error("Could not create discount test engineer");
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && validDealId) await db.delete(deals).where(and(eq(deals.id, validDealId), eq(deals.clientName, tag)));
    if (db && engineerId) await db.delete(engineers).where(and(eq(engineers.id, engineerId), eq(engineers.name, tag)));
  });

  it("rejects a discount that exceeds the deal value before insertion", async () => {
    await expect(createDealWithDiscount({
      engineerId,
      clientName: `${tag}-invalid`,
      value: 100,
      discountValue: 100.01,
    })).rejects.toThrow("Discount cannot exceed deal value");

    const db = await getDb();
    const created = await db!.select({ id: deals.id }).from(deals).where(eq(deals.clientName, `${tag}-invalid`));
    expect(created).toHaveLength(0);
  }, 15_000);

  it("stores a non-negative net value calculated through the shared money helper", async () => {
    const [result] = await createDealWithDiscount({
      engineerId,
      clientName: tag,
      value: 100.2,
      discountValue: 0.1,
      discountPercent: 0.1,
    });
    validDealId = Number((result as { insertId?: number }).insertId);

    const db = await getDb();
    const [saved] = await db!.select().from(deals).where(eq(deals.id, validDealId));
    expect(saved).toMatchObject({ grossValue: "100.20", discountValue: "0.10", netValue: "100.10" });
  }, 15_000);
});
