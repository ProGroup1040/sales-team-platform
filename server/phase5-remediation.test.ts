import { afterEach, describe, expect, it } from "vitest";
import { requireDb } from "./db";

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
});
