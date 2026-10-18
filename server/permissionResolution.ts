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
    const module = permission.module === "deals" ? "closing" : permission.module;
    const normalized = {
      ...permission,
      module,
      canView: permission.canView === 1 ? 1 : 0,
      canAdd: permission.canAdd === 1 ? 1 : 0,
      canEdit: permission.canEdit === 1 ? 1 : 0,
      canDelete: permission.canDelete === 1 ? 1 : 0,
      dataScope: permission.dataScope === "all" ? "all" : "own",
    } satisfies ModulePermission;
    const existing = byModule.get(module);
    if (!existing) {
      byModule.set(module, normalized);
      continue;
    }
    // Duplicate canonical rows are invalid state. Resolve them conservatively:
    // every CRUD grant must be present in every row and scope never widens.
    byModule.set(module, {
      ...normalized,
      canView: existing.canView === 1 && normalized.canView === 1 ? 1 : 0,
      canAdd: existing.canAdd === 1 && normalized.canAdd === 1 ? 1 : 0,
      canEdit: existing.canEdit === 1 && normalized.canEdit === 1 ? 1 : 0,
      canDelete: existing.canDelete === 1 && normalized.canDelete === 1 ? 1 : 0,
      dataScope: existing.dataScope === "all" && normalized.dataScope === "all" ? "all" : "own",
    });
  }
  return Array.from(byModule.values());
}
