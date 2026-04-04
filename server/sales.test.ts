import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(role: 'admin' | 'user' = 'admin'): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      loginMethod: 'manus',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {} } as TrpcContext['res'],
  };
}

describe("auth router", () => {
  it("returns current user when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.name).toBe('Test User');
    expect(user?.role).toBe('admin');
  });
});

describe("sales router", () => {
  it("sales.monthlyStats returns valid structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.sales.monthlyStats({ year: 2025, month: 1 });
    expect(stats).toHaveProperty("target");
    expect(stats).toHaveProperty("actual");
    expect(stats).toHaveProperty("achievementRate");
    expect(typeof stats.target).toBe("number");
    expect(typeof stats.actual).toBe("number");
    expect(stats.achievementRate).toBeGreaterThanOrEqual(0);
  });

  it("sales.trend returns array of monthly data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const trend = await caller.sales.trend({ months: 6 });
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBe(6);
    for (const item of trend) {
      expect(item).toHaveProperty("year");
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("label");
    }
  });
});

describe("engineers router", () => {
  it("engineers.list returns array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const engineers = await caller.engineers.list();
    expect(Array.isArray(engineers)).toBe(true);
  });
});

describe("leads router", () => {
  it("leads.stats returns valid structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.leads.stats({ year: 2025, month: 1 });
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("contacted");
    expect(stats).toHaveProperty("delayedRate");
    expect(typeof stats.delayedRate).toBe("number");
  });

  it("leads.list returns paginated data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({ limit: 10 });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe("visits router", () => {
  it("visits.stats returns valid structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.visits.stats({ year: 2025, month: 1 });
    expect(stats).toHaveProperty("scheduled");
    expect(stats).toHaveProperty("completed");
    expect(stats).toHaveProperty("completionRate");
    expect(typeof stats.completionRate).toBe("number");
    expect(stats.completionRate).toBeGreaterThanOrEqual(0);
    expect(stats.completionRate).toBeLessThanOrEqual(100);
  });
});

describe("closing router", () => {
  it("closing.stats returns valid structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.closing.stats({ year: 2025, month: 1 });
    expect(stats).toHaveProperty("open");
    expect(stats).toHaveProperty("closedWon");
    expect(stats).toHaveProperty("conversionRate");
    expect(stats).toHaveProperty("byStage");
    expect(Array.isArray(stats.byStage)).toBe(true);
  });
});

describe("planning router", () => {
  it("planning.calculate returns correct calculations", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.planning.calculate({
      targetAmount: 500000,
      avgDealValue: 100000,
      closingRate: 0.5,
      visitToClosingRate: 0.5,
    });
    expect(result.dealsNeeded).toBe(5);
    expect(result.visitsNeeded).toBe(10);
    expect(result.leadsNeeded).toBe(20);
  });

  it("planning.getTarget returns null for non-existent month", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const target = await caller.planning.getTarget({ year: 2020, month: 1 });
    expect(target).toBeNull();
  });
});

describe("collections router", () => {
  it("collections.stats returns valid structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.collections.stats();
    expect(stats).toHaveProperty("totalContracts");
    expect(stats).toHaveProperty("totalCollected");
    expect(stats).toHaveProperty("outstanding");
    expect(stats).toHaveProperty("overdue");
    expect(stats).toHaveProperty("collectionRate");
    expect(stats.collectionRate).toBeGreaterThanOrEqual(0);
    expect(stats.collectionRate).toBeLessThanOrEqual(100);
  });
});

describe("kpi router", () => {
  it("kpi.engineers returns array with valid structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const kpi = await caller.kpi.engineers({ year: 2025, month: 1 });
    expect(Array.isArray(kpi)).toBe(true);
    for (const eng of kpi) {
      expect(eng).toHaveProperty("engineerId");
      expect(eng).toHaveProperty("engineerName");
      expect(eng).toHaveProperty("executionScore");
      expect(eng).toHaveProperty("rating");
      expect(eng.executionScore).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("seed router", () => {
  it("seed.isSeeded returns boolean", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const seeded = await caller.seed.isSeeded();
    expect(typeof seeded).toBe("boolean");
  });
});
