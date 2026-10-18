import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDealWithDiscount, getDb } from "./db";
import { deals } from "../drizzle/schema";

describe("discounted deal creation", () => {
  const tag = `deal-discount-create-${Date.now()}`;
  let validDealId = 0;

  afterAll(async () => {
    const db = await getDb();
    if (db && validDealId) await db.delete(deals).where(and(eq(deals.id, validDealId), eq(deals.clientName, tag)));
  });

  it("rejects a discount that exceeds the deal value before insertion", async () => {
    await expect(createDealWithDiscount({
      engineerId: 0,
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
      engineerId: 0,
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
