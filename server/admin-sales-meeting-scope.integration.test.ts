import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { adminSalesMeetings, engineers } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 1193) % 900_000_000);
const suffix = `admin-sales-meeting-scope-${Date.now()}-${process.pid}`;
const engineerIds: number[] = [];
const meetingIds: number[] = [];
let ownEngineerId = 0;
let otherEngineerId = 0;
let ownMeetingId = 0;
let otherMeetingId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: {
      id: testUserId,
      source: "app_user",
      role: "admin_sales",
      name: "Own-scope Admin Sales meeting test",
      engineerId: ownEngineerId,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("Admin Sales meeting record scope enforcement", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for Admin Sales meeting scope tests");

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
    if (!ownEngineerId || !otherEngineerId) throw new Error("Could not create Admin Sales meeting test engineers");
    engineerIds.push(ownEngineerId, otherEngineerId);

    const rows = await db.insert(adminSalesMeetings).values([
      { engineerId: ownEngineerId, weekStartDate: "2026-10-19" },
      { engineerId: otherEngineerId, weekStartDate: "2026-10-19" },
    ]).$returningId();
    ownMeetingId = rows[0]?.id ?? 0;
    otherMeetingId = rows[1]?.id ?? 0;
    if (!ownMeetingId || !otherMeetingId) throw new Error("Could not create Admin Sales meeting fixtures");
    meetingIds.push(ownMeetingId, otherMeetingId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && meetingIds.length) await db.delete(adminSalesMeetings).where(inArray(adminSalesMeetings.id, meetingIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });

  it("denies direct-ID meeting updates and engineer-filtered meeting reads for another user", async () => {
    await expect(caller().adminSalesTasks.updateWeekMeeting({
      id: otherMeetingId,
      weeklyTeamMeeting: "done",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().adminSalesTasks.getWeekMeeting({
      engineerId: otherEngineerId,
      weekStart: "2026-10-19",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows updating the linked Admin Sales user's own meeting record", async () => {
    await expect(caller().adminSalesTasks.updateWeekMeeting({
      id: ownMeetingId,
      weeklyTeamMeeting: "done",
    })).resolves.toMatchObject({ success: true });
  });
});
