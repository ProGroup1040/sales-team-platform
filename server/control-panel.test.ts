import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@company.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Control Panel - Auth", () => {
  it("returns user info for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Admin User");
  });

  it("logout clears cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      ...createAdminContext(),
      res: { clearCookie: (name: string) => clearedCookies.push(name) } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });
});

describe("Control Panel - Planning Router", () => {
  it("planning.calculate returns correct values", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.planning.calculate({
      targetAmount: 500000,
      avgDealValue: 100000,
      closingRate: 0.4,
      visitToClosingRate: 0.5,
    });
    expect(result.dealsNeeded).toBe(5);
    expect(result.visitsNeeded).toBe(13); // ceil(5 / 0.4)
    expect(result.leadsNeeded).toBe(26); // ceil(13 / 0.5)
  });

  it("planning.calculate handles edge cases", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.planning.calculate({
      targetAmount: 1000000,
      avgDealValue: 50000,
      closingRate: 0.25,
      visitToClosingRate: 0.6,
    });
    expect(result.dealsNeeded).toBe(20);
    expect(result.visitsNeeded).toBeGreaterThan(0);
    expect(result.leadsNeeded).toBeGreaterThan(0);
  });
});

describe("Control Panel - Sales Router", () => {
  it("sales.monthlyStats returns valid structure", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.sales.monthlyStats({ year: 2025, month: 1 });
    expect(stats).toHaveProperty("target");
    expect(stats).toHaveProperty("actual");
    expect(stats).toHaveProperty("achievementRate");
    expect(stats).toHaveProperty("remaining");
    expect(typeof stats.achievementRate).toBe("number");
    expect(stats.achievementRate).toBeGreaterThanOrEqual(0);
  });

  it("sales.trend returns array", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const trend = await caller.sales.trend({ months: 3 });
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBe(3);
    for (const item of trend) {
      expect(item).toHaveProperty("year");
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("target");
      expect(item).toHaveProperty("actual");
    }
  });
});

describe("Control Panel - Closing Router", () => {
  it("closing.stats returns valid structure", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.closing.stats({ year: 2025, month: 1 });
    expect(stats).toHaveProperty("open");
    expect(stats).toHaveProperty("closedWon");
    expect(stats).toHaveProperty("conversionRate");
    expect(stats).toHaveProperty("byStage");
    expect(Array.isArray(stats.byStage)).toBe(true);
  });
});

describe("Control Panel - Collections Router", () => {
  it("collections.stats returns valid structure", async () => {
    const ctx = createAdminContext();
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

describe("Control Panel - KPI Router", () => {
  it("kpi.engineers returns array", async () => {
    const ctx = createAdminContext();
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
