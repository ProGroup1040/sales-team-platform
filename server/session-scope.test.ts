import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb, updateUserPermissions } from "./db";
import { engineers, meetingSessions } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const testUserId = 1_000_000_000 + ((Date.now() + process.pid + 521) % 900_000_000);
const engineerIds: number[] = [];
const sessionIds: number[] = [];
let ownEngineerId = 0;
let ownSessionId = 0;
let otherSessionId = 0;

function caller() {
  const ctx: TrpcContext = {
    user: null,
    actor: { id: testUserId, source: "app_user", role: "sales_engineer", name: "Session scope test", engineerId: ownEngineerId },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("meeting session scope", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database required");
    await updateUserPermissions(testUserId, [{ module: "tasks", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "own" }]);
    const own = await db.insert(engineers).values({ name: "session-own-" + testUserId, role: "sales_engineer", status: "active" }).$returningId();
    const other = await db.insert(engineers).values({ name: "session-other-" + testUserId, role: "sales_engineer", status: "active" }).$returningId();
    ownEngineerId = own[0]?.id ?? 0;
    const otherEngineerId = other[0]?.id ?? 0;
    engineerIds.push(ownEngineerId, otherEngineerId);
    const ownSession = await db.insert(meetingSessions).values({ engineerId: ownEngineerId, clientName: "own session", sessionType: "presentation" }).$returningId();
    const otherSession = await db.insert(meetingSessions).values({ engineerId: otherEngineerId, clientName: "other session", sessionType: "presentation" }).$returningId();
    ownSessionId = ownSession[0]?.id ?? 0;
    sessionIds.push(ownSessionId, otherSession[0]?.id ?? 0);
    otherSessionId = otherSession[0]?.id ?? 0;
  });
  afterAll(async () => {
    const db = await getDb();
    if (db && sessionIds.length) await db.delete(meetingSessions).where(inArray(meetingSessions.id, sessionIds));
    if (db && engineerIds.length) await db.delete(engineers).where(inArray(engineers.id, engineerIds));
    await updateUserPermissions(testUserId, []);
  });
  it("denies direct-ID reads of another engineer's session", async () => {
    await expect(caller().session.details({ sessionId: otherSessionId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("denies ending another engineer's session", async () => {
    await expect(caller().session.end({ sessionId: otherSessionId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows reading and ending the caller's own session", async () => {
    await expect(caller().session.details({ sessionId: ownSessionId })).resolves.toBeDefined();
    await expect(caller().session.end({ sessionId: ownSessionId })).resolves.toBeDefined();
  });
});
