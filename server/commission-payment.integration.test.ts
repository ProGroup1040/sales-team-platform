import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb, markCommissionPaid } from "./db";
import { collections, commissionPayments } from "../drizzle/schema";

describe("commission payment settlement", () => {
  const tag = `commission-settlement-${Date.now()}`;
  let collectionId = 0;
  let commissionPaymentId = 0;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database required for commission settlement integration test");
    const [collectionResult] = await db.insert(collections).values({ clientName: tag, contractAmount: "1000.00" });
    collectionId = Number((collectionResult as { insertId?: number }).insertId);
    const [commissionResult] = await db.insert(commissionPayments).values({
      collectionId,
      engineerId: 0,
      stage: "stage1",
      commissionAmount: "50.00",
      status: "pending",
    });
    commissionPaymentId = Number((commissionResult as { insertId?: number }).insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (commissionPaymentId) await db.delete(commissionPayments).where(eq(commissionPayments.id, commissionPaymentId));
    if (collectionId) await db.delete(collections).where(and(eq(collections.id, collectionId), eq(collections.clientName, tag)));
  });

  it("settles a pending commission exactly once", async () => {
    await expect(markCommissionPaid(commissionPaymentId)).resolves.toBeUndefined();
    const db = await getDb();
    const [saved] = await db!.select().from(commissionPayments).where(eq(commissionPayments.id, commissionPaymentId));
    expect(saved).toMatchObject({ status: "paid" });
    expect(saved.paidAt).toBeInstanceOf(Date);

    await expect(markCommissionPaid(commissionPaymentId)).rejects.toThrow("Commission payment is not available for settlement");
  }, 15_000);

  it("rejects a missing commission instead of reporting success", async () => {
    await expect(markCommissionPaid(999_999_999)).rejects.toThrow("Commission payment is not available for settlement");
  }, 15_000);
});
