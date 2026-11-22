import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { dailyTasks, engineers, leads } from "../drizzle/schema";
import { getDb, updateUserPermissions } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
const suffix = `whatsapp-task-link-${Date.now()}-${process.pid}`;
const ownUserId = 1_000_000_000 + ((Date.now() + process.pid + 733) % 900_000_000);
const allScopeUserId = ownUserId + 1;
const engineerNames = [`${suffix}-own-engineer`, `${suffix}-other-engineer`];
const leadNames = [
  `${suffix}-own-lead`,
  `${suffix}-unassigned-lead`,
  `${suffix}-other-lead`,
  `${suffix}-deleted-lead`,
];
const taskNames = [`${suffix}-linked-task`];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownLeadId = 0;
let unassignedLeadId = 0;
let otherLeadId = 0;

function caller(userId: number, role: string, engineerId: number | null) {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: userId,
      source: "app_user",
      role,
      name: "WhatsApp CRM task-link integration test",
      engineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

const ownCaller = () => caller(ownUserId, "sales_engineer", ownEngineerId);
const allScopeCaller = () => caller(allScopeUserId, "manager", null);

describe.skipIf(!enabled)("WhatsApp CRM lead search and Daily Task linking", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for WhatsApp CRM task-link tests");

    const ownEngineer = await db.insert(engineers).values({
      name: engineerNames[0],
      department: "sales_engineer",
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    ownEngineerId = ownEngineer[0]?.id ?? 0;

    const otherEngineer = await db.insert(engineers).values({
      name: engineerNames[1],
      department: "sales_engineer",
      role: "sales_engineer",
      status: "active",
    }).$returningId();
    otherEngineerId = otherEngineer[0]?.id ?? 0;
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create test engineers");

    const ownLead = await db.insert(leads).values({
      name: leadNames[0],
      phone: "+20 100 000 001",
      phoneNormalized: "20100000001",
      whatsappId: `wa-own-${suffix}`,
      assignedEngineerId: ownEngineerId,
      source: "social_media",
      status: "new",
    }).$returningId();
    ownLeadId = ownLead[0]?.id ?? 0;

    const unassignedLead = await db.insert(leads).values({
      name: leadNames[1],
      phone: "+20 100 000 002",
      phoneNormalized: "20100000002",
      whatsappId: `LID-unassigned-${suffix}`,
      source: "social_media",
      status: "new",
    }).$returningId();
    unassignedLeadId = unassignedLead[0]?.id ?? 0;

    const otherLead = await db.insert(leads).values({
      name: leadNames[2],
      phone: "+20 100 000 003",
      phoneNormalized: "20100000003",
      whatsappId: `wa-other-${suffix}`,
      assignedEngineerId: otherEngineerId,
      source: "social_media",
      status: "new",
    }).$returningId();
    otherLeadId = otherLead[0]?.id ?? 0;

    await db.insert(leads).values({
      name: leadNames[3],
      whatsappId: `wa-deleted-${suffix}`,
      source: "social_media",
      status: "new",
      isDeleted: 1,
    });

    if (!ownLeadId || !unassignedLeadId || !otherLeadId) {
      throw new Error("Could not create test CRM lead records");
    }

    await updateUserPermissions(ownUserId, [{
      module: "tasks",
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 1,
      dataScope: "own",
    }]);
    await updateUserPermissions(allScopeUserId, [{
      module: "tasks",
      canView: 1,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "all",
    }]);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db) {
      if (taskNames.length) await db.delete(dailyTasks).where(inArray(dailyTasks.title, taskNames));
      if (leadNames.length) await db.delete(leads).where(inArray(leads.name, leadNames));
      if (engineerNames.length) await db.delete(engineers).where(inArray(engineers.name, engineerNames));
    }
    await updateUserPermissions(ownUserId, []);
    await updateUserPermissions(allScopeUserId, []);
  });

  it("searches by name, normalized phone, and WhatsApp ID while enforcing own scope plus unassigned intake", async () => {
    const byName = await ownCaller().tasks.searchLeads({ query: suffix, searchIn: "name" });
    const visibleNames = byName.map((lead) => lead.name);
    expect(visibleNames).toContain(leadNames[0]);
    expect(visibleNames).toContain(leadNames[1]);
    expect(visibleNames).not.toContain(leadNames[2]);
    expect(visibleNames).not.toContain(leadNames[3]);

    const byPhone = await ownCaller().tasks.searchLeads({
      query: "20100000001",
      searchIn: "phone",
    });
    expect(byPhone.map((lead) => lead.id)).toContain(ownLeadId);

    const byWhatsApp = await ownCaller().tasks.searchLeads({
      query: `LID-unassigned-${suffix}`,
      searchIn: "whatsapp",
    });
    expect(byWhatsApp.map((lead) => lead.id)).toContain(unassignedLeadId);
    expect(byWhatsApp.map((lead) => lead.id)).not.toContain(otherLeadId);
  });

  it("allows an explicit all-scope task reader to search leads across engineers", async () => {
    const results = await allScopeCaller().tasks.searchLeads({
      query: suffix,
      searchIn: "all",
    });
    const names = results.map((lead) => lead.name);
    expect(names).toContain(leadNames[0]);
    expect(names).toContain(leadNames[1]);
    expect(names).toContain(leadNames[2]);
    expect(names).not.toContain(leadNames[3]);
  });

  it("persists leadId on a task and rejects linking a lead outside the caller's scope", async () => {
    const taskDate = new Date().toISOString().slice(0, 10);
    await expect(ownCaller().tasks.create({
      engineerId: otherEngineerId,
      taskDate,
      title: taskNames[0],
      leadId: unassignedLeadId,
    })).resolves.toMatchObject({ success: true });

    const db = await getDb();
    if (!db) throw new Error("Database is required for task-link assertions");
    const [savedTask] = await db.select({
      id: dailyTasks.id,
      engineerId: dailyTasks.engineerId,
      leadId: dailyTasks.leadId,
      clientName: dailyTasks.clientName,
    }).from(dailyTasks).where(inArray(dailyTasks.title, taskNames)).limit(1);

    expect(savedTask?.leadId).toBe(unassignedLeadId);
    expect(savedTask?.engineerId).toBe(ownEngineerId);
    expect(savedTask?.clientName).toBe(leadNames[1]);

    await expect(ownCaller().tasks.create({
      engineerId: ownEngineerId,
      taskDate,
      title: `${suffix}-forbidden-link`,
      leadId: otherLeadId,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
