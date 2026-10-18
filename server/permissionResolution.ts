/**
 * Effective operational permissions are stored per user.
 *
 * Role and section permission tables may remain as legacy configuration data,
 * but they must never grant module or CRUD access at runtime. Missing user
 * permission rows are intentionally interpreted as denied.
 */
export type ModulePermission = {
  module: string;
  canView: number;
  canAdd: number;
  canEdit: number;
  canDelete: number;
  dataScope: string;
};

export function resolveUserPermissions(
  userPermissions: ModulePermission[],
): ModulePermission[] {
  const byModule = new Map<string, ModulePermission>();
  for (const permission of userPermissions) {
    // Fail closed for malformed or duplicate rows: the last canonical row is
    // the value returned by the database ordering and never role-derived.
    byModule.set(permission.module, {
      ...permission,
      canView: permission.canView === 1 ? 1 : 0,
      canAdd: permission.canAdd === 1 ? 1 : 0,
      canEdit: permission.canEdit === 1 ? 1 : 0,
      canDelete: permission.canDelete === 1 ? 1 : 0,
    });
  }
  return Array.from(byModule.values());
}
