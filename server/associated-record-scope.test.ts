import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { dealTasks, deals, engineers, playbookQuotations } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 941) % 900_000_000);
const suffix = `associated-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const dealIds: number[] = [];
const dealTaskIds: number[] = [];
const quotationIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownDealId = 0;
let otherDealId = 0;
let ownDealTaskId = 0;
let otherDealTaskId = 0;
let ownQuotationId = 0;
let otherQuotationId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "sales_engineer",
      name: "Own-scope associated record test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("associated record direct-ID scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for associated record scope tests");

    await updateUserPermissions(testUserId, [
      { module: "closing", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own" },
      { module: "pricing_system", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own" },
      { module: "tasks", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own" },
    ]);

    const own = await db.insert(engineers).values({
      name: `${suffix}-own-engineer`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    const other = await db.insert(engineers).values({
      name: `${suffix}-other-engineer`,
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    ownEngineerId = own[0]?.id ?? 0;
    otherEngineerId = other[0]?.id ?? 0;
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create associated record test engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const now = new Date();
    const dealRows = await db.insert(deals).values([
      {
        engineerId: ownEngineerId,
        clientName: `${suffix}-own-client`,
        value: "100.00",
        grossValue: "100.00",
        netValue: "100.00",
        stage: "proposal",
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
      },
      {
        engineerId: otherEngineerId,
        clientName: `${suffix}-other-client`,
        value: "900.00",
        grossValue: "900.00",
        netValue: "900.00",
        stage: "proposal",
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
      },
    ]).$returningId();
    ownDealId = dealRows[0]?.id ?? 0;
    otherDealId = dealRows[1]?.id ?? 0;
    if (!ownDealId || !otherDealId) throw new Error("Could not create associated record test deals");
    dealIds.push(ownDealId, otherDealId);

    const taskRows = await db.insert(dealTasks).values([
      {
        dealId: ownDealId,
        engineerId: ownEngineerId,
        title: `${suffix}-own-deal-task`,
        dueDate: "2026-10-20",
        status: "pending",
        clientName: `${suffix}-own-client`,
        dealStage: "proposal",
      },
      {
        dealId: otherDealId,
        engineerId: otherEngineerId,
        title: `${suffix}-other-deal-task`,
        dueDate: "2026-10-20",
        status: "pending",
        clientName: `${suffix}-other-client`,
        dealStage: "proposal",
      },
    ]).$returningId();
    ownDealTaskId = taskRows[0]?.id ?? 0;
    otherDealTaskId = taskRows[1]?.id ?? 0;
    if (!ownDealTaskId || !otherDealTaskId) throw new Error("Could not create associated record test deal tasks");
    dealTaskIds.push(ownDealTaskId, otherDealTaskId);

    const quotationRows = await db.insert(playbookQuotations).values([
      {
        engineerId: ownEngineerId,
        dealId: ownDealId,
        clientName: `${suffix}-own-client`,
        itemsJson: "[]",
        totalValue: "100.00",
        status: "draft",
      },
      {
        engineerId: otherEngineerId,
        dealId: otherDealId,
        clientName: `${suffix}-other-client`,
        itemsJson: "[]",
        totalValue: "900.00",
        status: "draft",
      },
    ]).$returningId();
    ownQuotationId = quotationRows[0]?.id ?? 0;
    otherQuotationId = quotationRows[1]?.id ?? 0;
    if (!ownQuotationId || !otherQuotationId) throw new Error("Could not create associated record test quotations");
    quotationIds.push(ownQuotationId, otherQuotationId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && dealTaskIds.length) await db.delete(dealTasks).where(inArray(dealTasks.id, dealTaskIds));
    if (db && quotationIds.length) await db.delete(playbookQuotations).where(inArray(playbookQuotations.id, quotationIds));
    if (db && dealIds.length) await db.delete(deals).where(inArray(deals.id, dealIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies direct-ID completion of another engineer's deal task", async () => {
    await expect(caller().dealTasks.markDone({ taskId: otherDealTaskId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows completion of the caller's own deal task", async () => {
    await expect(caller().dealTasks.markDone({ taskId: ownDealTaskId }))
      .resolves.toMatchObject({ success: true });
  });

  it("scopes quotation lists and denies direct-ID status changes for another engineer's quotation", async () => {
    const result = await caller().playbook.listQuotations({ engineerId: otherEngineerId });
    const serialized = JSON.stringify(result);
    expect(serialized).toContain(`${suffix}-own-client`);
    expect(serialized).not.toContain(`${suffix}-other-client`);

    await expect(caller().playbook.updateStatus({ quotationId: otherQuotationId, status: "presented" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the caller to update their own quotation status", async () => {
    await expect(caller().playbook.updateStatus({ quotationId: ownQuotationId, status: "presented" }))
      .resolves.toBeDefined();
  });
});
