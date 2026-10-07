/**
 * Merges the role baseline with individual overrides.
 *
 * A user-specific record is an explicit override only for its own module.
 * Modules introduced after the account was created therefore retain their
 * role-level defaults until an administrator records an individual choice.
 */
type ModulePermission = {
  module: string;
  canView: number;
  canAdd: number;
  canEdit: number;
  canDelete: number;
  dataScope: string;
};

export function mergeRoleAndUserPermissions(
  rolePermissions: ModulePermission[],
  userPermissions: ModulePermission[],
): ModulePermission[] {
  const effectivePermissions = new Map<string, ModulePermission>();

  for (const permission of rolePermissions) {
    effectivePermissions.set(permission.module, permission);
  }
  for (const permission of userPermissions) {
    effectivePermissions.set(permission.module, permission);
  }

  return Array.from(effectivePermissions.values());
}
