import { describe, expect, it } from "vitest";
import { mergeRoleAndUserPermissions } from "./permissionResolution";

type Permission = {
  module: string;
  canView: number;
  canAdd: number;
  canEdit: number;
  canDelete: number;
  dataScope: "own" | "all";
};

describe("mergeRoleAndUserPermissions", () => {
  const rolePermissions: Permission[] = [
    { module: "tasks", canView: 1, canAdd: 1, canEdit: 1, canDelete: 0, dataScope: "own" },
    { module: "pricing_system", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
  ];

  it("adds a newly introduced role module to an existing individual permission set", () => {
    const userPermissions: Permission[] = [
      { module: "tasks", canView: 1, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    ];

    expect(mergeRoleAndUserPermissions(rolePermissions, userPermissions)).toEqual([
      userPermissions[0],
      rolePermissions[1],
    ]);
  });

  it("preserves an explicit individual override for the same module", () => {
    const userPermissions: Permission[] = [
      { module: "pricing_system", canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" },
    ];

    const effective = mergeRoleAndUserPermissions(rolePermissions, userPermissions);
    expect(effective.find((permission) => permission.module === "pricing_system")).toEqual(userPermissions[0]);
  });
});
