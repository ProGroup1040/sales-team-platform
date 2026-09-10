import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function callerFor(role: string) {
  const ctx = {
    user: null,
    actor: { id: 31, source: "local", role, name: "Test Actor", engineerId: 31 },
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
