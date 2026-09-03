import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  addFinancialCommitment,
  addPayment,
  getDb,
  getFinancialLiquidityDashboard,
  settleFinancialCommitment,
  setFinancialCashBalance,
} from "./db";
import {
  collections,
  financialCashBalances,
  financialCashMovements,
  financialCommitments,
  paymentPromises,
  payments,
} from "../drizzle/schema";

describe("Financial liquidity database workflow", () => {
  const tag = `liquidity-integration-${Date.now()}`;
  const periodStart = "2099-06-01";
  const periodEnd = "2099-06-30";
  let collectionId = 0;
  let promiseId = 0;
  let paymentId = 0;
  let commitmentId = 0;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database required for financial workflow integration test");
    const [collectionResult] = await db.insert(collections).values({ clientName: tag, contractAmount: "1000.00" });
    collectionId = Number((collectionResult as { insertId?: number }).insertId);
    const [promiseResult] = await db.insert(paymentPromises).values({
      collectionId, clientName: tag, promiseAmount: "200.00", promiseDate: new Date(`${periodEnd}T00:00:00`), isConfirmed: 1,
    });
    promiseId = Number((promiseResult as { insertId?: number }).insertId);
    await setFinancialCashBalance({ asOfDate: periodStart, amount: 1000, notes: tag });
    commitmentId = await addFinancialCommitment({ description: tag, amount: 300, dueDate: periodEnd, notes: tag });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (paymentId) await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, paymentId)));
    if (commitmentId) await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "commitment"), eq(financialCashMovements.sourceId, commitmentId)));
    if (paymentId) await db.delete(payments).where(eq(payments.id, paymentId));
    if (promiseId) await db.delete(paymentPromises).where(eq(paymentPromises.id, promiseId));
    if (commitmentId) await db.delete(financialCommitments).where(eq(financialCommitments.id, commitmentId));
    await db.delete(financialCashBalances).where(eq(financialCashBalances.asOfDate, new Date(`${periodStart}T00:00:00`)));
    if (collectionId) await db.delete(collections).where(eq(collections.id, collectionId));
  });

  it("يفصل التدفق المؤكد عن Forecast ويحسب السيولة من المصادر المعتمدة فقط", async () => {
    const dashboard = await getFinancialLiquidityDashboard(periodStart, periodEnd);
    expect(dashboard?.currentCash).toBe(1000);
    expect(dashboard?.confirmedIncoming).toBe(200);
    expect(dashboard?.dueCommitments).toBe(300);
    expect(dashboard?.availableCash).toBe(900);
    expect(dashboard?.forecast.includedInAvailableCash).toBe(false);
  }, 15_000);

  it("يسوي وعد الدفع تلقائياً عند التحصيل المطابق ويمنع تسويته مرتين", async () => {
    const result = await addPayment({
      collectionId, clientName: tag, amount: "200.00", paymentDate: new Date(`${periodStart}T00:00:00`),
      paymentType: "installment", addedBy: "admin",
    });
    paymentId = Number((result as { insertId?: number }).insertId);
    const db = await getDb();
    const [promise] = await db!.select().from(paymentPromises).where(eq(paymentPromises.id, promiseId));
    const [payment] = await db!.select().from(payments).where(eq(payments.id, paymentId));
    expect(promise.status).toBe("paid");
    expect(payment.paymentPromiseId).toBe(promiseId);
    await expect(addPayment({
      collectionId, clientName: tag, amount: "200.00", paymentDate: new Date(`${periodStart}T00:00:00`),
      paymentType: "installment", addedBy: "admin", promiseId,
    })).rejects.toThrow("Payment promise is not available for settlement");
    const dashboard = await getFinancialLiquidityDashboard(periodStart, periodEnd);
    expect(dashboard?.confirmedIncoming).toBe(0);
    expect(dashboard?.currentCash).toBe(1200);
    expect(dashboard?.availableCash).toBe(900);
  }, 15_000);

  it("ينشئ سداد الالتزام حركة نقدية خارجة واحدة فقط", async () => {
    await settleFinancialCommitment(commitmentId, "integration-test");
    const db = await getDb();
    const movements = await db!.select().from(financialCashMovements)
      .where(and(eq(financialCashMovements.sourceType, "commitment"), eq(financialCashMovements.sourceId, commitmentId)));
    expect(movements).toHaveLength(1);
    expect(movements[0].direction).toBe("outflow");
    await expect(settleFinancialCommitment(commitmentId, "integration-test")).rejects.toThrow("Commitment is not available for settlement");
  }, 15_000);
});
