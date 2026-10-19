import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { updateUserPermissions } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 887) % 900_000_000);

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "sales_engineer",
      name: "Own-scope aggregate test",
      engineerId: 1,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("team aggregate scope enforcement", () => {
  beforeAll(async () => {
    await updateUserPermissions(testUserId, [
      { module: "kpi", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
      { module: "reports", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
      { module: "closing", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    ]);
  });

  afterAll(async () => {
    await updateUserPermissions(testUserId, []);
  });

  it("denies team-wide KPI aggregates to own-scope users", async () => {
    await expect(caller().kpi.engineers({ year: 2026, month: 10 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().kpi.weeklyReport())
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().kpi.companyClosingKPI({ year: 2026, month: 10 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies team-wide reports to own-scope users", async () => {
    await expect(caller().reports.weeklyFull())
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().reports.monthlyKPI({ year: 2026, month: 10 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().reports.quarterly({ year: 2026, quarter: 4 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
