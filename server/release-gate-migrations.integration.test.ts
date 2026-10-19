import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL;
const migration0074 = readFileSync(new URL("../drizzle/0074_collections_one_contract_per_deal.sql", import.meta.url), "utf8");
const migration0075 = readFileSync(new URL("../drizzle/0075_reconcile_legacy_sales_schema.sql", import.meta.url), "utf8");
const migration0076 = readFileSync(new URL("../drizzle/0076_follow_up_task_type.sql", import.meta.url), "utf8");
const migration0077 = readFileSync(new URL("../drizzle/0077_reconcile_legacy_customers.sql", import.meta.url), "utf8");
const migration0078 = readFileSync(new URL("../drizzle/0078_reconcile_legacy_sales_contract.sql", import.meta.url), "utf8");
const fixtureId = randomUUID().replace(/-/g, "").slice(0, 20);
const fixtureTables = {
  collections: `release_gate_${fixtureId}_collections`,
  sales: `release_gate_${fixtureId}_sales`,
  customers: `release_gate_${fixtureId}_customers`,
  dailyTasks: `release_gate_${fixtureId}_daily_tasks`,
};

function fixtureSql(statement: string) {
  return statement
    .replace(/TABLE_NAME = 'collections'/g, `TABLE_NAME = '${fixtureTables.collections}'`)
    .replace(/TABLE_NAME = 'sales'/g, `TABLE_NAME = '${fixtureTables.sales}'`)
    .replace(/TABLE_NAME = 'customers'/g, `TABLE_NAME = '${fixtureTables.customers}'`)
    .replace(/TABLE_NAME = 'daily_tasks'/g, `TABLE_NAME = '${fixtureTables.dailyTasks}'`)
    .replace(/`collections`/g, `\`${fixtureTables.collections}\``)
    .replace(/`sales`/g, `\`${fixtureTables.sales}\``)
    .replace(/`customers`/g, `\`${fixtureTables.customers}\``)
    .replace(/`daily_tasks`/g, `\`${fixtureTables.dailyTasks}\``)
    .replace(/(?<!['`])\bcollections\b(?!['`])/g, `\`${fixtureTables.collections}\``)
    .replace(/(?<!['`])\bsales\b(?!['`])/g, `\`${fixtureTables.sales}\``)
    .replace(/(?<!['`])\bcustomers\b(?!['`])/g, `\`${fixtureTables.customers}\``)
    .replace(/(?<!['`])\bdaily_tasks\b(?!['`])/g, `\`${fixtureTables.dailyTasks}\``);
}

function migrationStatements(sql: string) {
  return sql
    .split(/-->\s*statement-breakpoint/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

describe.skipIf(!databaseUrl)("release-gate MySQL migration verification", () => {
  let connection: Awaited<ReturnType<typeof createConnection>> | undefined;

  async function query<T extends any[] = any[]>(statement: string) {
    return connection!.query<T>(fixtureSql(statement));
  }

  async function applyMigration(sql: string) {
    for (const statement of migrationStatements(sql)) await query(statement);
  }

  beforeAll(async () => {
    connection = await createConnection(databaseUrl!);
  });

  afterAll(async () => {
    if (connection) {
      await connection.query(`DROP TABLE IF EXISTS \`${fixtureTables.dailyTasks}\`, \`${fixtureTables.customers}\`, \`${fixtureTables.sales}\`, \`${fixtureTables.collections}\``);
      await connection.end();
    }
  });

  it("0074 fails safely on duplicate non-null dealIds and succeeds after explicit cleanup", async () => {
    await query("CREATE TABLE collections (id INT AUTO_INCREMENT PRIMARY KEY, dealId INT NULL)");
    await query("INSERT INTO collections (dealId) VALUES (77), (77)");

    await expect(applyMigration(migration0074)).rejects.toThrow();
    const [rows] = await query<any[]>("SELECT id, dealId FROM collections ORDER BY id");
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.dealId)).toEqual([77, 77]);

    await query("DELETE FROM collections WHERE id = (SELECT id FROM (SELECT MAX(id) AS id FROM collections WHERE dealId = 77) duplicate_row)");
    await applyMigration(migration0074);
    const [indexes] = await query<any[]>("SHOW INDEX FROM collections WHERE Key_name = 'collections_deal_id_unique'");
    expect(indexes.length).toBeGreaterThan(0);
  }, 15_000);

  it("0075 retains its released content and reconciles finalAmount without data loss", async () => {
    await query("CREATE TABLE sales (id INT PRIMARY KEY, finalAmount DECIMAL(14,2) NOT NULL)");
    await query("INSERT INTO sales VALUES (1, 123.45)");
    await query("CREATE TABLE customers (id INT PRIMARY KEY)");

    await applyMigration(migration0075);
    const [columns] = await query<any[]>("SHOW COLUMNS FROM sales");
    expect(columns.map((column) => column.Field)).toContain("netAmount");
    expect(columns.map((column) => column.Field)).not.toContain("finalAmount");
    const [customerColumns] = await query<any[]>("SHOW COLUMNS FROM customers");
    expect(customerColumns.map((column) => column.Field)).toContain("notes");
    const [values] = await query<any[]>("SELECT netAmount FROM sales WHERE id = 1");
    expect(String(values[0]?.netAmount)).toBe("123.45");
  }, 15_000);

  it("0075 is idempotent for an already reconciled legacy schema", async () => {
    await query("DROP TABLE customers");
    await query("DROP TABLE sales");
    await query("CREATE TABLE sales (id INT PRIMARY KEY, netAmount DECIMAL(14,2) NOT NULL)");
    await query("CREATE TABLE customers (id INT PRIMARY KEY, notes TEXT)");
    await query("INSERT INTO customers VALUES (1, 'preserve this')");

    await applyMigration(migration0075);
    await applyMigration(migration0075);
    const [values] = await query<any[]>("SELECT notes FROM customers WHERE id = 1");
    expect(values[0]?.notes).toBe("preserve this");
  }, 15_000);

  it("0076 preserves legacy task values and permits follow_up", async () => {
    await query("CREATE TABLE daily_tasks (id INT AUTO_INCREMENT PRIMARY KEY, taskType enum('design_2d','design_3d','render','quotation','meeting_modeling','meeting_presentation','meeting_closing','contract','work_order','meeting_2d','meeting_3d','meeting_quotation','closing','negotiation','other') DEFAULT 'other')");
    await query("INSERT INTO daily_tasks (taskType) VALUES ('negotiation')");

    await applyMigration(migration0076);
    const [columns] = await query<any[]>("SHOW COLUMNS FROM daily_tasks LIKE 'taskType'");
    expect(String(columns[0]?.Type)).toContain("'follow_up'");
    await query("INSERT INTO daily_tasks (taskType) VALUES ('follow_up')");
    const [values] = await query<any[]>("SELECT taskType FROM daily_tasks ORDER BY id");
    expect(values.map((value) => value.taskType)).toEqual(["negotiation", "follow_up"]);
  }, 15_000);

  it("0077 adds missing customer columns without rewriting legacy notes", async () => {
    await query("DROP TABLE customers");
    await query("CREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY, notes TEXT)");
    await query("INSERT INTO customers (notes) VALUES ('legacy note')");

    await applyMigration(migration0077);
    await applyMigration(migration0077);
    const [columns] = await query<any[]>("SHOW COLUMNS FROM customers");
    expect(columns.map((column) => column.Field)).toEqual(expect.arrayContaining([
      "id", "name", "email", "phone", "company", "status", "notes", "createdAt", "updatedAt",
    ]));
    const [customers] = await query<any[]>("SELECT name, notes, status FROM customers WHERE id = 1");
    expect(customers[0]).toMatchObject({ name: "عميل غير مسمى", notes: "legacy note", status: "active" });
  }, 30_000);

  it("0078 adds the sales write contract while preserving legacy net amounts", async () => {
    await query("DROP TABLE sales");
    await query("CREATE TABLE sales (id INT PRIMARY KEY, netAmount DECIMAL(14,2) NOT NULL)");
    await query("INSERT INTO sales (id, netAmount) VALUES (1, 321.09)");

    await applyMigration(migration0078);
    await applyMigration(migration0078);
    const [columns] = await query<any[]>("SHOW COLUMNS FROM sales");
    expect(columns.map((column) => column.Field)).toEqual(expect.arrayContaining([
      "id", "invoiceNumber", "customerId", "totalAmount", "discount", "tax", "netAmount", "status", "paymentStatus", "notes", "createdAt", "updatedAt",
    ]));
    const [sales] = await query<any[]>("SELECT invoiceNumber, netAmount FROM sales WHERE id = 1");
    expect(sales[0]).toMatchObject({ invoiceNumber: "LEGACY-1", netAmount: "321.09" });
  }, 45_000);

  it("0078 repairs a finalAmount-only table when 0075 was already recorded", async () => {
    await query("DROP TABLE sales");
    await query("CREATE TABLE sales (id INT PRIMARY KEY, finalAmount DECIMAL(14,2) NOT NULL)");
    await query("INSERT INTO sales (id, finalAmount) VALUES (1, 654.32)");
    await applyMigration(migration0078);
    const [sales] = await query<any[]>("SELECT invoiceNumber, netAmount FROM sales WHERE id = 1");
    expect(sales[0]).toMatchObject({ invoiceNumber: "LEGACY-1", netAmount: "654.32" });
  }, 45_000);
});
