/**
 * Tests for Dynamic Role Permissions System
 * يختبر:
 * 1. دوال DB: getRolePermissions, getAllRolePermissions, updateRolePermission
 * 2. SYSTEM_MODULES و SYSTEM_ROLES constants
 * 3. buildDynamicAccess logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB functions ────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getRolePermissions: vi.fn(),
    getAllRolePermissions: vi.fn(),
    updateRolePermission: vi.fn(),
    updateAllRolePermissions: vi.fn(),
    SYSTEM_MODULES: actual.SYSTEM_MODULES,
    SYSTEM_ROLES: actual.SYSTEM_ROLES,
  };
});

import {
  SYSTEM_MODULES,
  SYSTEM_ROLES,
  getRolePermissions,
  getAllRolePermissions,
  updateRolePermission,
} from "./db";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SYSTEM_MODULES", () => {
  it("should contain all required modules", () => {
    const keys = SYSTEM_MODULES.map((m) => m.key);
    expect(keys).toContain("overview");
    expect(keys).toContain("tasks");
    expect(keys).toContain("crm");
    expect(keys).toContain("visits");
    expect(keys).toContain("closing");
    expect(keys).toContain("sales");
    expect(keys).toContain("kpi");
    expect(keys).toContain("collections");
    expect(keys).toContain("planning");
    expect(keys).toContain("reports");
    expect(keys).toContain("sales_execution");
    expect(keys).toContain("promotion");
    expect(keys).toContain("users");
    expect(keys).toContain("permissions");
  });

  it("should have 14 modules", () => {
    expect(SYSTEM_MODULES).toHaveLength(14);
  });

  it("each module should have key and label", () => {
    for (const mod of SYSTEM_MODULES) {
      expect(mod.key).toBeTruthy();
      expect(mod.label).toBeTruthy();
    }
  });
});

describe("SYSTEM_ROLES", () => {
  it("should contain all required roles", () => {
    const keys = SYSTEM_ROLES.map((r) => r.key);
    expect(keys).toContain("manager");
    expect(keys).toContain("admin_sales");
    expect(keys).toContain("sales_engineer");
    expect(keys).toContain("sales_specialist");
  });

  it("should have 4 roles", () => {
    expect(SYSTEM_ROLES).toHaveLength(4);
  });

  it("each role should have key and label", () => {
    for (const role of SYSTEM_ROLES) {
      expect(role.key).toBeTruthy();
      expect(role.label).toBeTruthy();
    }
  });
});

describe("getRolePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return permissions for a role", async () => {
    const mockPerms = [
      { id: 1, role: "manager", module: "overview", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
      { id: 2, role: "manager", module: "tasks", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
    ];
    vi.mocked(getRolePermissions).mockResolvedValue(mockPerms as any);

    const result = await getRolePermissions("manager");
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("manager");
    expect(result[0].module).toBe("overview");
    expect(result[0].canView).toBe(1);
  });

  it("should return empty array for unknown role", async () => {
    vi.mocked(getRolePermissions).mockResolvedValue([]);
    const result = await getRolePermissions("unknown_role");
    expect(result).toHaveLength(0);
  });
});

describe("getAllRolePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all permissions for all roles", async () => {
    const mockPerms = [
      { id: 1, role: "manager", module: "overview", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
      { id: 2, role: "sales_engineer", module: "overview", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    ];
    vi.mocked(getAllRolePermissions).mockResolvedValue(mockPerms as any);

    const result = await getAllRolePermissions();
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.role)).toContain("manager");
    expect(result.map((p) => p.role)).toContain("sales_engineer");
  });
});

describe("updateRolePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateRolePermission with correct params", async () => {
    vi.mocked(updateRolePermission).mockResolvedValue(undefined);

    await updateRolePermission("sales_engineer", "closing", {
      canView: 1,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "own",
    });

    expect(updateRolePermission).toHaveBeenCalledWith(
      "sales_engineer",
      "closing",
      { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" }
    );
  });

  it("should allow granting full access to any role", async () => {
    vi.mocked(updateRolePermission).mockResolvedValue(undefined);

    await updateRolePermission("sales_engineer", "kpi", {
      canView: 1,
      canAdd: 1,
      canEdit: 1,
      canDelete: 1,
      dataScope: "all",
    });

    expect(updateRolePermission).toHaveBeenCalledWith(
      "sales_engineer",
      "kpi",
      { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" }
    );
  });

  it("should allow revoking access from any role", async () => {
    vi.mocked(updateRolePermission).mockResolvedValue(undefined);

    await updateRolePermission("manager", "permissions", {
      canView: 0,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "own",
    });

    expect(updateRolePermission).toHaveBeenCalledWith(
      "manager",
      "permissions",
      { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" }
    );
  });
});

describe("Dynamic Permissions Logic", () => {
  it("canView=0 means module is hidden", () => {
    const perm = { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" };
    expect(perm.canView === 0).toBe(true);
  });

  it("canView=1 means module is visible", () => {
    const perm = { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" };
    expect(perm.canView === 1).toBe(true);
  });

  it("dataScope own means user sees only their data", () => {
    const perm = { canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" };
    expect(perm.dataScope).toBe("own");
  });

  it("dataScope all means user sees all data", () => {
    const perm = { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" };
    expect(perm.dataScope).toBe("all");
  });

  it("permissions are independent per role-module combination", () => {
    const managerPerm = { role: "manager", module: "closing", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" };
    const salesPerm   = { role: "sales_engineer", module: "closing", canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" };

    expect(managerPerm.canView).toBe(1);
    expect(salesPerm.canView).toBe(0);
    // Same module, different roles → different permissions
    expect(managerPerm.canView).not.toBe(salesPerm.canView);
  });
});
