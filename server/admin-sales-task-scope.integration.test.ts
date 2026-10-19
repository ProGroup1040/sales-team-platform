import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { adminSalesTasks, engineers } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 1009) % 900_000_000);
const suffix = `admin-sales-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const taskIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownTaskId = 0;
let otherTaskId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "admin_sales",
      name: "Own-scope Admin Sales test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("Admin Sales task record scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for Admin Sales task scope tests");

    await updateUserPermissions(testUserId, [{
      module: "tasks",
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 1,
      dataScope: "own",
    }]);

    const own = await db.insert(engineers).values({
      name: `${suffix}-own-engineer`,
      role: "admin_sales",
      status: "active",
    }).$returningId();
    const other = await db.insert(engineers).values({
      name: `${suffix}-other-engineer`,
      role: "admin_sales",
      status: "active",
    }).$returningId();
    ownEngineerId = own[0]?.id ?? 0;
    otherEngineerId = other[0]?.id ?? 0;
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create Admin Sales scope engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const rows = await db.insert(adminSalesTasks).values([
      {
        engineerId: ownEngineerId,
        taskType: "daily",
        taskKey: `${suffix}-own-task-key`,
        taskTitle: `${suffix}-own-task`,
        taskDate: "2026-10-19",
        status: "pending",
      },
      {
        engineerId: otherEngineerId,
        taskType: "daily",
        taskKey: `${suffix}-other-task-key`,
        taskTitle: `${suffix}-other-task`,
        taskDate: "2026-10-19",
        status: "pending",
      },
    ]).$returningId();
    ownTaskId = rows[0]?.id ?? 0;
    otherTaskId = rows[1]?.id ?? 0;
    if (!ownTaskId || !otherTaskId) throw new Error("Could not create Admin Sales task fixtures");
    taskIds.push(ownTaskId, otherTaskId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && taskIds.length) await db.delete(adminSalesTasks).where(inArray(adminSalesTasks.id, taskIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies direct-ID status changes and engineer-filtered reads for another Admin Sales user", async () => {
    await expect(caller().adminSalesTasks.updateStatus({ taskId: otherTaskId, status: "done" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().adminSalesTasks.getByDate({ engineerId: otherEngineerId, date: "2026-10-19" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().adminSalesTasks.getStats({ engineerId: otherEngineerId, month: "2026-10" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the linked Admin Sales user to update their own task", async () => {
    await expect(caller().adminSalesTasks.updateStatus({ taskId: ownTaskId, status: "done" }))
      .resolves.toMatchObject({ success: true });
  });
});
