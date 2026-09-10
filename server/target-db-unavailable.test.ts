import { afterEach, describe, expect, it, vi } from "vitest";

describe("manual target override persistence", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    vi.resetModules();
  });

  it("fails explicitly when no database connection is available", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { manualOverrideEngineerTarget } = await import("./db");

    await expect(manualOverrideEngineerTarget({
      engineerId: 77,
      year: 2026,
      month: 9,
      targetAmount: 100_000,
    })).rejects.toThrow("Database unavailable");
  });
});
