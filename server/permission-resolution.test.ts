import { describe, expect, it } from "vitest";
import { resolveUserPermissions } from "./permissionResolution";

type Permission = {
  module: string;
  canView: number;
  canAdd: number;
  canEdit: number;
  canDelete: number;
  dataScope: "own" | "all";
};

describe("resolveUserPermissions", () => {
  it("does not grant any module permission when the user has no rows", () => {
    expect(resolveUserPermissions([])).toEqual([]);
  });

  it("uses only the explicitly stored user permission rows", () => {
    const userPermissions: Permission[] = [
      { module: "tasks", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    ];

    expect(resolveUserPermissions(userPermissions)).toEqual(userPermissions);
    expect(resolveUserPermissions(userPermissions).some(p => p.module === "crm")).toBe(false);
  });

  it("normalizes every CRUD flag to deny unless it is exactly 1", () => {
    expect(resolveUserPermissions([{
      module: "crm",
      canView: 1,
      canAdd: 2,
      canEdit: -1,
      canDelete: 0,
      dataScope: "own",
    }])).toEqual([{
      module: "crm",
      canView: 1,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "own",
    }]);
  });

  it("keeps explicit denials instead of inheriting a role grant", () => {
    expect(resolveUserPermissions([{
      module: "pricing_system",
      canView: 0,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "own",
    }])).toEqual([{
      module: "pricing_system",
      canView: 0,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "own",
    }]);
  });

  it("canonicalizes the legacy deals alias to closing", () => {
    expect(resolveUserPermissions([{
      module: "deals",
      canView: 1,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "all",
    }])).toEqual([{
      module: "closing",
      canView: 1,
      canAdd: 0,
      canEdit: 0,
      canDelete: 0,
      dataScope: "all",
    }]);
  });

  it("fails closed when canonical and legacy rows collide", () => {
    expect(resolveUserPermissions([
      { module: "closing", canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" },
      { module: "deals", canView: 1, canAdd: 0, canEdit: 1, canDelete: 1, dataScope: "own" },
    ])).toEqual([{
      module: "closing",
      canView: 1,
      canAdd: 0,
      canEdit: 1,
      canDelete: 1,
      dataScope: "own",
    }]);
  });
});
