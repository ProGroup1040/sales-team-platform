import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { playbookItems, products } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 887) % 900_000_000);
const suffix = `shared-catalog-scope-${Date.now()}-${process.pid}`;

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

describe.skipIf(!enabled)("team aggregate and shared catalog scope enforcement", () => {
  beforeAll(async () => {
    await updateUserPermissions(testUserId, [
      { module: "kpi", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
      { module: "reports", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
      { module: "closing", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
      { module: "pricing_system", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own" },
    ]);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db) await db.delete(products).where(eq(products.name, `${suffix}-product`));
    if (db) await db.delete(playbookItems).where(inArray(playbookItems.name, [
      `${suffix}-playbook`,
      `${suffix}-imported-playbook`,
    ]));
    await updateUserPermissions(testUserId, []);
  });

  it("denies own-scope sales engineers write access to shared product and playbook catalogs", async () => {
    await expect(caller().products.create({
      name: `${suffix}-product`,
      price: "100.00",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().products.update({ id: 999_999_991, name: "forged product update" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().products.delete({ id: 999_999_991 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().playbook.create({ name: `${suffix}-playbook` }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().playbook.update({ id: 999_999_992, name: "forged playbook update" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().playbook.delete({ id: 999_999_992 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().playbook.import({ items: [{ name: `${suffix}-imported-playbook` }] }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
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
