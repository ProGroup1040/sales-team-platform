import { afterAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";

const enabled = Boolean(process.env.DATABASE_URL);
const migration0074 = path.resolve(import.meta.dirname, "../drizzle/0074_collections_one_contract_per_deal.sql");
const migration0075 = path.resolve(import.meta.dirname, "../drizzle/0075_reconcile_legacy_sales_schema.sql");
const suffix = `${Date.now()}_${process.pid}`.replace(/[^0-9]/g, "");
const databases: string[] = [];

type Db = mysql.Connection;

async function adminConnection() {
  const url = new URL(process.env.DATABASE_URL!);
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });
}

async function disposableDatabase(): Promise<{ db: Db; name: string }> {
  const name = `release_gate_${suffix}_${databases.length}`;
  const admin = await adminConnection();
  await admin.query(`CREATE DATABASE \`${name}\``);
  await admin.end();
  databases.push(name);
  const url = new URL(process.env.DATABASE_URL!);
  const db = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: name,
    multipleStatements: false,
  });
  return { db, name };
}

async function applyMigration(db: Db, file: string) {
  const sql = await fs.readFile(file, "utf8");
  for (const statement of sql.split(/--> statement-breakpoint/).map((item) => item.trim()).filter(Boolean)) {
    await db.query(statement);
  }
}

async function routineCount(db: Db) {
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'reconcile_legacy_sales_schema'",
  );
  return Number(rows[0]?.count ?? 0);
}

async function tableColumns(db: Db, tableName: string) {
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName],
  );
  return rows.map((row) => String(row.COLUMN_NAME));
}

describe.skipIf(!enabled)("release-gate MySQL 8.4 migration verification", () => {
  afterAll(async () => {
    const admin = await adminConnection();
    for (const name of databases) {
      await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    }
    await admin.end();
  });

  it("0074 fails safely on duplicate non-null dealIds and succeeds after explicit cleanup", async () => {
    const { db } = await disposableDatabase();
    await db.query("CREATE TABLE collections (id INT AUTO_INCREMENT PRIMARY KEY, dealId INT NULL)");
    await db.query("INSERT INTO collections (dealId) VALUES (77), (77)");

    await expect(applyMigration(db, migration0074)).rejects.toThrow();
    const [rows] = await db.query<mysql.RowDataPacket[]>("SELECT id, dealId FROM collections ORDER BY id");
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.dealId)).toEqual([77, 77]);

    await db.query("DELETE FROM collections WHERE id = (SELECT id FROM (SELECT MAX(id) AS id FROM collections WHERE dealId = 77) duplicate)");
    await applyMigration(db, migration0074);
    const [indexes] = await db.query<mysql.RowDataPacket[]>("SHOW INDEX FROM collections WHERE Key_name = 'collections_deal_id_unique'");
    expect(indexes.length).toBeGreaterThan(0);
    await db.end();
  }, 15_000);

  it("0075 renames finalAmount, adds notes, and removes its procedure on success", async () => {
    const { db } = await disposableDatabase();
    await db.query("CREATE TABLE sales (id INT PRIMARY KEY, finalAmount DECIMAL(14,2) NOT NULL)");
    await db.query("INSERT INTO sales VALUES (1, 123.45)");
    await db.query("CREATE TABLE customers (id INT PRIMARY KEY)");
    await applyMigration(db, migration0075);
    expect(await tableColumns(db, "sales")).toContain("netAmount");
    expect(await tableColumns(db, "sales")).not.toContain("finalAmount");
    expect(await tableColumns(db, "customers")).toContain("notes");
    expect(await routineCount(db)).toBe(0);
    const [values] = await db.query<mysql.RowDataPacket[]>("SELECT netAmount FROM sales WHERE id = 1");
    expect(String(values[0]?.netAmount)).toBe("123.45");
    await db.end();
  }, 15_000);

  it("0075 accepts netAmount-only and preserves an existing notes column", async () => {
    const { db } = await disposableDatabase();
    await db.query("CREATE TABLE sales (id INT PRIMARY KEY, netAmount DECIMAL(14,2) NOT NULL)");
    await db.query("CREATE TABLE customers (id INT PRIMARY KEY, notes TEXT)");
    await db.query("INSERT INTO customers VALUES (1, 'preserve this')");
    await applyMigration(db, migration0075);
    expect(await tableColumns(db, "sales")).toContain("netAmount");
    expect(await tableColumns(db, "sales")).not.toContain("finalAmount");
    const [values] = await db.query<mysql.RowDataPacket[]>("SELECT notes FROM customers WHERE id = 1");
    expect(values[0]?.notes).toBe("preserve this");
    expect(await routineCount(db)).toBe(0);
    await db.end();
  }, 15_000);

  it.each([
    ["both amount columns", "CREATE TABLE sales (id INT PRIMARY KEY, finalAmount DECIMAL(14,2), netAmount DECIMAL(14,2))"],
    ["neither amount column", "CREATE TABLE sales (id INT PRIMARY KEY, grossAmount DECIMAL(14,2))"],
    ["missing sales table", "CREATE TABLE customers (id INT PRIMARY KEY)"],
    ["missing customers table", "CREATE TABLE sales (id INT PRIMARY KEY, netAmount DECIMAL(14,2))"],
  ])("0075 fails closed for %s and leaves a retryable helper routine", async (_label, setup) => {
    const { db } = await disposableDatabase();
    await db.query(setup);
    await expect(applyMigration(db, migration0075)).rejects.toThrow();
    expect(await routineCount(db)).toBe(1);
    await db.end();
  }, 15_000);

  it("0075 can be retried after a failed unsupported state is corrected", async () => {
    const { db } = await disposableDatabase();
    await db.query("CREATE TABLE sales (id INT PRIMARY KEY, finalAmount DECIMAL(14,2), netAmount DECIMAL(14,2))");
    await db.query("CREATE TABLE customers (id INT PRIMARY KEY)");
    await expect(applyMigration(db, migration0075)).rejects.toThrow();
    expect(await routineCount(db)).toBe(1);
    await db.query("ALTER TABLE sales DROP COLUMN netAmount");
    await applyMigration(db, migration0075);
    expect(await tableColumns(db, "sales")).toContain("netAmount");
    expect(await routineCount(db)).toBe(0);
    await db.end();
  }, 15_000);
});
