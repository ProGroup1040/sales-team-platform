import { afterEach, describe, expect, it } from "vitest";
import { requireDb, softDeleteTask } from "./db";

describe("Phase 5 database fail-fast behavior", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("rejects when a critical write requires an unavailable database", async () => {
    delete process.env.DATABASE_URL;
    await expect(requireDb()).rejects.toThrow("Database unavailable");
  });

  it("does not report task deletion success when the database is unavailable", async () => {
    delete process.env.DATABASE_URL;
    await expect(softDeleteTask(12810001, "duplicate", undefined, "test-user"))
      .rejects.toThrow("Database unavailable");
  });
});
