import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb, manualOverrideEngineerTarget } from "./db";
import { engineerTargets } from "../drizzle/schema";

describe("manual engineer-target override concurrency", () => {
  const engineerId = 2_000_000_000 - (Date.now() % 1_000_000);
  const year = 2098;
  const month = 12;

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(engineerTargets).where(and(
      eq(engineerTargets.engineerId, engineerId),
      eq(engineerTargets.year, year),
      eq(engineerTargets.month, month),
    ));
  });

  it("persists exactly one monthly target when concurrent manual overrides race", async () => {
    const first = manualOverrideEngineerTarget({ engineerId, year, month, targetAmount: 100_000 });
    const second = manualOverrideEngineerTarget({ engineerId, year, month, targetAmount: 200_000 });

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);

    const db = await getDb();
    const targets = await db!.select().from(engineerTargets).where(and(
      eq(engineerTargets.engineerId, engineerId),
      eq(engineerTargets.year, year),
      eq(engineerTargets.month, month),
    ));
    expect(targets).toHaveLength(1);
    expect(["100000.00", "200000.00"]).toContain(String(targets[0].targetAmount));
    expect(targets[0].isAutoDistributed).toBe(0);
  }, 15_000);
});
