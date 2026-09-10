import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  addFinancialCommitment,
  addPayment,
  addPaymentWithFollowUp,
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
  let rollbackPaymentId = 0;
  let concurrentPromiseId = 0;
  const concurrentPaymentIds: number[] = [];
  let concurrentFollowUpPromiseId = 0;
  const concurrentFollowUpPaymentIds: number[] = [];
  let retryPromiseId = 0;
  let retryPaymentId = 0;
  let commitmentId = 0;
  let concurrentCommitmentId = 0;

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
    if (rollbackPaymentId) await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, rollbackPaymentId)));
    if (retryPaymentId) await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, retryPaymentId)));
    for (const concurrentPaymentId of concurrentPaymentIds) {
      await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, concurrentPaymentId)));
    }
    for (const concurrentPaymentId of concurrentFollowUpPaymentIds) {
      await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, concurrentPaymentId)));
    }
    if (commitmentId) await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "commitment"), eq(financialCashMovements.sourceId, commitmentId)));
    if (concurrentCommitmentId) await db.delete(financialCashMovements).where(and(eq(financialCashMovements.sourceType, "commitment"), eq(financialCashMovements.sourceId, concurrentCommitmentId)));
    if (paymentId) await db.delete(payments).where(eq(payments.id, paymentId));
    if (rollbackPaymentId) await db.delete(payments).where(eq(payments.id, rollbackPaymentId));
    if (retryPaymentId) await db.delete(payments).where(eq(payments.id, retryPaymentId));
    for (const concurrentPaymentId of concurrentPaymentIds) {
      await db.delete(payments).where(eq(payments.id, concurrentPaymentId));
    }
    for (const concurrentPaymentId of concurrentFollowUpPaymentIds) {
      await db.delete(payments).where(eq(payments.id, concurrentPaymentId));
    }
    if (promiseId) await db.delete(paymentPromises).where(eq(paymentPromises.id, promiseId));
    if (concurrentPromiseId) await db.delete(paymentPromises).where(eq(paymentPromises.id, concurrentPromiseId));
    if (concurrentFollowUpPromiseId) await db.delete(paymentPromises).where(eq(paymentPromises.id, concurrentFollowUpPromiseId));
    if (retryPromiseId) await db.delete(paymentPromises).where(eq(paymentPromises.id, retryPromiseId));
    if (commitmentId) await db.delete(financialCommitments).where(eq(financialCommitments.id, commitmentId));
    if (concurrentCommitmentId) await db.delete(financialCommitments).where(eq(financialCommitments.id, concurrentCommitmentId));
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

  it("يمنع طلبا سداد متزامنين من إنشاء حركتين خارجتين لنفس الالتزام", async () => {
    concurrentCommitmentId = await addFinancialCommitment({
      description: `${tag}-concurrent`, amount: 125, dueDate: periodEnd, notes: tag,
    });

    const results = await Promise.allSettled([
      settleFinancialCommitment(concurrentCommitmentId, "concurrency-test-a"),
      settleFinancialCommitment(concurrentCommitmentId, "concurrency-test-b"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const db = await getDb();
    const movements = await db!.select().from(financialCashMovements)
      .where(and(eq(financialCashMovements.sourceType, "commitment"), eq(financialCashMovements.sourceId, concurrentCommitmentId)));
    expect(movements).toHaveLength(1);
  }, 15_000);

  it("يمنع طلبا تحصيل متزامنين من تسوية الوعد نفسه مرتين", async () => {
    const db = await getDb();
    const [promiseResult] = await db!.insert(paymentPromises).values({
      collectionId, clientName: `${tag}-payment-race`, promiseAmount: "100.00",
      promiseDate: new Date(`${periodEnd}T00:00:00`), isConfirmed: 1,
    });
    concurrentPromiseId = Number((promiseResult as { insertId?: number }).insertId);

    const results = await Promise.allSettled([
      addPayment({ collectionId, clientName: tag, amount: "100.00", paymentDate: new Date(`${periodStart}T00:00:00`), paymentType: "installment", addedBy: "admin", promiseId: concurrentPromiseId }),
      addPayment({ collectionId, clientName: tag, amount: "100.00", paymentDate: new Date(`${periodStart}T00:00:00`), paymentType: "installment", addedBy: "engineer", promiseId: concurrentPromiseId }),
    ]);
    const successful = results.filter((result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled");
    const rejectionReasons = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => {
        if (!(result.reason instanceof Error)) return String(result.reason);
        const cause = result.reason.cause;
        return `${result.reason.message} :: ${cause instanceof Error ? cause.message : String(cause ?? "")}`;
      });
    expect(successful, `Payment race rejection reasons: ${rejectionReasons.join(" | ")}`).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    concurrentPaymentIds.push(Number((successful[0].value as { insertId?: number }).insertId));

    const paymentsForPromise = await db!.select().from(payments).where(eq(payments.paymentPromiseId, concurrentPromiseId));
    const movements = await db!.select().from(financialCashMovements)
      .where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, concurrentPaymentIds[0])));
    const [promise] = await db!.select().from(paymentPromises).where(eq(paymentPromises.id, concurrentPromiseId));
    expect(paymentsForPromise).toHaveLength(1);
    expect(movements).toHaveLength(1);
    expect(promise.status).toBe("paid");
  }, 15_000);

  it("لا يترك دفعة أو حركة نقدية إضافية عندما يفشل التحصيل المكرر", async () => {
    const receiptNumber = `rollback-${tag}`;
    const initial = await addPayment({
      collectionId, clientName: tag, amount: "50.00", paymentDate: new Date(`${periodStart}T00:00:00`),
      paymentType: "installment", addedBy: "admin", receiptNumber,
    });
    rollbackPaymentId = Number((initial as { insertId?: number }).insertId);

    await expect(addPayment({
      collectionId, clientName: tag, amount: "50.00", paymentDate: new Date(`${periodStart}T00:00:00`),
      paymentType: "installment", addedBy: "admin", receiptNumber,
    })).rejects.toThrow();

    const db = await getDb();
    const paymentsWithReceipt = await db!.select().from(payments).where(eq(payments.receiptNumber, receiptNumber));
    const cashMovements = await db!.select().from(financialCashMovements)
      .where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, rollbackPaymentId)));
    expect(paymentsWithReceipt).toHaveLength(1);
    expect(cashMovements).toHaveLength(1);
  }, 15_000);

  it("يمنع مسار التحصيل المتقدم المتزامن من تسوية الوعد نفسه مرتين", async () => {
    const db = await getDb();
    const [promiseResult] = await db!.insert(paymentPromises).values({
      collectionId, clientName: `${tag}-follow-up-race`, promiseAmount: "75.00",
      promiseDate: new Date(`${periodEnd}T00:00:00`), isConfirmed: 1,
    });
    concurrentFollowUpPromiseId = Number((promiseResult as { insertId?: number }).insertId);

    const results = await Promise.allSettled([
      addPaymentWithFollowUp({ collectionId, clientName: tag, amount: 75, paymentDate: periodStart, paymentType: "installment", addedBy: "admin", promiseId: concurrentFollowUpPromiseId }),
      addPaymentWithFollowUp({ collectionId, clientName: tag, amount: 75, paymentDate: periodStart, paymentType: "installment", addedBy: "engineer", promiseId: concurrentFollowUpPromiseId }),
    ]);
    const successful = results.filter((result): result is PromiseFulfilledResult<{ paymentId: number }> => result.status === "fulfilled");
    expect(successful).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    concurrentFollowUpPaymentIds.push(successful[0].value.paymentId);

    const paymentsForPromise = await db!.select().from(payments).where(eq(payments.paymentPromiseId, concurrentFollowUpPromiseId));
    const movements = await db!.select().from(financialCashMovements)
      .where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, concurrentFollowUpPaymentIds[0])));
    const [promise] = await db!.select().from(paymentPromises).where(eq(paymentPromises.id, concurrentFollowUpPromiseId));
    expect(paymentsForPromise).toHaveLength(1);
    expect(movements).toHaveLength(1);
    expect(promise.status).toBe("paid");
  }, 15_000);

  it("يسمح بإعادة المحاولة الآمنة بعد فشل تسوية وعد قبل أي كتابة", async () => {
    const db = await getDb();
    const [promiseResult] = await db!.insert(paymentPromises).values({
      collectionId, clientName: `${tag}-retry`, promiseAmount: "60.00",
      promiseDate: new Date(`${periodEnd}T00:00:00`), isConfirmed: 1,
    });
    retryPromiseId = Number((promiseResult as { insertId?: number }).insertId);

    await expect(addPayment({
      collectionId, clientName: tag, amount: "50.00", paymentDate: new Date(`${periodStart}T00:00:00`),
      paymentType: "installment", addedBy: "admin", promiseId: retryPromiseId,
    })).rejects.toThrow("A payment promise must be settled for its confirmed amount");

    const retry = await addPayment({
      collectionId, clientName: tag, amount: "60.00", paymentDate: new Date(`${periodStart}T00:00:00`),
      paymentType: "installment", addedBy: "admin", promiseId: retryPromiseId,
    });
    retryPaymentId = Number((retry as { insertId?: number }).insertId);
    const paymentsForPromise = await db!.select().from(payments).where(eq(payments.paymentPromiseId, retryPromiseId));
    const movements = await db!.select().from(financialCashMovements)
      .where(and(eq(financialCashMovements.sourceType, "payment"), eq(financialCashMovements.sourceId, retryPaymentId)));
    expect(paymentsForPromise).toHaveLength(1);
    expect(movements).toHaveLength(1);
  }, 15_000);
});
