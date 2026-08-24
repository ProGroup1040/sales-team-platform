/**
 * useRoleAccess — Dynamic Role-Based Access Control
 * 
 * يجلب الصلاحيات من قاعدة البيانات (role_permissions table)
 * بدلاً من الـ Hardcoded Rules.
 * 
 * الـ Admin يمكنه تعديل الصلاحيات من لوحة التحكم في أي وقت.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { MANAGER_ROLES, SALES_ROLES, type AppRole } from "@shared/authorization";
export type { AppRole } from "@shared/authorization";

// Mapping: module key → accessKey in RoleAccess
const MODULE_TO_ACCESS_KEY: Record<string, keyof RoleAccess> = {
  overview:        "canSeeOverview",
  tasks:           "canSeeTasks",
  crm:             "canSeeLeads",
  visits:          "canSeeVisits",
  closing:         "canSeeClosing",
  project_timeline:"canSeeProjectTimeline",
  sales:           "canSeeSalesModule",
  kpi:             "canSeeKPI",
  collections:     "canSeeCollections",
  planning:        "canSeePlanning",
  reports:         "canSeeReports",
  sales_execution: "canSeeSalesExecution",
  promotion:       "canSeePromotion",
  users:           "canSeePromotion",
  permissions:     "canSeePromotion",
};

export interface RoleAccess {
  // Navigation Modules
  canSeeOverview: boolean;
  canSeeTasks: boolean;
  canSeeLeads: boolean;
  canSeeVisits: boolean;
  canSeeClosing: boolean;
  canSeeProjectTimeline: boolean;
  canSeeSalesModule: boolean;
  canSeeKPI: boolean;
  canSeeCollections: boolean;
  canSeePlanning: boolean;
  canSeeReports: boolean;
  canSeeSalesExecution: boolean;
  canSeePromotion: boolean;
  // Role info
  role: AppRole | null;
  isManager: boolean;
  isSalesTeam: boolean;
  isAdminSales: boolean;
  isTeleSales: boolean;
  isInterior: boolean;
  // Dynamic permissions map: module → { canView, canAdd, canEdit, canDelete, dataScope }
  modulePerms: Record<string, {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    dataScope: "own" | "team" | "all";
  }>;
  isLoading: boolean;
}

/** Safe fallback: role defaults are used only while permissions are loading; after a failed or empty permission read, access is denied. */
function buildDefaultAccess(role: AppRole | null, isLoading = false): RoleAccess {
  const isManager = (MANAGER_ROLES as readonly string[]).includes(role ?? "");
  const isSalesTeam = (SALES_ROLES as readonly string[]).includes(role ?? "");
  const isAdminSales = role === "admin_sales";
  const isTeleSales = role === "tele_sales";
  const isInterior = role === "interior_designer";

  return {
    canSeeOverview: isLoading,
    canSeeTasks: isLoading,
    canSeeLeads: isLoading,
    canSeeVisits: isLoading,
    canSeeClosing: isLoading && (isManager || isSalesTeam),
    canSeeProjectTimeline: isLoading && (isManager || isSalesTeam),
    canSeeSalesModule: isLoading && (isManager || isSalesTeam),
    canSeeKPI: isLoading,
    canSeeCollections: isLoading && (isManager || isSalesTeam || isAdminSales),
    canSeePlanning: isLoading && (isManager || isSalesTeam),
    canSeeReports: isLoading && (isManager || isSalesTeam || isAdminSales),
    canSeeSalesExecution: isLoading && (isManager || isSalesTeam),
    canSeePromotion: isLoading && isManager,
    role,
    isManager,
    isSalesTeam,
    isAdminSales,
    isTeleSales,
    isInterior,
    modulePerms: {},
    isLoading,
  };
}

/** بناء RoleAccess من بيانات role_permissions */
function buildDynamicAccess(
  role: AppRole | null,
  dbPerms: Array<{ module: string; canView: number; canAdd: number; canEdit: number; canDelete: number; dataScope: string }>
): RoleAccess {
  const isManager = (MANAGER_ROLES as readonly string[]).includes(role ?? "");
  const isSalesTeam = (SALES_ROLES as readonly string[]).includes(role ?? "");
  const isAdminSales = role === "admin_sales";
  const isTeleSales = role === "tele_sales";
  const isInterior = role === "interior_designer";

  // Build modulePerms map
  const modulePerms: RoleAccess["modulePerms"] = {};
  for (const p of dbPerms) {
    modulePerms[p.module] = {
      canView:   p.canView === 1,
      canAdd:    p.canAdd === 1,
      canEdit:   p.canEdit === 1,
      canDelete: p.canDelete === 1,
      dataScope: (p.dataScope as "own" | "team" | "all") ?? "own",
    };
  }

  // Map module permissions to navigation access keys
  const getModuleView = (moduleKey: string): boolean => {
    return modulePerms[moduleKey]?.canView ?? false;
  };

  return {
    canSeeOverview:       getModuleView("overview"),
    canSeeTasks:          getModuleView("tasks"),
    canSeeLeads:          getModuleView("crm"),
    canSeeVisits:         getModuleView("visits"),
    canSeeClosing:        getModuleView("closing"),
    canSeeProjectTimeline:getModuleView("project_timeline") || getModuleView("closing"),
    canSeeSalesModule:    getModuleView("sales"),
    canSeeKPI:            getModuleView("kpi"),
    canSeeCollections:    getModuleView("collections"),
    canSeePlanning:       getModuleView("planning"),
    canSeeReports:        getModuleView("reports"),
    canSeeSalesExecution: getModuleView("sales_execution"),
    canSeePromotion:      getModuleView("users") || getModuleView("permissions") || getModuleView("promotion"),
    role,
    isManager,
    isSalesTeam,
    isAdminSales,
    isTeleSales,
    isInterior,
    modulePerms,
    isLoading: false,
  };
}

/**
 * Hook رئيسي — يجلب الصلاحيات من DB ويبني RoleAccess
 */
export function useRoleAccess(role: string | null | undefined): RoleAccess {
  const r = (role ?? null) as AppRole | null;

  const { data: dbPerms, isLoading } = trpc.localAuth.myPermissions.useQuery(
    undefined,
    {
      // Always fetch — server checks session/OAuth internally
      staleTime: 30_000, // cache 30s
      retry: false,
    }
  );

  return useMemo(() => {
    // If we have DB permissions, use them (works for both local session and OAuth)
    if (dbPerms && dbPerms.length > 0) return buildDynamicAccess(r, dbPerms as any[]);
    if (isLoading) return buildDefaultAccess(r, true);
    // No session at all
    if (!r) return buildDefaultAccess(null, false);
    return buildDefaultAccess(r, false);
  }, [r, dbPerms, isLoading]);
}

/**
 * Hook مساعد للتحقق من صلاحية محددة على module معين
 */
export function useModulePermission(
  role: string | null | undefined,
  moduleKey: string
) {
  const access = useRoleAccess(role);
  return access.modulePerms[moduleKey] ?? {
    canView: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    dataScope: "own" as const,
  };
}

/**
 * للاستخدام خارج React (في الـ server أو الـ tests)
 * يستخدم الـ Hardcoded defaults فقط
 */
export function getRoleAccess(role: string | null | undefined): RoleAccess {
  return buildDefaultAccess((role ?? null) as AppRole | null, false);
}
