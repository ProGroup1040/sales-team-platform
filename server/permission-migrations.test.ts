import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL;
const migration0072 = readFileSync(new URL("../drizzle/0072_user_permissions_single_source_of_truth.sql", import.meta.url), "utf8");
const migration0073 = readFileSync(new URL("../drizzle/0073_user_permissions_unique_module.sql", import.meta.url), "utf8");

describe.skipIf(!databaseUrl)("permission migration upgrade fixtures (MySQL)", () => {
  let adminConnection: Awaited<ReturnType<typeof createConnection>> | undefined;
  let fixtureConnection: Awaited<ReturnType<typeof createConnection>> | undefined;
  const fixtureDatabase = `authz_migration_test_${randomUUID().replace(/-/g, "")}`;

  beforeAll(async () => {
    const serverUrl = new URL(databaseUrl!);
    serverUrl.pathname = "/";
    adminConnection = await createConnection(serverUrl.toString());
    await adminConnection.query(`CREATE DATABASE \`${fixtureDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    const fixtureUrl = new URL(databaseUrl!);
    fixtureUrl.pathname = `/${fixtureDatabase}`;
    fixtureConnection = await createConnection(fixtureUrl.toString());

    // Use real temporary-schema tables (not MySQL TEMPORARY TABLEs) because
    // MySQL cannot reopen one temporary table twice inside migration 0072's UNION.
    await fixtureConnection.query(`CREATE TABLE app_users (
      id INT NOT NULL PRIMARY KEY,
      role VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await fixtureConnection.query(`CREATE TABLE role_permissions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      module VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      canView TINYINT NOT NULL DEFAULT 0,
      canAdd TINYINT NOT NULL DEFAULT 0,
      canEdit TINYINT NOT NULL DEFAULT 0,
      canDelete TINYINT NOT NULL DEFAULT 0,
      dataScope VARCHAR(10) NOT NULL DEFAULT 'own'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await fixtureConnection.query(`CREATE TABLE user_permissions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      module VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      canView TINYINT NOT NULL DEFAULT 0,
      canAdd TINYINT NOT NULL DEFAULT 0,
      canEdit TINYINT NOT NULL DEFAULT 0,
      canDelete TINYINT NOT NULL DEFAULT 0,
      dataScope VARCHAR(10) NOT NULL DEFAULT 'own',
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await fixtureConnection.query(`INSERT INTO app_users (id, role) VALUES
      (1, 'admin'), (2, 'manager'), (3, 'sales_engineer'), (4, 'manager')`);
    await fixtureConnection.query(`INSERT INTO role_permissions (role, module, canView, canAdd, canEdit, canDelete, dataScope) VALUES
      ('manager', 'tasks', 1, 0, 1, 0, 'own'),
      ('manager', 'closing', 1, 1, 1, 0, 'all'),
      ('manager', 'deals', 1, 0, 0, 0, 'own'),
      ('sales_engineer', 'crm', 1, 1, 0, 0, 'own')`);
    await fixtureConnection.query(`INSERT INTO user_permissions
      (userId, module, canView, canAdd, canEdit, canDelete, dataScope, createdAt, updatedAt) VALUES
      (1, 'crm', 1, 0, 0, 0, 'own', NOW(), NOW()),
      (2, 'tasks', 0, 0, 0, 0, 'own', NOW(), NOW()),
      (2, 'closing', 1, 1, 1, 0, 'all', NOW(), NOW()),
      (2, 'deals', 1, 0, 0, 0, 'own', NOW(), NOW()),
      (3, 'tasks', 1, 1, 0, 0, 'own', NOW(), NOW()),
      (3, 'tasks', 1, 0, 0, 0, 'all', NOW(), NOW())`);
  });

  afterAll(async () => {
    await fixtureConnection?.end();
    if (adminConnection) {
      await adminConnection.query(`DROP DATABASE IF EXISTS \`${fixtureDatabase}\``);
      await adminConnection.end();
    }
  });

  it("backfills missing grants but preserves existing per-user decisions", async () => {
    await fixtureConnection!.query(migration0072);
    const [adminRows] = await fixtureConnection!.query<any[]>(
      "SELECT canView, canAdd, canEdit, canDelete, dataScope FROM user_permissions WHERE userId = 1 AND module = 'crm'"
    );
    expect(adminRows).toHaveLength(1);
    expect(adminRows[0]).toMatchObject({ canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" });

    const [managerRows] = await fixtureConnection!.query<any[]>(
      "SELECT canView, canAdd, canEdit, canDelete, dataScope FROM user_permissions WHERE userId = 2 AND module = 'tasks'"
    );
    expect(managerRows).toHaveLength(1);
    expect(managerRows[0]).toMatchObject({ canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" });

    const [engineerRows] = await fixtureConnection!.query<any[]>(
      "SELECT canView, canAdd, canEdit, canDelete, dataScope FROM user_permissions WHERE userId = 3 AND module = 'crm'"
    );
    expect(engineerRows).toHaveLength(1);
    expect(engineerRows[0]).toMatchObject({ canView: 1, canAdd: 1, canEdit: 0, canDelete: 0, dataScope: "own" });

    // Canonical role grants use the least-privilege intersection of legacy aliases.
    const [canonicalRoleRows] = await fixtureConnection!.query<any[]>(
      "SELECT canView, canAdd, canEdit, canDelete, dataScope FROM user_permissions WHERE userId = 4 AND module = 'closing'"
    );
    expect(canonicalRoleRows).toHaveLength(1);
    expect(canonicalRoleRows[0]).toMatchObject({ canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" });
  });

  it("merges duplicate and canonical grants conservatively, then enforces uniqueness", async () => {
    await fixtureConnection!.query(migration0072);
    const statements = migration0073.split(/-->\s*statement-breakpoint/).map(part => part.trim()).filter(Boolean);
    for (const statement of statements) await fixtureConnection!.query(statement);

    const [taskRows] = await fixtureConnection!.query<any[]>(
      "SELECT canView, canAdd, canEdit, canDelete, dataScope, COUNT(*) OVER () AS rowCount FROM user_permissions WHERE userId = 3 AND module = 'tasks'"
    );
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0]).toMatchObject({ canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own", rowCount: 1 });

    const [closingRows] = await fixtureConnection!.query<any[]>(
      "SELECT canView, canAdd, canEdit, canDelete, dataScope FROM user_permissions WHERE userId = 2 AND module = 'closing'"
    );
    expect(closingRows).toHaveLength(1);
    expect(closingRows[0]).toMatchObject({ canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" });

    const [legacyRows] = await fixtureConnection!.query<any[]>("SELECT COUNT(*) AS count FROM user_permissions WHERE module = 'deals'");
    expect(Number(legacyRows[0].count)).toBe(0);

    const [duplicates] = await fixtureConnection!.query<any[]>(
      "SELECT userId, module, COUNT(*) AS count FROM user_permissions GROUP BY userId, module HAVING COUNT(*) > 1"
    );
    expect(duplicates).toHaveLength(0);
    const [indexes] = await fixtureConnection!.query<any[]>("SHOW INDEX FROM user_permissions WHERE Key_name = 'user_permissions_user_module_unique'");
    expect(indexes.length).toBeGreaterThan(0);
  });
});
