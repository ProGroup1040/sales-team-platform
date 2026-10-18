import { afterEach, describe, expect, it, vi } from "vitest";

describe("manual target override persistence", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    vi.resetModules();
  });

  it("fails explicitly when no database connection is available", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { manualOverrideEngineerTarget } = await import("./db");

    await expect(manualOverrideEngineerTarget({
      engineerId: 77,
      year: 2026,
      month: 9,
      targetAmount: 100_000,
    })).rejects.toThrow("Database unavailable");
  });

  it("fails explicitly for payment-promise writes when persistence is unavailable", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { addPaymentPromise, setPaymentPromiseConfirmation, updatePromiseStatus } = await import("./db");

    await expect(addPaymentPromise({
      collectionId: 77,
      engineerId: null,
      clientName: "عميل اختبار",
      promiseAmount: "1000.00",
      promiseDate: new Date("2026-09-01T00:00:00Z"),
      status: "pending",
      isConfirmed: 0,
    })).rejects.toThrow("Database unavailable");
    await expect(updatePromiseStatus(77, "overdue")).rejects.toThrow("Database unavailable");
    await expect(setPaymentPromiseConfirmation(77, true)).rejects.toThrow("Database unavailable");
  });

  it("fails explicitly for every cash, commitment, and collection write when persistence is unavailable", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const {
      addFinancialCommitment,
      addCollection,
      addPayment,
      addPaymentWithFollowUp,
      autoCreateContractFromDeal,
      cancelFinancialCommitment,
      setFinancialCashBalance,
      settleFinancialCommitment,
      updateCollectionStatus,
    } = await import("./db");

    await expect(setFinancialCashBalance({ asOfDate: "2026-09-01", amount: 1_000 })).rejects.toThrow("Database unavailable");
    await expect(addFinancialCommitment({ description: "التزام اختبار", amount: 500, dueDate: "2026-09-02" })).rejects.toThrow("Database unavailable");
    await expect(autoCreateContractFromDeal(77)).rejects.toThrow("Database unavailable");
    await expect(settleFinancialCommitment(77)).rejects.toThrow("Database unavailable");
    await expect(cancelFinancialCommitment(77)).rejects.toThrow("Database unavailable");
    await expect(addCollection({ clientName: "عميل اختبار", contractAmount: 500 })).rejects.toThrow("Database unavailable");
    await expect(updateCollectionStatus(77, "completed")).rejects.toThrow("Database unavailable");
    await expect(addPayment({
      collectionId: 77,
      clientName: "عميل اختبار",
      amount: "500.00",
      paymentDate: new Date("2026-09-01T00:00:00Z"),
      paymentType: "installment",
      addedBy: "test",
    })).rejects.toThrow("Database unavailable");
    await expect(addPaymentWithFollowUp({
      collectionId: 77,
      clientName: "عميل اختبار",
      amount: 500,
      paymentDate: "2026-09-01",
      paymentType: "installment",
      addedBy: "admin",
    })).rejects.toThrow("Database unavailable");
  });

  it("fails explicitly for engineer and daily-task writes when persistence is unavailable", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const {
      createEngineer,
      createEngineerWithRole,
      createTask,
      deleteEngineer,
      rescheduleTask,
      updateEngineerProfile,
    } = await import("./db");

    await expect(createEngineer({ name: "مهندس اختبار" })).rejects.toThrow("Database unavailable");
    await expect(createEngineerWithRole({ name: "مهندس اختبار" })).rejects.toThrow("Database unavailable");
    await expect(updateEngineerProfile(77, { name: "اسم محدث" })).rejects.toThrow("Database unavailable");
    await expect(deleteEngineer(77)).rejects.toThrow("Database unavailable");
    await expect(createTask({ engineerId: 77, taskDate: "2026-10-18", title: "مهمة اختبار" })).rejects.toThrow("Database unavailable");
    await expect(rescheduleTask(77, "2026-10-19")).rejects.toThrow("Database unavailable");
  });
});
