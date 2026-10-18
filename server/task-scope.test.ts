import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { dailyTasks, engineers } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 347) % 900_000_000);
const suffix = `task-scope-${Date.now()}-${process.pid}`;
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
      role: "sales_engineer",
      name: "Own-scope task test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("daily task record scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for task scope integration tests");
    await updateUserPermissions(testUserId, [{
      module: "tasks",
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 1,
      dataScope: "own",
    }]);

    const ownEngineer = await db.insert(engineers).values({
      name: `${suffix}-own`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    ownEngineerId = ownEngineer[0]?.id ?? 0;
    if (!ownEngineerId) throw new Error("Could not create own-scope test engineer");
    engineerIds.push(ownEngineerId);

    const otherEngineer = await db.insert(engineers).values({
      name: `${suffix}-other`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    otherEngineerId = otherEngineer[0]?.id ?? 0;
    if (!otherEngineerId) throw new Error("Could not create other-scope test engineer");
    engineerIds.push(otherEngineerId);

    const ownTask = await db.insert(dailyTasks).values({
      engineerId: ownEngineerId,
      taskDate: "2026-10-18",
      title: `${suffix}-own-task`,
      status: "planned",
    }).$returningId();
    ownTaskId = ownTask[0]?.id ?? 0;
    if (!ownTaskId) throw new Error("Could not create own-scope test task");
    taskIds.push(ownTaskId);

    const otherTask = await db.insert(dailyTasks).values({
      engineerId: otherEngineerId,
      taskDate: "2026-10-18",
      title: `${suffix}-other-task`,
      status: "planned",
    }).$returningId();
    otherTaskId = otherTask[0]?.id ?? 0;
    if (!otherTaskId) throw new Error("Could not create other-scope test task");
    taskIds.push(otherTaskId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && taskIds.length) await db.delete(dailyTasks).where(inArray(dailyTasks.id, taskIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies status updates to another engineer's task by direct ID", async () => {
    await expect(caller().tasks.updateStatus({ id: otherTaskId, status: "completed" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies soft deletion of another engineer's task by direct ID", async () => {
    await expect(caller().tasks.delete({ id: otherTaskId, reason: "data_entry_error" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows updating a task owned by the authenticated engineer", async () => {
    await expect(caller().tasks.updateStatus({ id: ownTaskId, status: "completed" }))
      .resolves.toMatchObject({ success: true });
  });
});
