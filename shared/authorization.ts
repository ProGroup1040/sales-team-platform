export const APP_ROLES = [
  "admin",
  "engineer",
  "admin_sales",
  "sales_engineer",
  "tele_sales",
  "site_engineer",
  "system_user",
  "sales_specialist",
  "interior_designer",
  "manager",
  "group_admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const SALES_ROLES = [
  "sales_engineer",
  "engineer",
  "sales_specialist",
] as const satisfies readonly AppRole[];

export const MANAGER_ROLES = [
  "manager",
  "admin",
  "system_user",
] as const satisfies readonly AppRole[];

/** Roles allowed to administer internal user accounts. */
export const USER_MANAGEMENT_ROLES = [
  "manager",
  "admin_sales",
  "admin",
] as const satisfies readonly AppRole[];

/** Only these roles may create or promote an account to manager. */
export const PRIVILEGED_ROLE_MANAGEMENT_ROLES = [
  "manager",
  "admin",
] as const satisfies readonly AppRole[];

export function canManageUsers(role: string | null | undefined): boolean {
  return Boolean(
    role && (USER_MANAGEMENT_ROLES as readonly string[]).includes(role)
  );
}

export function canManagePrivilegedRoles(
  role: string | null | undefined
): boolean {
  return Boolean(
    role &&
      (PRIVILEGED_ROLE_MANAGEMENT_ROLES as readonly string[]).includes(role)
  );
}

const MANAGED_USER_ROLES = [
  "sales_engineer",
  "sales_specialist",
  "admin_sales",
  "manager",
  "admin",
] as const;

export function canAssignUserRole(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean {
  if (!canManageUsers(actorRole) || !targetRole) return false;
  if (!(MANAGED_USER_ROLES as readonly string[]).includes(targetRole))
    return false;
  if (["manager", "admin"].includes(targetRole)) {
    return canManagePrivilegedRoles(actorRole);
  }
  return true;
}

export const SYSTEM_MODULES = [
  { key: "overview", label: "نظرة عامة" },
  { key: "tasks", label: "المهام اليومية" },
  { key: "crm", label: "العملاء المحتملون" },
  { key: "visits", label: "المعاينات" },
  { key: "closing", label: "الإغلاق والتفاوض" },
  { key: "sales", label: "المبيعات" },
  { key: "kpi", label: "مؤشرات الأداء" },
  { key: "collections", label: "التحصيل المالي" },
  { key: "planning", label: "تخطيط الأهداف" },
  { key: "reports", label: "التقارير" },
  { key: "sales_execution", label: "تنفيذ المبيعات" },
  { key: "promotion", label: "التقييم والترقية" },
  { key: "users", label: "إدارة المستخدمين" },
  { key: "permissions", label: "لوحة الصلاحيات" },
] as const;

export const SYSTEM_ROLES = [
  { key: "manager", label: "مدير / CEO" },
  { key: "admin_sales", label: "Admin Sales" },
  { key: "sales_engineer", label: "مهندس مبيعات" },
  { key: "sales_specialist", label: "أخصائي مبيعات" },
] as const;

export type SystemModuleKey = (typeof SYSTEM_MODULES)[number]["key"];
export type SystemRoleKey = (typeof SYSTEM_ROLES)[number]["key"];

export function isManagerRole(role: string | null | undefined): boolean {
  return Boolean(role && (MANAGER_ROLES as readonly string[]).includes(role));
}

export function isSalesRole(role: string | null | undefined): boolean {
  return Boolean(role && (SALES_ROLES as readonly string[]).includes(role));
}
