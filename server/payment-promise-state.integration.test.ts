import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb, setPaymentPromiseConfirmation, updatePromiseStatus } from "./db";
import { collections, paymentPromises } from "../drizzle/schema";

describe("payment promise state changes", () => {
  const tag = `promise-state-${Date.now()}`;
  let collectionId = 0;
  let pendingPromiseId = 0;
  let paidPromiseId = 0;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database required for payment promise state integration test");
    const [collectionResult] = await db.insert(collections).values({ clientName: tag, contractAmount: "1000.00" });
    collectionId = Number((collectionResult as { insertId?: number }).insertId);
    const [pendingResult] = await db.insert(paymentPromises).values({
      collectionId, clientName: tag, promiseAmount: "100.00", promiseDate: new Date("2099-01-01T00:00:00Z"), status: "pending", isConfirmed: 0,
    });
    pendingPromiseId = Number((pendingResult as { insertId?: number }).insertId);
    const [paidResult] = await db.insert(paymentPromises).values({
      collectionId, clientName: tag, promiseAmount: "200.00", promiseDate: new Date("2099-01-02T00:00:00Z"), status: "paid", isConfirmed: 1,
    });
    paidPromiseId = Number((paidResult as { insertId?: number }).insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (collectionId) {
      await db.delete(paymentPromises).where(eq(paymentPromises.collectionId, collectionId));
      await db.delete(collections).where(and(eq(collections.id, collectionId), eq(collections.clientName, tag)));
    }
  });

  it("updates a live promise and confirms it while still pending", async () => {
    await expect(updatePromiseStatus(pendingPromiseId, "overdue")).resolves.toBeUndefined();
    await expect(updatePromiseStatus(pendingPromiseId, "pending")).resolves.toBeUndefined();
    await expect(setPaymentPromiseConfirmation(pendingPromiseId, true)).resolves.toBeUndefined();

    const db = await getDb();
    const [saved] = await db!.select().from(paymentPromises).where(eq(paymentPromises.id, pendingPromiseId));
    expect(saved).toMatchObject({ status: "pending", isConfirmed: 1 });
  }, 15_000);

  it("rejects missing and settled promises instead of silently succeeding", async () => {
    await expect(updatePromiseStatus(999_999_999, "overdue")).rejects.toThrow("Payment promise is not available for update");
    await expect(updatePromiseStatus(paidPromiseId, "overdue")).rejects.toThrow("Payment promise is not available for update");
    await expect(setPaymentPromiseConfirmation(paidPromiseId, false)).rejects.toThrow("Only pending payment promises can be confirmed");
  }, 15_000);
});
