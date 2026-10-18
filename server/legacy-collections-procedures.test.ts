import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { updateUserPermissions } from "./db";

const testUserId = 1_000_000_000 + ((Date.now() + process.pid) % 900_000_000);
const testPermissions = [
  "crm", "visits", "closing", "kpi", "planning", "discounts",
  "reports", "tasks", "collections", "users", "pricing_system",
].map((module) => ({
  module,
  canView: 1,
  canAdd: 1,
  canEdit: 1,
  canDelete: 1,
  dataScope: "all" as const,
}));

beforeAll(async () => { await updateUserPermissions(testUserId, testPermissions); });
afterAll(async () => { await updateUserPermissions(testUserId, []); });

function callerFor(role: string) {
  const ctx = {
    user: null,
    actor: { id: testUserId, source: "app_user", role, name: "Test Actor", engineerId: null },
    req: { headers: {} },
    res: {},
  } as unknown as TrpcContext;
  return appRouter.createCaller(ctx);
}

describe("legacy collection procedures", () => {
  it("rejects a direct collected-amount update so the payment ledger remains authoritative", async () => {
    await expect(callerFor("admin").collections.update({
      id: 44,
      collectedAmount: 99_999,
      status: "completed",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not allow non-administrators to create a legacy collection", async () => {
    await expect(callerFor("sales_engineer").collections.create({
      clientName: "عميل اختبار",
      contractAmount: 10_000,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects creating a legacy contract with a pre-filled collected amount", async () => {
    await expect(callerFor("manager").collections.create({
      clientName: "عميل اختبار",
      contractAmount: 10_000,
      collectedAmount: 1,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
