import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { createSale, getDb } from "./db";
import { sales } from "../drizzle/schema";

describe("sale creation money calculation", () => {
  const tag = `sale-cents-${Date.now()}`;
  let customerId = 0;
  let saleId = 0;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database required for sale creation integration test");
    // The deployed legacy table uses a primary key without AUTO_INCREMENT.
    // This fixture owns an explicit unused ID so the invoice test stays focused on sales.
    customerId = 1_000_000_000 + ((Date.now() + process.pid) % 900_000_000);
    await db.execute(sql`INSERT INTO customers (id, name) VALUES (${customerId}, ${tag})`);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (saleId) await db.delete(sales).where(eq(sales.id, saleId));
    if (customerId) await db.execute(sql`DELETE FROM customers WHERE id = ${customerId} AND name = ${tag}`);
  });

  it("stores a two-decimal final amount from cents arithmetic", async () => {
    const result = await createSale({
      customerId,
      totalAmount: "100.01",
      discount: "0.10",
      tax: "0.20",
    });
    saleId = result.id;

    const db = await getDb();
    const [saved] = await db!.select().from(sales).where(eq(sales.id, saleId));
    expect(saved).toMatchObject({ totalAmount: "100.01", discount: "0.10", tax: "0.20", finalAmount: "100.11" });
  }, 15_000);

  it("rejects a negative final amount before insertion", async () => {
    await expect(createSale({ customerId, totalAmount: "10.00", discount: "10.01", tax: "0" }))
      .rejects.toThrow("Sale discount cannot exceed total plus tax");
  }, 15_000);
});
