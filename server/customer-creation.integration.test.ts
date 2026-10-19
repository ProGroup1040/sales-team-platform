import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray, sql } from "drizzle-orm";
import { createCustomer, getDb } from "./db";
import { customers } from "../drizzle/schema";

const enabled = Boolean(process.env.DATABASE_URL);
const suffix = `legacy-customer-${Date.now()}-${process.pid}`;
const customerIds: number[] = [];

describe.skipIf(!enabled)("legacy customer identity persistence", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is required for customer integration tests");
    const [identity] = await db.execute(sql<{ extra: string | null }>`
      SELECT EXTRA AS extra FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'id'
    `);
    expect(String(identity?.extra ?? '')).not.toContain("auto_increment");
  });

  afterAll(async () => {
    const db = await getDb();
    if (db && customerIds.length) await db.delete(customers).where(inArray(customers.id, customerIds));
  });

  it("creates distinct customers when the legacy ID is not auto-incremented", async () => {
    await Promise.all([0, 1, 2].map((index) => createCustomer({ name: `${suffix}-${index}`, status: "active" })));
    const db = await getDb();
    const rows = await db!.select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(sql`${customers.name} LIKE ${`${suffix}-%`}`);
    customerIds.push(...rows.map((row) => row.id));
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.id)).size).toBe(3);
  }, 15_000);
});
