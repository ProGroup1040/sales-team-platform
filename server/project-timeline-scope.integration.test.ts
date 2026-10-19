import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { deals, engineers, projects } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 1081) % 900_000_000);
const suffix = `project-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const dealIds: number[] = [];
const projectIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownProjectId = 0;
let otherProjectId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "sales_engineer",
      name: "Own-scope project timeline test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("project timeline direct-ID scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for project timeline scope tests");

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
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create project timeline test engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const now = new Date();
    const dealRows = await db.insert(deals).values([
      {
        engineerId: ownEngineerId,
        clientName: `${suffix}-own-client`,
        value: "100.00",
        grossValue: "100.00",
        netValue: "100.00",
        stage: "closed_won",
        closingMonth: now.getMonth() + 1,
        closingYear: now.getFullYear(),
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
        stage: "closed_won",
        closingMonth: now.getMonth() + 1,
        closingYear: now.getFullYear(),
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
      },
    ]).$returningId();
    const ownDealId = dealRows[0]?.id ?? 0;
    const otherDealId = dealRows[1]?.id ?? 0;
    if (!ownDealId || !otherDealId) throw new Error("Could not create project timeline test deals");
    dealIds.push(ownDealId, otherDealId);

    const projectRows = await db.insert(projects).values([
      {
        projectCode: `${suffix}-OWN`,
        dealId: ownDealId,
        clientName: `${suffix}-own-project-client`,
        salesEngineerId: ownEngineerId,
        contractValue: "100.00",
        contractDate: "2026-10-19",
      },
      {
        projectCode: `${suffix}-OTHER`,
        dealId: otherDealId,
        clientName: `${suffix}-other-project-client`,
        salesEngineerId: otherEngineerId,
        contractValue: "900.00",
        contractDate: "2026-10-19",
      },
    ]).$returningId();
    ownProjectId = projectRows[0]?.id ?? 0;
    otherProjectId = projectRows[1]?.id ?? 0;
    if (!ownProjectId || !otherProjectId) throw new Error("Could not create project timeline test projects");
    projectIds.push(ownProjectId, otherProjectId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && projectIds.length) await db.delete(projects).where(inArray(projects.id, projectIds));
    if (db && dealIds.length) await db.delete(deals).where(inArray(deals.id, dealIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("allows reading the caller's project detail", async () => {
    const result = await caller().projectTimeline.detail({ projectId: ownProjectId });
    expect(JSON.stringify(result)).toContain(`${suffix}-own-project-client`);
    expect(JSON.stringify(result)).not.toContain(`${suffix}-other-project-client`);
  });

  it("does not recalculate another engineer's project before denying direct-ID access", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for project timeline scope tests");
    await db.update(projects).set({ projectStatus: "delayed" }).where(eq(projects.id, otherProjectId));

    await expect(caller().projectTimeline.detail({ projectId: otherProjectId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    const [project] = await db.select({ projectStatus: projects.projectStatus })
      .from(projects).where(eq(projects.id, otherProjectId)).limit(1);
    expect(project?.projectStatus).toBe("delayed");
  });

  it("denies direct-ID reads of another engineer's project detail", async () => {
    await expect(caller().projectTimeline.detail({ projectId: otherProjectId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
